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
        storefrontToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjaWQiOlsxXSwiY29ycyI6WyJodHRwczovL2xpbmVhZ2Vjb2xsZWN0aW9uc3dlYnNpdGUuZ2FicmllbGxhLTUyNC53b3JrZXJzLmRldiIsImh0dHA6Ly8xMjcuMC4wLjE6NTUwMCJdLCJlYXQiOjE4OTM0NTYwMDAsImlhdCI6MTc5MjQyODY5NywiaXNzIjoiQkMiLCJqdGkiOiI3OWQxZDJjNi0zY2U2LTRmYjItOTRlMC1hYWMxZTVhZmExOWIiLCJzaWQiOjEwMDM0NjAyODQsInN1YiI6ImI3Nnd2aHRvN2NpNGFxMHY4NnZiNzJxMWV1aXM1aWYiLCJzdWJfdHlwZSI6MiwidG9rZW5fdHlwZSI6MX0.5AS_nDNwqV_ZqwXv5Z8RqdvMjote59t-ySGa0nE3iqHGMJem2aq4OH7BfBK-f3OF1vmOibQ-7hoUFYZnBZ1FkQ',

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
  // Straight-on photos for the bedroom page's studio ("Build your bedroom"), by SKU, for products
  // whose BigCommerce gallery has no front view. A transparent PNG of just the piece.
  frontPhotos: {
    'B622QBED-STORAGE-DRIFTWOOD': 'assets/images/cape-may-storage-bed-front.png' // Cape May Storage Bed, made up
  },

  // Room photos for the living room page's collections strip (living-room.html), one per
  // collection, from the products' BigCommerce galleries. A collection not listed here gets the
  // most room-like photo its galleries have, picked automatically.
  livingPhotos: {
    'Manhattan Valley': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/144/2291/ManhattanValleyCocktail_CoffeeTable-SKU_FL-B97503-LIGHT-LivingRoomAndFamilyRoomCoffeeTablesCottageScene2__99062.1791983766.jpg',
    'Point Breeze': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/147/2267/PointBreezeRectangularCocktail_CoffeeTablew_MetalandCastors-SKU_FL-B65003-DWHITE-LivingRoomAndFamilyRoomCoffeeTablesCoastal1__36667.1791983737.jpg',
    'Miramar': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/184/2010/MiramarConsoleand3Lifestyle__79239.1791983437.jpg',
    'Islamorada': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/371/505/islamorada-90_e131b0c8-4383-4031-b6c7-5bd34c115d71__27922.1791981744.jpg',
    'Picket Fence': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/349/697/B78204-DBLEU-WH-2__80914.1791981922.jpg',
    'Geneva': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/176/2067/Geneva2-DrawerCocktail_CoffeeTablew_Castors-SKU_B90003-DWHITE-LivingRoomAndFamilyRoomCoffeeTablesCoastal2__43626.1791983501.jpg',
    'Surfside': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/283/1238/ScreenShot2024-05-21at12.54.18PM__97670.1791982507.png',
    'Captiva Island': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/344/788/B86303-BSAND-WW-3__97072.1791982014.jpg',
    'Monaco': 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/900w/products/353/645/Monaco-38__46170.1791981872.jpg'
  },

  // "Shop the room" on the living room page: real room photos with a hotspot on each piece.
  // x / y: where the piece is in the photo, in % of its width and height. match: words in the
  // product's name (within that collection); sku: part of the SKU when two products share a name.
  livingRooms: [
    {
      collection: 'Islamorada',
      image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/371/505/islamorada-90_e131b0c8-4383-4031-b6c7-5bd34c115d71__27922.1791981744.jpg',
      spots: [
        { match: 'Coffee Table', x: 72, y: 62 },
        { match: 'Chairside Table', x: 24.5, y: 58 },
        { match: 'End Table', x: 88.5, y: 50 }
      ]
    },
    {
      collection: 'Monaco',
      image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/353/645/Monaco-38__46170.1791981872.jpg',
      spots: [
        { match: 'Oval Coffee Table', x: 67, y: 60 },
        { match: 'Chairside Table', x: 21, y: 62 },
        { match: 'Round End Table', x: 66.5, y: 38 }
      ]
    },
    {
      collection: 'Geneva',
      image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/176/2067/Geneva2-DrawerCocktail_CoffeeTablew_Castors-SKU_B90003-DWHITE-LivingRoomAndFamilyRoomCoffeeTablesCoastal2__43626.1791983501.jpg',
      spots: [
        { match: 'Coffee Table', x: 52, y: 60 },
        { match: 'Console', x: 68, y: 38 }
      ]
    },
    {
      collection: 'Manhattan Valley',
      image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/144/2291/ManhattanValleyCocktail_CoffeeTable-SKU_FL-B97503-LIGHT-LivingRoomAndFamilyRoomCoffeeTablesCottageScene2__99062.1791983766.jpg',
      spots: [
        { match: 'Coffee Table', sku: 'LIGHT', x: 49, y: 58 }
      ]
    }
  ],

  // Lighting page (lighting.html). heroLamps: lamps photographed lit on black, lined up in the
  // hero (by SKU, left to right). afterDark: evening room photos, each with the lamp in it.
  lightingPage: {
    heroLamps: [
      { sku: 'LUX-FL-160-RATTAN', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/115/379/4-3__33953.1774040005.png' },
      { sku: 'LUX-156-SANDSTONE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/112/376/17__73666.1774040004.png' },
      { sku: 'LUX-162-MARBLE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/114/378/9__40264.1774040005.png' },
      { sku: 'LUX-122-BLUE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/118/382/1-7__68742.1774040007.png' },
      { sku: 'LUX-175-SHELL', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/116/380/1-8__39906.1774040006.png' },
      { sku: 'LUX-159-SLATE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/113/377/11__96530.1774040004.png' },
      { sku: 'LUX-FL-164-DRIFTWOOD', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/117/381/2-10__48540.1774040007.png' }
    ],
    closingLamp: { sku: 'LUX-110-BLUE/WHITE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/308/387/Untitled-900-x-1100-px-4__93466.1774040039.png' },
    afterDark: [
      { sku: 'LUX-166-CARMEL', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/121/2450/TranquilTableLamp_Setof2_-SKU_LUX-166-CARMEL-CustomInspire2__95930.1791983982.jpg' },
      { sku: 'LUX-FL-142-BLACK', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/267/1386/ZenithFloorLamp_1Pack_-SKU_LUX-FL-142-BLACK-CustomInspire3__76385.1791982661.jpg' },
      { sku: 'LUX-2048-BLUE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/302/1084/MarlinTableLamp_Setof2_-SKU_LUX-2048-BLUE-CustomInspire2__08743.1791982323.jpg' },
      { sku: 'LUX-FL-1752-WHITE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/294/1157/FloorShutterFloorLamp-LUX-FL-1752-WHITE-CustomInspire1__66218.1791982401.jpg' },
      { sku: 'LUX-155-BLACK-NLITE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/273/1298/GlowTableLamp-NightLight_Setof2_-SKU_LUX-155-BLACK-NLITE-CustomInspire3__88695.1791982574.jpg' },
      { sku: 'LUX-C02-WHITE-USB', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1400w/products/209/1871/CyrusTableLamp_Setof2_-SKU_LUX-C02-WHITE-USB-CustomInspire2__50354.1791983262.jpg' }
    ]
  },

  // Storage page (storage.html). pieces: a closed and an open photo of each piece, from its
  // BigCommerce gallery; hover a card and its doors open. rooms: where the pieces live.
  storagePage: {
    pieces: [
      { sku: 'FL-D65015-FRESHWHITE', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/152/2224/ScreenShot2025-09-16at12.03.00PM__66027.1791983686.png', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/152/2225/ScreenShot2025-09-16at12.03.15PM__47582.1791983687.png' },
      { sku: 'B23315-DAPGREY', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/330/949/b23315-dapgrey__13776.1791982179.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/330/953/b23315-dapgrey-3__46618.1791982183.jpg' },
      { sku: 'D90015-DWHITE', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/178/2047/D90015-DWHITE_1_78ba4d75-d2be-49a7-82f4-d157ce480a16__11032.1791983478.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/178/2048/D90015-DWHITE_2__59548.1791983479.jpg' },
      { sku: 'FL-D97515-LIGHT', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/161/2157/FL-D97515-LIGHT_1__75576.1791983605.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/161/2158/FL-D97515-LIGHT_2_a6048227-5521-4ed0-81e5-45c315763053__14391.1791983606.jpg' },
      { sku: 'B54015-WHITE', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/190/1984/B54015-WHITE_1__01255.1791983402.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/190/1985/B54015-WHITE_2__51507.1791983403.jpg' },
      { sku: 'B98814-WHITE', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/189/1991/ScreenShot2025-09-15at10.33.26AM__17664.1791983410.png', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/189/1992/ScreenShot2025-09-15at10.33.39AM__02536.1791983411.png' },
      { sku: 'B32015-GREY', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/287/1206/ScreenShot2025-02-22at6.03.14PM__82365.1791982451.png', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/287/1212/ScreenShot2025-02-22at6.03.46PM__43730.1791982462.png' },
      { sku: 'B60115-SDW', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/329/964/b60115-sdw-2__74395.1791982194.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/329/965/b60115-sdw-3__22294.1791982195.jpg' },
      { sku: 'FL-D97515-VINTAGECHESTNUT', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/219/1776/ScreenShot2025-02-08at2.02.59PM__36281.1791983147.png', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/219/1781/ScreenShot2025-02-08at2.03.36PM__93152.1791983153.png' },
      { sku: 'B86322-BSAND/WW', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/342/814/b86322-bsand__62040.1791982042.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/342/821/b86322-bsand-4__67565.1791982050.jpg' },
      { sku: 'B81822-BLANC', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/352/651/b81822-blanc__90920.1791981879.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/352/655/b81822-blanc-4__78954.1791981883.jpg' },
      { sku: 'B23327-DAPGREY', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/369/518/b23327-dapgrey-2__72758.1791981757.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/369/519/b23327-dapgrey-3__07722.1791981757.jpg' },
      { sku: 'B86327-BSAND/WW', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/341/830/b86327-bsand__24175.1791982060.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/341/834/b86327-bsand-2__53195.1791982065.jpg' },
      { sku: 'FL-D97516-VINTAGECHESTNUT', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/220/1767/ScreenShot2025-02-08at1.55.30PM__86041.1791983136.png', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/220/1771/ScreenShot2025-02-08at1.55.54PM__70909.1791983141.png' },
      { sku: 'D77716-SAND', closed: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/167/2126/D77716-SAND_1__31219.1791983569.jpg', open: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/167/2129/D77716-SAND_3__76781.1791983572.jpg' }
    ],
    rooms: [
      { sku: 'FL-D98715-OAK/WNUT', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/131/2374/FL-D98715-OAKWNUT_4__63259.1791983882.png', title: 'In the dining room', text: 'A credenza for the good plates, the table linen and the candles.' },
      { sku: 'FL-D65015-FRESHWHITE', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/152/2231/PointBreezeCredenzaw_MetalandSilverTray-SKU_FL-D65015-FRESHWHITE-LivingRoomAndFamilyRoomConsoleTablesAlongWallCoastal3_f78d553c-254c-4ff5-b695-f2c7f0c3a1c1__54314.1791983695.jpg', title: 'In the living room', text: 'Doors that close on the remotes, games and everything else.' },
      { sku: 'D77715-SAND', image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/168/2122/LifestyleDining16_fae18753-406c-44a2-8acc-60803350e574__80985.1791983564.jpg', title: 'By the front door', text: 'Baskets for keys, mail and the dog lead, where you need them.' }
    ]
  },

  // Office page (office.html): working from home. hero: the same Miramar console as a desk and in
  // the living room. desk: photos of the Islamorada desk & chair, one per step. consoles: consoles
  // with built-in power, with a room photo of each (and a second shown on hover). lamps: USB lamps.
  officePage: {
    hero: {
      work: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/130/2379/LifestyleOccasional3__30215.1791983889.jpg',
      home: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/184/2010/MiramarConsoleand3Lifestyle__79239.1791983437.jpg',
      sku: 'B77704-SAND'
    },
    desk: {
      sku: 'B23374-DAPGREY',
      steps: [
        { image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/374/455/b23374-dapgrey__56610.1791981697.jpg', title: 'A desk and chair, together', text: 'The Islamorada desk comes with its chair: shutter panels, a weathered grey top and a cushioned seat.' },
        { image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/374/462/b23374-dapgrey-8__26955.1791981703.jpg', title: 'Drawers that do the filing', text: 'A pull-out file drawer and a deep side drawer keep papers and chargers out of sight.' },
        { image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/374/466/b23374-dapgrey-12__03337.1791981706.jpg', title: 'A chair you can sit in all day', text: 'A slatted back and an upholstered seat, finished to match the desk.' },
        { image: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/374/473/ScreenShot2025-03-16at7.15.42PM__46903.1791981713.png', title: 'Fits a corner, or a whole room', text: 'Compact enough for a spare corner, with room for a laptop, a lamp and a notebook.' }
      ]
    },
    consoles: [
      { sku: 'B77704-SAND', work: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/130/2379/LifestyleOccasional3__30215.1791983889.jpg', home: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/184/2010/MiramarConsoleand3Lifestyle__79239.1791983437.jpg' },
      { sku: 'B23304-DAPGREY', work: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/129/2385/B23304-DAPGREY_22__73294.1791983896.jpg', home: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/188/1997/IslamoradaConsoleand3Lifestyle__52785.1791983418.jpg' },
      { sku: 'B27704-WW', work: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1000w/products/186/2004/SurfsideConsoleand3Lifestyle__00604.1791983428.jpg' }
    ],
    lamps: ['LUX-3925-WHITE-USB', 'LUX-3923-WHITE-USB', 'LUX-C02-WHITE-USB', 'LUX-141-WHITE-USB', 'LUX-52205-NAT-USB']
  },

  // Room landing pages. The Bedroom menu tab opens `page`; when the shop shows that room
  // (shop.html?room=bedroom&type=Beds …) it uses `banner` and the room's look.
  roomPages: {
    bedroom: { page: 'bedroom.html', banner: 'assets/images/showroom.jpg' },
    dining: { page: 'dining-room.html', banner: 'assets/images/dining-banner.jpg' },
    living: { page: 'living-room.html', banner: 'assets/images/hero-living-room.jpg' },
    lighting: { page: 'lighting.html', banner: 'assets/images/brand-lux-lighting.jpg' },
    storage: { page: 'storage.html', banner: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/152/2231/PointBreezeCredenzaw_MetalandSilverTray-SKU_FL-D65015-FRESHWHITE-LivingRoomAndFamilyRoomConsoleTablesAlongWallCoastal3_f78d553c-254c-4ff5-b695-f2c7f0c3a1c1__54314.1791983695.jpg' },
    office: { page: 'office.html', banner: 'https://cdn11.bigcommerce.com/s-ybkui2vf1q/images/stencil/1600w/products/130/2379/LifestyleOccasional3__30215.1791983889.jpg' }
  },

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
    { title: 'Bedroom', url: 'bedroom.html', keywords: 'bedroom beds nightstands dressers chests' },
    { title: 'Dining Room', url: 'dining-room.html', keywords: 'dining tables chairs' },
    { title: 'Living Room', url: 'living-room.html', keywords: 'living room sofas coffee tables' },
    { title: 'Lighting', url: 'lighting.html', keywords: 'lighting lamps table lamps' },
    { title: 'Storage', url: 'storage.html', keywords: 'storage cabinets credenzas' },
    { title: 'Office', url: 'office.html', keywords: 'office desks' },
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
