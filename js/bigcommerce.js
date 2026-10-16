/*
 * BigCommerce GraphQL Storefront API client.
 *
 * Uses the Storefront API token in js/data.js (bigcommerce.storefrontToken). That token is
 * read-only (catalog + carts), and BigCommerce only accepts it from the origins it was
 * created for, so it is safe to ship in the browser. Never put an admin API token here.
 *
 * Every function resolves to products in the site's own shape:
 *   { sku, name, brand, price, currency, url, image, entityId }
 */
window.LineageBC = (function () {
  'use strict';

  const config = (window.LINEAGE_DATA && window.LINEAGE_DATA.bigcommerce) || {};
  const ENDPOINT = config.graphqlUrl || (config.storeHash ? `https://store-${config.storeHash}.mybigcommerce.com/graphql` : '');
  const enabled = Boolean(ENDPOINT && config.storefrontToken);

  const PRODUCT_FIELDS = `
    entityId
    sku
    name
    path
    brand { name }
    prices { price { value currencyCode } }
    defaultImage { url(width: 640) altText }
    inventory { isInStock }
  `;

  async function query(gql, variables = {}) {
    if (!enabled) throw new Error('BigCommerce is not configured');
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.storefrontToken}` },
      body: JSON.stringify({ query: gql, variables })
    });
    if (!res.ok) throw new Error(`BigCommerce ${res.status}`);
    const json = await res.json();
    if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  // Photos we already have on the site, used when a BigCommerce product has no image yet.
  const localImages = {};
  ((window.LINEAGE_DATA && window.LINEAGE_DATA.newIntros) || []).forEach((p) => {
    if (p.sku && p.image) localImages[p.sku] = p.image;
  });

  function toProduct(node) {
    if (!node) return null;
    const price = node.prices && node.prices.price;
    return {
      entityId: node.entityId,
      sku: node.sku,
      name: node.name,
      brand: node.brand ? node.brand.name : null,
      price: price ? price.value : null,
      currency: price ? price.currencyCode : 'USD',
      url: `product.html?sku=${encodeURIComponent(node.sku)}`,
      image: node.defaultImage ? node.defaultImage.url : localImages[node.sku] || null,
      inStock: node.inventory ? node.inventory.isInStock : true
    };
  }

  // Look up products by SKU, keeping the order given. SKUs not in BigCommerce are skipped.
  async function productsBySku(skus) {
    const list = (skus || []).filter(Boolean);
    if (!list.length) return [];
    const fields = list.map((sku, i) => `p${i}: product(sku: ${JSON.stringify(sku)}) { ${PRODUCT_FIELDS} }`).join('\n');
    const data = await query(`query ProductsBySku { site { ${fields} } }`);
    return list.map((_, i) => toProduct(data.site[`p${i}`])).filter(Boolean);
  }

  async function searchProducts(term, first = 24) {
    const data = await query(`
      query Search($term: String!, $first: Int!) {
        site {
          search {
            searchProducts(filters: { searchTerm: $term }) {
              products(first: $first) {
                collectionInfo { totalItems }
                edges { node { ${PRODUCT_FIELDS} } }
              }
            }
          }
        }
      }`, { term, first });
    const products = data.site.search.searchProducts.products;
    return {
      total: products.collectionInfo ? products.collectionInfo.totalItems : products.edges.length,
      products: products.edges.map((e) => toProduct(e.node))
    };
  }

  // The whole visible catalog. BigCommerce returns 50 products per request and each request
  // needs the previous one's cursor, so a full load takes a few seconds. To keep pages fast:
  //   - the catalog is remembered in this browser (localStorage) for up to a day,
  //   - a remembered copy is shown instantly and refreshed in the background after 10 minutes,
  //   - on a first visit, onProgress() gets each batch as it arrives so pages can render early.
  const CATALOG_KEY = 'lineage_bc_catalog_v3';
  const FRESH_FOR = 10 * 60 * 1000;
  const KEEP_FOR = 24 * 60 * 60 * 1000;
  let inFlight = null;

  function readCatalog() {
    try {
      const cached = JSON.parse(localStorage.getItem(CATALOG_KEY));
      if (cached && Array.isArray(cached.products) && Date.now() - cached.at < KEEP_FOR) return cached;
    } catch (e) { /* no cache */ }
    return null;
  }

  function fetchCatalog(onProgress) {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const products = [];
      let after = null;
      for (let page = 0; page < 40; page++) {
        const data = await query(`
          query Catalog($after: String) {
            site {
              products(first: 50, after: $after) {
                pageInfo { hasNextPage endCursor }
                edges { node { ${PRODUCT_FIELDS} createdAt { utc } } }
              }
            }
          }`, { after });
        const conn = data.site.products;
        conn.edges.forEach((e) => {
          const product = toProduct(e.node);
          product.createdAt = e.node.createdAt ? e.node.createdAt.utc : null;
          products.push(product);
        });
        if (!conn.pageInfo.hasNextPage) break;
        if (onProgress) onProgress(products.slice());
        after = conn.pageInfo.endCursor;
      }
      try { localStorage.setItem(CATALOG_KEY, JSON.stringify({ at: Date.now(), products })); } catch (e) { /* storage full */ }
      return products;
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  // options.onProgress(list): partial catalog while a first load is still coming in.
  // options.onUpdate(list):   a fresher catalog after a remembered copy was shown.
  async function allProducts(options = {}) {
    const cached = readCatalog();
    if (cached) {
      if (Date.now() - cached.at > FRESH_FOR) {
        fetchCatalog()
          .then((fresh) => {
            if (options.onUpdate && JSON.stringify(fresh) !== JSON.stringify(cached.products)) options.onUpdate(fresh);
          })
          .catch(() => { /* keep the remembered copy */ });
      }
      return cached.products;
    }
    return fetchCatalog(options.onProgress);
  }

  // Warm the catalog in the background (called on idle from every page) so the shop opens instantly.
  function prefetchCatalog() {
    const cached = readCatalog();
    if (!cached || Date.now() - cached.at > FRESH_FOR) fetchCatalog().catch(() => { /* try again later */ });
  }

  // Everything the product page shows. Fields BigCommerce doesn't have yet come back empty,
  // and the page hides those sections until they're filled in.
  async function productDetail(sku) {
    const data = await query(`
      query ProductDetail($sku: String!) {
        site {
          product(sku: $sku) {
            ${PRODUCT_FIELDS}
            description
            plainTextDescription(characterLimit: 300)
            warranty
            prices { retailPrice { value } salePrice { value } }
            weight { value unit }
            width { value unit }
            height { value unit }
            depth { value unit }
            images(first: 12) { edges { node { url(width: 1400) thumb: url(width: 200) altText isDefault } } }
            customFields(first: 20) { edges { node { name value } } }
            relatedProducts(first: 8) { edges { node { ${PRODUCT_FIELDS} } } }
          }
        }
      }`, { sku });
    const node = data.site.product;
    if (!node) return null;
    const product = toProduct(node);
    const dim = (d) => (d ? `${d.value} ${d.unit}` : null);
    product.description = (node.description || '').trim();
    product.summary = (node.plainTextDescription || '').trim();
    product.warranty = (node.warranty || '').trim();
    product.retailPrice = node.prices.retailPrice ? node.prices.retailPrice.value : null;
    product.salePrice = node.prices.salePrice ? node.prices.salePrice.value : null;
    product.dimensions = [
      ['Width', dim(node.width)], ['Depth', dim(node.depth)], ['Height', dim(node.height)], ['Weight', dim(node.weight)]
    ].filter(([, v]) => v);
    product.images = node.images.edges.map((e) => ({ url: e.node.url, thumb: e.node.thumb, alt: e.node.altText || '' }));
    if (!product.images.length && product.image) product.images = [{ url: product.image, thumb: product.image, alt: '' }];
    product.specs = node.customFields.edges.map((e) => [e.node.name, e.node.value]);
    product.related = node.relatedProducts.edges.map((e) => toProduct(e.node));
    return product;
  }

  return { enabled, query, productsBySku, searchProducts, allProducts, prefetchCatalog, productDetail };
})();
