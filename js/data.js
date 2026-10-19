/*
 * Static catalog data for the homepage.
 *
 * This file stands in for the commerce backend. When the site goes headless,
 * replace these arrays with calls to the BigCommerce or Shopify Storefront API
 * and keep the same shape so js/main.js renders without changes.
 *
 * Prices are placeholders until they are pulled from the commerce platform.
 */
window.LINEAGE_DATA = {
  // BigCommerce store (GraphQL Storefront API). The storefront token is read-only and only
  // works from the origins it was created for (currently Live Server: http://127.0.0.1:5500).
  // Create a new token for the live domain before launch. Never put an admin API token here.
  bigcommerce: {
    storeHash: 'ybkui2vf1q',
    storefrontToken: '8wrpkiby0gpc1g2uiwaggdokdsdg36k'
  },

  // New Intros = products with Acctivate's "NewProductIntroUnavail" box checked.
  // newIntrosUrl: an endpoint returning those SKUs (["SKU", ...] or { skus: [...] }), to be added
  // to the portal backend. Until then the homepage uses newIntroSkus below. Details (name, photo,
  // price) always come live from BigCommerce; the newIntros list further down is only a fallback.
  newIntrosUrl: '',
  newIntroSkus: ['B23332-DAPGREY', 'B23334-DAPGREY', 'B23335-DAPGREY', 'B233QBED-DAPGREY'],

  // Dealer portal (embedded on dealer-portal.html). Cart "Request a Quote" hands items to it.
  portal: {
    origin: 'https://lineage-collections-portal.com'
  },

  // Dealer application form posts here (multipart, with files) once a backend exists.
  dealerApplicationUrl: '',

  // Contact form endpoint (e.g. a Formspree URL). Leave empty to open the visitor's email app instead.
  contactFormUrl: '',

  collections: [
    {
      name: 'Islamorada Collection',
      brand: 'Finn & Louise',
      url: '/collections/islamorada',
      image: 'assets/images/collection-islamorada.jpg',
      alt: 'Islamorada bedroom with shutter-panel headboard and nightstands',
      hotspots: [
        { x: 50, y: 58, label: 'Islamorada Panel Bed', url: '/products/islamorada-panel-bed' },
        { x: 17, y: 62, label: 'Islamorada 1-Drawer / 2-Door Nightstand', url: '/products/islamorada-1-drawer-2-door' },
        { x: 52, y: 80, label: 'Islamorada Bench', url: '/products/islamorada-bench' }
      ]
    },
    {
      name: 'Geneva Collection',
      brand: 'Seawinds',
      url: '/collections/geneva',
      image: 'assets/images/collection-geneva.jpg',
      alt: 'Geneva bedroom styled with layered bedding',
      hotspots: [
        { x: 40, y: 60, label: 'Geneva Bed', url: '/products/geneva-bed' }
      ]
    },
    {
      name: 'Point Breeze Collection',
      brand: 'Finn & Louise',
      url: '/collections/point-breeze',
      image: 'assets/images/collection-point-breeze.jpg',
      alt: 'Point Breeze storage bed with drawers open',
      hotspots: [
        { x: 60, y: 55, label: 'Point Breeze Storage Bed', url: '/products/point-breeze-storage-bed' }
      ]
    },
    {
      name: 'Manhattan Valley Collection',
      brand: 'Finn & Louise',
      url: '/collections/manhattan-valley',
      image: 'assets/images/collection-manhattan-valley.jpg',
      alt: 'Manhattan Valley bedroom with walnut-toned bed',
      hotspots: [
        { x: 45, y: 70, label: 'Manhattan Valley Bed', url: '/products/manhattan-valley-bed' }
      ]
    }
  ],

  newIntros: [
    {
      sku: 'B23332-DAPGREY',
      collection: 'Islamorada',
      category: 'Bedroom',
      name: 'Islamorada 1-Drawer / 2-Door Electrified Coastal Nightstand',
      price: 1186.00,
      currency: 'USD',
      url: 'product.html?sku=B23332-DAPGREY',
      image: 'assets/images/product-islamorada-1-drawer-2-door.jpg'
    },
    {
      sku: 'B23334-DAPGREY',
      collection: 'Islamorada',
      category: 'Bedroom',
      name: 'Islamorada 4 Drawer Chest / Single Chest',
      price: 1532.00,
      currency: 'USD',
      url: 'product.html?sku=B23334-DAPGREY',
      image: 'assets/images/product-islamorada-4-drawer-chest.jpg'
    },
    {
      sku: 'B23335-DAPGREY',
      collection: 'Islamorada',
      category: 'Bedroom',
      name: 'Islamorada 5 Drawer Chest',
      price: 1756.00,
      currency: 'USD',
      url: 'product.html?sku=B23335-DAPGREY',
      image: 'assets/images/product-islamorada-5-drawer-chest.jpg'
    },
    {
      sku: 'B23356-DAPGREY',
      collection: 'Islamorada',
      category: 'Bedroom',
      name: 'Islamorada Queen Cabinet Bed',
      price: 2012.00,
      currency: 'USD',
      url: 'product.html?sku=B23356-DAPGREY',
      image: 'assets/images/product-islamorada-cabinet-bed.jpg'
    }
  ],

  // Collection names, used by the shop to group products (matched against the start of each
  // product name). Add new collections here as they launch.
  collectionNames: [
    'Cape May', 'Captiva Island', 'Chatham', 'Geneva', 'Islamorada', 'Island Breeze',
    'Manhattan Valley', 'Maui', 'Miramar', 'Monaco', 'Monterey', 'Ocean Isles', 'Picket Fence',
    'Point Breeze', 'Port Royale', 'Santa Cruz', 'Santorini', 'Sun Haven', 'Surfside', 'Tahiti',
    'Venice', 'Wooden Weave'
  ],

  // Banner shown when the shop is filtered to one collection (shop.html?collection=Islamorada).
  // Keys match collectionNames above. Collections not listed here keep the main shop photo,
  // so add one whenever a new lifestyle photo is ready. `text` is optional: without it the banner
  // shows "By <brand> · <n> pieces".
  collectionBanners: {
    'Islamorada':       { image: 'assets/images/collection-islamorada.jpg',       brand: 'Finn & Louise' },
    'Geneva':           { image: 'assets/images/collection-geneva.jpg',           brand: 'Seawinds' },
    'Point Breeze':     { image: 'assets/images/collection-point-breeze.jpg',     brand: 'Finn & Louise' },
    'Manhattan Valley': { image: 'assets/images/collection-manhattan-valley.jpg', brand: 'Finn & Louise' }
  },

  // Room photos for collections on the brand pages (brand-*.html), on top of collectionBanners
  // above. Collections without a photo show their best product photo instead.
  collectionPhotos: {
    'Chatham': 'assets/images/social-2.jpg',
    'Monaco':  'assets/images/social-3.jpg'
  },

  // The "Coming Soon" and "Closeouts" menu tabs. Each is a BigCommerce category, looked up by its
  // URL: add or remove products in that category in BigCommerce and the menu and the shop page
  // (shop.html?list=coming-soon) update on their own. The category must stay visible, and its URL
  // must match `category` here. `image` (optional) replaces the shop banner photo on that page.
  productLists: {
    'coming-soon': {
      title: 'Coming Soon',
      category: '/coming-soon/',
      badge: 'Coming soon',
      intro: 'A first look at new pieces arriving soon.',
      empty: 'New pieces are on their way. Check back soon, or contact us to hear about them first.'
    },
    closeouts: {
      title: 'Closeouts',
      category: '/closeouts/',
      badge: 'Closeout',
      intro: 'Final quantities on discontinued pieces, while they last.',
      empty: 'There are no closeouts right now. Check back soon.'
    }
  },

  // Pages the site search can suggest (alongside products and collections).
  searchPages: [
    { title: 'Contact Us', url: 'contact.html', keywords: 'contact customer service support email phone help' },
    { title: 'Dealer Portal', url: 'dealer-portal.html', keywords: 'dealer login portal sign in account orders quotes' },
    { title: 'Become a Dealer', url: '/dealer-application', keywords: 'apply dealer trade account wholesale' },
    { title: 'Virtual Showroom', url: '/showroom', keywords: 'showroom virtual tour visit' },
    { title: 'Your Cart', url: 'cart.html', keywords: 'cart bag quote basket' },
    { title: 'Coming Soon', url: 'shop.html?list=coming-soon', keywords: 'coming soon new arrivals upcoming preorder pre-order' },
    { title: 'Closeouts', url: 'shop.html?list=closeouts', keywords: 'closeouts closeout clearance discontinued sale final' },
    { title: 'Shop All', url: 'shop.html', keywords: 'shop all products furniture catalog browse' },
    { title: 'Our Brands', url: 'brands.html', keywords: 'brands sea winds seawinds finn louise lux lighting' },
    { title: 'Sea Winds', url: 'brand-sea-winds.html', keywords: 'sea winds seawinds brand coastal furniture' },
    { title: 'Finn & Louise', url: 'brand-finn-louise.html', keywords: 'finn louise brand bedroom dining' },
    { title: 'Lux Lighting', url: 'brand-lux-lighting.html', keywords: 'lux lighting brand lamps table floor' },
    { title: 'Bedroom', url: 'shop.html?room=bedroom', keywords: 'bedroom beds nightstands dressers chests' },
    { title: 'Dining Room', url: 'shop.html?room=dining', keywords: 'dining tables chairs' },
    { title: 'Living Room', url: 'shop.html?room=living', keywords: 'living room sofas coffee tables' },
    { title: 'Lighting', url: 'shop.html?room=lighting', keywords: 'lighting lamps table lamps' },
    { title: 'Storage', url: 'shop.html?room=storage', keywords: 'storage cabinets credenzas' },
    { title: 'Office', url: 'shop.html?room=office', keywords: 'office desks' },
    { title: 'Become a Dealer', url: 'dealer-application.html', keywords: 'dealer trade account apply application wholesale credit net 30 resale tax certificate' }
  ],

  // Live Instagram feed: paste the deployed Worker URL (workers/instagram-feed)
  // or a Behold JSON feed URL. Leave empty to show only the saved photos below.
  instagramFeedUrl: '',
  instagramPostCount: 4, // keep a multiple of the grid's column count

  // Saved photos, shown until the live feed loads (or if it's unavailable)
  social: [
    { image: 'assets/images/social-1.jpg', alt: 'Islamorada bedroom' },
    { image: 'assets/images/social-2.jpg', alt: 'Chatham bedroom' },
    { image: 'assets/images/social-3.jpg', alt: 'Monaco living room' },
    { image: 'assets/images/social-4.jpg', alt: 'Point Breeze bedroom' },
    { image: 'assets/images/social-5.jpg', alt: 'Islamorada living room' },
    { image: 'assets/images/social-6.jpg', alt: 'Manhattan Valley bedroom' }
  ]
};
