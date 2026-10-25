// Shared storefront category tree, loaded before app.js, admin.js and product.js.
// `name` is the stable key saved on products; `label` is what shoppers see. Keep existing names unchanged.
// `featured` categories get an image tile on the home page; the rest still appear in menus and filters. Categories
// without an image_url show a photo from one of their listings, or their `icon` until they have one.
const LYRSHOP_CATEGORIES_VERSION = 4;
const LYRSHOP_CATEGORIES_VERSION_KEY = "lyrshopCategoriesVersion";
const LYRSHOP_IMAGE = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=70`;

const LYRSHOP_DEFAULT_CATEGORIES = [
  {
    name: "Lifestyle",
    label: "Fashion & Apparel",
    featured: true,
    image_url: LYRSHOP_IMAGE("1483985988355-763728e1935b"),
    subcategories: [
      "Women's fashion", "Men's fashion", "Kids' & teens' fashion", "Coats & jackets", "Activewear & athleisure",
      "Lingerie & sleepwear", "Socks & underwear", "Swim & beachwear", "Plus-size fashion", "Modest fashion",
      "Traditional & cultural wear", "Uniforms & workwear", "Hats & caps", "Sunglasses & eyewear",
      "Belts, wallets & small leather", "Scarves, gloves & accessories", "Vintage & pre-loved",
    ],
  },
  {
    name: "Shoes",
    label: "Shoes & Sneakers",
    featured: true,
    image_url: LYRSHOP_IMAGE("1542291026-7eec264c27ff"),
    subcategories: [
      "Sneakers", "Limited-edition sneakers", "Women's shoes", "Men's shoes", "Kids' shoes", "Boots",
      "Sandals & slides", "Heels & dress shoes", "Sports & running shoes", "Work & safety shoes",
      "Slippers & house shoes", "Everyday & casual shoes", "Shoe care & insoles",
    ],
  },
  {
    name: "Travel",
    label: "Bags & Travel",
    featured: false,
    image_url: LYRSHOP_IMAGE("1503220317375-aaad61436b1b"),
    subcategories: [
      "Handbags & purses", "Everyday bags & totes", "Backpacks", "Laptop bags & briefcases", "Duffels & weekenders",
      "Suitcases & luggage sets", "Cabin bags & carry-ons", "Kids' & school bags", "Packing cubes & organizers",
      "Passport & travel wallets", "Plug adapters & converters", "Neck pillows & comfort", "Travel essentials",
    ],
  },
  {
    name: "Jewelry",
    label: "Jewelry & Timepieces",
    featured: true,
    image_url: LYRSHOP_IMAGE("1515562141207-7a88fb7ce338"),
    subcategories: [
      "Designer watches", "Everyday watches", "Trend & costume jewelry", "Gold, silver & diamonds",
      "Engagement & wedding", "Rings & bands", "Necklaces & chains", "Earrings & studs", "Bracelets & bangles",
      "Jewelry for him", "Body jewelry", "Gemstones & crystals", "Watch bands & parts", "Jewelry boxes & care",
    ],
  },
  {
    name: "Phones",
    icon: "📱",
    label: "Phones & Wearables",
    featured: true,
    subcategories: [
      "Smartphones", "Basic & feature phones", "Smartwatches", "Fitness trackers", "Phone cases & covers",
      "Screen protectors", "Chargers & cables", "Power banks", "Phone accessories", "Phone parts & repair",
      "SIM & connectivity",
    ],
  },
  {
    name: "Computers",
    icon: "💻",
    label: "Computers & Accessories",
    featured: true,
    subcategories: [
      "Laptops", "Desktops & all-in-ones", "Tablets & e-readers", "Monitors", "Keyboards & mice",
      "Networking & Wi-Fi", "Storage & memory", "PC components", "Printers, ink & scanners",
      "Computer accessories", "Software",
    ],
  },
  {
    name: "Electronics",
    label: "Tech & Gadgets",
    featured: true,
    image_url: LYRSHOP_IMAGE("1517336714731-489689fd1ca8"),
    subcategories: [
      "Cameras & lenses", "TVs & projectors", "Smart home & security", "Drones & action cams", "VR & AR headsets",
      "Wearable tech", "Batteries & power", "Cables & tech accessories", "Gadgets & gizmos", "3D printers",
      "Electronic components & DIY",
    ],
  },
  {
    name: "Audio",
    label: "Audio & Sound",
    featured: false,
    image_url: LYRSHOP_IMAGE("1545454675-3531b543be5d"),
    subcategories: [
      "Wireless earbuds", "Over-ear headphones", "Bluetooth & smart speakers", "Soundbars", "Hi-fi & home audio",
      "Turntables", "Amps & receivers", "Microphones & podcasting", "Portable & radios", "Pro & PA audio",
      "Car stereo & audio",
    ],
  },
  {
    name: "VideoGames",
    label: "Gaming",
    featured: true,
    image_url: LYRSHOP_IMAGE("1606144042614-b2417e99c4e3"),
    subcategories: [
      "Consoles & handhelds", "Games", "Controllers & accessories", "Headsets & audio", "PC gaming gear",
      "Retro & classic gaming", "Chairs & desks", "Streaming & capture gear", "VR gaming", "Game cards & credits",
    ],
  },
  {
    name: "Home",
    label: "Home & Living",
    featured: true,
    image_url: LYRSHOP_IMAGE("1505693416388-ac5ce068fe85"),
    subcategories: [
      "Furniture", "Decor & wall art", "Rugs & curtains", "Bed & bedding", "Bath & towels", "Lamps & lighting",
      "Candles & home fragrance", "Storage & closet", "Home appliances", "Heating & cooling", "Cleaning & laundry",
      "Hand & power tools", "Repair & renovation", "Plumbing & bathroom fixtures", "Home security",
    ],
  },
  {
    name: "Kitchen",
    icon: "🍳",
    label: "Kitchen & Dining",
    featured: true,
    subcategories: [
      "Cookware & pans", "Bakeware", "Small kitchen appliances", "Coffee & tea makers", "Knives & cutting boards",
      "Kitchen tools & gadgets", "Tableware & dinnerware", "Drinkware & bar", "Food storage",
      "Lunch boxes & bottles",
    ],
  },
  {
    name: "Garden",
    icon: "🌱",
    label: "Garden & Patio",
    featured: false,
    subcategories: [
      "Patio & outdoor living", "Outdoor furniture", "Plants, seeds & bulbs", "Planters & pots",
      "Lawn mowers & garden power tools", "Garden hand tools", "Watering & irrigation", "Grills & outdoor cooking",
      "Outdoor lighting", "Pools & hot tubs", "Pest control", "Greenhouses & sheds",
    ],
  },
  {
    name: "Beauty",
    label: "Beauty & Fragrance",
    featured: true,
    image_url: LYRSHOP_IMAGE("1522335789203-aabd1fc54bc9"),
    subcategories: [
      "Makeup & cosmetics", "Skincare", "Hair care & styling", "Wigs & hair extensions", "Perfume & cologne",
      "Nails & manicure", "Body care & bath", "Men's grooming & shaving", "Beauty tools & devices",
      "K-beauty & J-beauty", "Natural & organic beauty",
    ],
  },
  {
    name: "Health",
    icon: "💊",
    label: "Health & Wellness",
    featured: false,
    subcategories: [
      "Vitamins & supplements", "Sports nutrition", "Medicine cabinet & first aid", "Medical devices & monitors",
      "Oral & dental care", "Eye & ear care", "Massage & relaxation", "Braces & supports", "Mobility & daily living",
      "Feminine care", "Personal care",
    ],
  },
  {
    name: "Baby",
    label: "Baby & Toddler",
    featured: false,
    image_url: LYRSHOP_IMAGE("1515488042361-ee00e0ddd4e4"),
    subcategories: [
      "Strollers & prams", "Baby car seats", "Nursery & cribs", "Bottles & feeding", "Diapers & changing",
      "Baby & toddler clothes", "Carriers & baby gear", "Baby toys & play mats", "Baby bath & skincare",
      "Baby-proofing & monitors", "Maternity", "Baby gifts",
    ],
  },
  {
    name: "Toys",
    label: "Toys, Games & Hobbies",
    featured: true,
    image_url: LYRSHOP_IMAGE("1587654780291-39c9404d746b"),
    subcategories: [
      "Action figures & playsets", "Building blocks & sets", "Dolls & dollhouses", "Plush & soft toys",
      "Board games & jigsaws", "Card games & TCG", "RC cars, planes & robots", "Diecast & toy cars",
      "Scale model kits", "Model railways", "STEM & learning toys", "Outdoor & garden play",
      "Pretend play & costumes", "Fidget & sensory toys", "Magic & novelty",
    ],
  },
  {
    name: "Sports",
    label: "Active & Outdoors",
    featured: true,
    image_url: LYRSHOP_IMAGE("1517649763962-0c623066013b"),
    subcategories: [
      "Home gym & fitness", "Yoga & pilates", "Running & track", "Bikes & cycling", "Camping & trekking",
      "Outdoor adventure", "Fishing & angling", "Hunting gear", "Ball & team sports", "Cricket", "Racket sports",
      "Golf", "Surf, swim & paddle", "Ski & snowboard", "Skate & scooters", "Climbing", "Combat sports",
      "Fan gear & jerseys",
    ],
  },
  {
    name: "Motors",
    label: "Auto & Moto",
    featured: true,
    image_url: LYRSHOP_IMAGE("1492144534655-ae79c964c9d7"),
    subcategories: [
      "Auto parts & accessories", "Engine & body parts", "Tires, rims & wheels", "Oils, fluids & filters",
      "Headlights & LED lighting", "Seat covers & interior", "Racks, covers & exterior", "Car wash & detailing",
      "Dash cams & car electronics", "EV charging & accessories", "Tuning & performance", "Garage & repair tools",
      "Trailers & towing", "Motorbike parts & riding gear", "Cars, trucks & SUVs", "Motorbikes & scooters",
      "ATVs, RVs & other rides", "Marine & boat parts",
    ],
  },
  {
    name: "Energy",
    icon: "☀️",
    label: "Solar & Power",
    featured: false,
    subcategories: [
      "Solar panels & kits", "Portable power stations", "Generators", "Inverters & batteries", "Solar lights",
      "Extension cords & surge protectors",
    ],
  },
  {
    name: "Business",
    icon: "🏭",
    label: "Pro & Industrial",
    featured: false,
    subcategories: [
      "Commercial kitchen", "Shop fittings & POS", "Packaging & mailers", "Safety gear & PPE",
      "Industrial power tools", "Electrical & wiring", "Test & measurement tools", "Medical & lab supplies",
      "Print & signage", "Cleaning & janitorial", "Welding", "Hydraulics & pneumatics", "Heavy machinery & parts",
      "Containers & prefab structures", "Wholesale lots",
    ],
  },
  {
    name: "Office",
    icon: "✏️",
    label: "Office & School",
    featured: false,
    subcategories: [
      "Pens & fine writing", "Notebooks & journals", "Paper & labels", "Desk accessories & organizers",
      "School supplies", "Calculators", "Filing & storage", "Whiteboards & presentation", "Office machines",
      "Office furniture",
    ],
  },
  {
    name: "Farm",
    icon: "🚜",
    label: "Farm & Agriculture",
    featured: false,
    subcategories: [
      "Seeds & seedlings", "Fertilizers & soil", "Irrigation & pumps", "Livestock & poultry supplies", "Beekeeping",
      "Fencing", "Farm tools", "Tractor & farm machinery parts",
    ],
  },
  {
    name: "Grocery",
    icon: "🛒",
    label: "Grocery & Gourmet",
    featured: false,
    subcategories: [
      "Snacks & sweets", "Coffee & tea", "Beverages", "Pantry staples", "Spices & seasonings", "Baking supplies",
      "International foods", "Organic & health foods", "Halal & kosher foods", "Gourmet gift boxes",
    ],
  },
  {
    name: "Pets",
    label: "Pets & Animals",
    featured: true,
    image_url: LYRSHOP_IMAGE("1548199973-03cce0bbc87b"),
    subcategories: [
      "For dogs", "For cats", "Aquariums & fish", "For birds", "Rabbits & small pets", "Reptiles & terrariums",
      "Horse & equestrian", "Pet food & treats", "Pet beds, crates & houses", "Pet toys & enrichment",
      "Pet grooming", "Leashes, collars & harnesses", "Pet health & flea care", "Pet travel & carriers",
      "Pet tech",
    ],
  },
  {
    name: "Stationery",
    label: "Art & Collectibles",
    featured: true,
    image_url: LYRSHOP_IMAGE("1579783902614-a3fb3927b6a5"),
    subcategories: [
      "Original paintings", "Art prints & posters", "Sculpture & 3D art", "Photography & digital art",
      "African & world art", "Paints, brushes & canvas", "Collector's items", "Sports & trading cards",
      "Coins & banknotes", "Stamps & postal history", "Antiques & heirlooms", "Fan memorabilia",
      "Pop culture memorabilia", "Signed items",
    ],
  },
  {
    name: "Crafts",
    label: "Crafts & DIY",
    featured: false,
    image_url: LYRSHOP_IMAGE("1513364776144-60967b0f800f"),
    subcategories: [
      "Sewing & quilting", "Fabric & textiles", "Yarn, knitting & crochet", "Embroidery & cross-stitch",
      "Paper crafts & scrapbooking", "Beads & jewelry making", "Soap, candle & resin making",
      "Woodcraft & carving", "Leathercraft", "Glass, mosaic & pottery", "Cutting machines & vinyl",
      "DIY craft kits",
    ],
  },
  {
    name: "Media",
    label: "Books, Film & Music",
    featured: false,
    image_url: LYRSHOP_IMAGE("1512820790803-83ca734da794"),
    subcategories: [
      "Fiction & nonfiction books", "Children's books", "Textbooks & study guides", "Comics & manga",
      "Religious books", "Rare & signed books", "Magazines & periodicals", "Audiobooks", "Sheet music & songbooks",
      "Movies & series", "Vinyl LPs", "CDs & cassettes",
    ],
  },
  {
    name: "Instruments",
    icon: "🎸",
    label: "Music Gear",
    featured: false,
    subcategories: [
      "Guitars & bass", "Pianos & keyboards", "Drum kits & percussion", "Violins & orchestral strings",
      "Woodwinds & flutes", "Trumpets & brass", "Ukuleles & folk", "Traditional & world instruments",
      "DJ gear & controllers", "Studio & recording", "Instrument amps", "Pedals & effects",
      "Strings, picks & accessories",
    ],
  },
  {
    name: "Party",
    icon: "🎉",
    label: "Party & Gifts",
    featured: false,
    subcategories: [
      "Personalized gifts", "Gift baskets & sets", "Gift wrap & cards", "Party supplies & balloons", "Birthday",
      "Wedding supplies", "Holiday & seasonal decor", "Costumes & dress-up", "Cultural & religious celebrations",
    ],
  },
  {
    name: "Tickets",
    label: "Tickets & Experiences",
    featured: false,
    image_url: LYRSHOP_IMAGE("1493225457124-a3eb161ffa5f"),
    subcategories: [
      "Concerts & festivals", "Sports events", "Theater & shows", "Local events", "Experiences & tours",
      "Classes & workshops", "Gift cards & vouchers",
    ],
  },
  {
    name: "Specialty",
    icon: "✨",
    label: "More to Explore",
    featured: false,
    subcategories: [
      "Handmade & artisan", "Local makers", "Eco-friendly & sustainable", "Faith & spirituality",
      "Bulk & mystery boxes", "Unique finds",
    ],
  },
];

// A browser that saved its own category list (from the admin page) keeps it, but on a version bump it gains
// any new default categories and subcategories once. Later admin deletions then stick.
// Version 4 renamed the built-in labels and subcategories (backend/categories_core.py moves products to match),
// so built-in categories saved before it take the new defaults; categories the admin added are kept.
const LYRSHOP_RENAMED_IN_VERSION = 4;

(function upgradeStoredCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem("lyrshopCategories") || "null");
    const version = Number(localStorage.getItem(LYRSHOP_CATEGORIES_VERSION_KEY) || 1);
    if (!Array.isArray(stored) || version >= LYRSHOP_CATEGORIES_VERSION) return;

    const merged = stored.map((category) => {
      const defaults = LYRSHOP_DEFAULT_CATEGORIES.find((item) => item.name === category.name);
      if (!defaults) return category;
      if (version < LYRSHOP_RENAMED_IN_VERSION) return { ...defaults };
      const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
      return {
        ...defaults,
        ...category,
        subcategories: [...subcategories, ...defaults.subcategories.filter((sub) => !subcategories.includes(sub))],
      };
    });
    LYRSHOP_DEFAULT_CATEGORIES.forEach((category) => {
      if (!merged.some((item) => item.name === category.name)) merged.push(category);
    });
    localStorage.setItem("lyrshopCategories", JSON.stringify(merged));
    localStorage.setItem(LYRSHOP_CATEGORIES_VERSION_KEY, String(LYRSHOP_CATEGORIES_VERSION));
  } catch (error) {
    console.warn("Could not upgrade stored categories.", error);
  }
}());
