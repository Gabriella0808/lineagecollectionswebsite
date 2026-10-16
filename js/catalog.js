/*
 * Lineage Collections — catalog helpers shared by the shop and product pages.
 *
 * BigCommerce has almost no categories or custom fields yet, so each product's room, type and
 * collection are worked out from its name (TYPE_RULES below, collectionNames in js/data.js).
 * When those are set up in BigCommerce, change classify() to read them instead.
 */
window.LineageCatalog = (function () {
  'use strict';

  const data = window.LINEAGE_DATA || {};

  const ROOMS = [
    { slug: 'bedroom', label: 'Bedroom' },
    { slug: 'living', label: 'Living Room' },
    { slug: 'dining', label: 'Dining Room' },
    { slug: 'lighting', label: 'Lighting' },
    { slug: 'storage', label: 'Storage' },
    { slug: 'office', label: 'Office' }
  ];

  // First matching rule wins: [pattern in product name, product type, room slug]
  const TYPE_RULES = [
    [/bundle|complete set/i, 'Bundles & Sets', null],
    [/cabinet bed/i, 'Cabinet Beds', 'bedroom'],
    [/desk/i, 'Desks', 'office'],
    [/headboard/i, 'Headboards', 'bedroom'],
    [/\bbed\b/i, 'Beds', 'bedroom'],
    [/nigh(t)?stand/i, 'Nightstands', 'bedroom'],
    [/dresser/i, 'Dressers', 'bedroom'],
    [/chest/i, 'Chests', 'bedroom'],
    [/mirror/i, 'Mirrors', 'bedroom'],
    [/bench/i, 'Benches', 'bedroom'],
    [/floor lamp/i, 'Floor Lamps', 'lighting'],
    [/lamp|\bluna\b/i, 'Table Lamps', 'lighting'],
    [/stool/i, 'Stools', 'dining'],
    [/dining chair|side chair|x-back/i, 'Dining Chairs', 'dining'],
    [/dining table|round table|drop leaf|trestle/i, 'Dining Tables', 'dining'],
    [/arm chair/i, 'Accent Chairs', 'living'],
    [/coffee table|cocktail/i, 'Coffee Tables', 'living'],
    [/end table|chairside/i, 'End & Side Tables', 'living'],
    [/console/i, 'Consoles', 'living'],
    [/entertainment/i, 'Entertainment Centers', 'living'],
    [/credenza|sideboard/i, 'Credenzas & Sideboards', 'storage'],
    [/curio|entry cabinet/i, 'Cabinets', 'storage'],
    [/insert/i, 'Accessories', null]
  ];

  const COLLECTIONS = (data.collectionNames || []).slice().sort((a, b) => b.length - a.length);
  const roomLabel = (slug) => (ROOMS.find((r) => r.slug === slug) || {}).label;

  function classify(p) {
    const rule = TYPE_RULES.find(([re]) => re.test(p.name));
    let room = rule ? rule[2] : null;
    if (rule && rule[1] === 'Bundles & Sets') {
      room = /bedroom/i.test(p.name) ? 'bedroom' : /dining/i.test(p.name) ? 'dining' : 'living';
    }
    const lower = p.name.toLowerCase();
    const collection = COLLECTIONS.find((c) => lower.startsWith(c.toLowerCase())) || null;
    return {
      ...p,
      type: rule ? rule[1] : 'Other',
      room,
      collection,
      brands: (p.brand || '').split(/\s*,\s*/).filter(Boolean),
      hasImage: Boolean(p.image),
      search: `${p.name} ${p.sku} ${p.brand || ''} ${collection || ''}`.toLowerCase()
    };
  }

  return { ROOMS, TYPE_RULES, classify, roomLabel };
})();
