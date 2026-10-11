// Shared storefront category tree, loaded before app.js, admin.js and product.js.
// `name` is the stable key saved on products; `label` is what shoppers see. Keep existing names unchanged.
// `featured` categories get an image tile on the home page; the rest still appear in menus and filters.
const LYRSHOP_CATEGORIES_VERSION = 2;
const LYRSHOP_CATEGORIES_VERSION_KEY = "lyrshopCategoriesVersion";
const LYRSHOP_IMAGE = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=70`;

const LYRSHOP_DEFAULT_CATEGORIES = [
  {
    name: "Electronics",
    label: "Electronics",
    featured: true,
    image_url: LYRSHOP_IMAGE("1517336714731-489689fd1ca8"),
    subcategories: [
      "Computers & tablets", "Phones", "Cameras", "Accessories", "Laptops", "Monitors", "Networking",
      "Printers & scanners", "TV & home theater", "Smart home", "Wearables & smartwatches", "Drones",
      "Batteries & chargers", "Car electronics", "Virtual reality",
    ],
  },
  {
    name: "Audio",
    label: "Audio",
    featured: true,
    image_url: LYRSHOP_IMAGE("1545454675-3531b543be5d"),
    subcategories: [
      "Headphones", "Speakers", "Microphones", "Home audio", "Earbuds", "Turntables & record players",
      "Amplifiers & receivers", "Portable audio", "Pro audio", "Car audio",
    ],
  },
  {
    name: "Home",
    label: "Home & Garden",
    featured: true,
    image_url: LYRSHOP_IMAGE("1505693416388-ac5ce068fe85"),
    subcategories: [
      "Lighting", "Kitchen", "Furniture", "Garden", "Home décor", "Bedding", "Bath", "Storage & organization",
      "Appliances", "Tools & workshop", "Cleaning supplies", "Outdoor living", "Home improvement",
    ],
  },
  {
    name: "Lifestyle",
    label: "Fashion",
    featured: true,
    image_url: LYRSHOP_IMAGE("1542291026-7eec264c27ff"),
    subcategories: [
      "Bags", "Shoes", "Accessories", "Activewear", "Women's clothing", "Men's clothing", "Kids' clothing",
      "Outerwear", "Swimwear", "Sunglasses", "Hats", "Belts & wallets", "Vintage clothing",
    ],
  },
  {
    name: "VideoGames",
    label: "Video Games & Consoles",
    featured: true,
    image_url: LYRSHOP_IMAGE("1606144042614-b2417e99c4e3"),
    subcategories: [
      "Consoles", "Video games", "Controllers & attachments", "Gaming headsets", "PC gaming", "Retro gaming",
      "Gaming chairs", "Gift & prepaid cards",
    ],
  },
  {
    name: "Jewelry",
    label: "Jewelry & Watches",
    featured: true,
    image_url: LYRSHOP_IMAGE("1515562141207-7a88fb7ce338"),
    subcategories: [
      "Watches", "Fine jewelry", "Fashion jewelry", "Rings", "Necklaces & pendants", "Earrings", "Bracelets",
      "Men's jewelry", "Loose gemstones", "Watch parts & accessories",
    ],
  },
  {
    name: "Beauty",
    label: "Health & Beauty",
    featured: true,
    image_url: LYRSHOP_IMAGE("1522335789203-aabd1fc54bc9"),
    subcategories: [
      "Makeup", "Skin care", "Hair care", "Fragrances", "Nail care", "Bath & body", "Shaving & grooming",
      "Oral care", "Vitamins & supplements", "Health care", "Massage & wellness",
    ],
  },
  {
    name: "Toys",
    label: "Toys & Hobbies",
    featured: true,
    image_url: LYRSHOP_IMAGE("1587654780291-39c9404d746b"),
    subcategories: [
      "Action figures", "Building toys", "Dolls & bears", "Board games & puzzles", "Remote control toys",
      "Model trains", "Model kits", "Diecast & vehicles", "Educational toys", "Outdoor play", "Stuffed animals",
      "Trading card games",
    ],
  },
  {
    name: "Sports",
    label: "Sporting Goods",
    featured: true,
    image_url: LYRSHOP_IMAGE("1517649763962-0c623066013b"),
    subcategories: [
      "Fitness equipment", "Cycling", "Camping & hiking", "Fishing", "Golf", "Team sports", "Water sports",
      "Winter sports", "Tennis & racquet sports", "Running", "Yoga", "Boxing & martial arts", "Hunting",
    ],
  },
  {
    name: "Stationery",
    label: "Collectibles & Art",
    featured: true,
    image_url: LYRSHOP_IMAGE("1579783902614-a3fb3927b6a5"),
    subcategories: [
      "Pens", "Notebooks", "Art supplies", "Memorabilia", "Trading cards", "Sports memorabilia",
      "Coins & paper money", "Stamps", "Antiques", "Autographs", "Paintings", "Prints & posters", "Sculptures",
    ],
  },
  {
    name: "Media",
    label: "Books, Movies & Music",
    featured: false,
    image_url: LYRSHOP_IMAGE("1512820790803-83ca734da794"),
    subcategories: [
      "Books", "Textbooks", "Comics & graphic novels", "Magazines", "Audiobooks", "Movies & TV",
      "Vinyl records", "CDs",
    ],
  },
  {
    name: "Instruments",
    label: "Musical Instruments & Gear",
    featured: false,
    subcategories: [
      "Guitars & basses", "Keyboards & pianos", "Drums & percussion", "String instruments",
      "Wind & woodwind", "Brass", "DJ equipment", "Recording equipment", "Amplifiers", "Effects pedals",
      "Instrument accessories",
    ],
  },
  {
    name: "Baby",
    label: "Baby",
    featured: false,
    image_url: LYRSHOP_IMAGE("1515488042361-ee00e0ddd4e4"),
    subcategories: [
      "Strollers", "Car seats", "Nursery furniture", "Feeding", "Diapering", "Baby clothing", "Baby gear",
      "Baby toys", "Bathing & grooming", "Baby safety",
    ],
  },
  {
    name: "Pets",
    label: "Pet Supplies",
    featured: false,
    image_url: LYRSHOP_IMAGE("1548199973-03cce0bbc87b"),
    subcategories: [
      "Dog supplies", "Cat supplies", "Fish & aquariums", "Bird supplies", "Small animal supplies",
      "Reptile supplies", "Pet food", "Beds & furniture", "Pet toys", "Grooming", "Leashes & collars",
    ],
  },
  {
    name: "Crafts",
    label: "Crafts",
    featured: false,
    image_url: LYRSHOP_IMAGE("1513364776144-60967b0f800f"),
    subcategories: [
      "Sewing", "Fabric", "Knitting & crochet", "Scrapbooking & paper crafts", "Beading & jewelry making",
      "Candle & soap making", "Woodworking", "Glass & mosaics", "Craft kits",
    ],
  },
  {
    name: "Motors",
    label: "Auto Parts & Accessories",
    featured: false,
    image_url: LYRSHOP_IMAGE("1492144534655-ae79c964c9d7"),
    subcategories: [
      "Car & truck parts", "Motorcycle parts", "Tires & wheels", "Car care & detailing",
      "Interior accessories", "Exterior accessories", "Lighting & lamps", "Performance parts",
      "Oils & fluids", "Garage tools", "Boat parts",
    ],
  },
  {
    name: "Business",
    label: "Business & Industrial",
    featured: false,
    subcategories: [
      "Office equipment", "Office furniture", "Restaurant & food service", "Retail & shop fixtures",
      "Packing & shipping supplies", "Test & measurement", "Electrical equipment", "Heavy equipment",
      "Healthcare & lab", "Printing & graphic arts", "Safety & PPE", "Industrial tools",
    ],
  },
  {
    name: "Travel",
    label: "Travel & Luggage",
    featured: false,
    image_url: LYRSHOP_IMAGE("1503220317375-aaad61436b1b"),
    subcategories: [
      "Luggage", "Carry-on bags", "Travel backpacks", "Packing organizers", "Travel accessories",
      "Adapters & converters", "Travel pillows",
    ],
  },
  {
    name: "Tickets",
    label: "Tickets & Experiences",
    featured: false,
    image_url: LYRSHOP_IMAGE("1493225457124-a3eb161ffa5f"),
    subcategories: [
      "Concert tickets", "Sports tickets", "Theater tickets", "Event tickets", "Experiences", "Gift cards",
    ],
  },
  {
    name: "Specialty",
    label: "Everything Else",
    featured: false,
    subcategories: [
      "Handmade", "Personalized gifts", "Weddings", "Seasonal & holiday", "Religion & spirituality",
      "Everything else",
    ],
  },
];

// A browser that saved its own category list (from the admin page) keeps it, but on a version bump it gains
// any new default categories and subcategories once. Later admin deletions then stick.
(function upgradeStoredCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem("lyrshopCategories") || "null");
    const version = Number(localStorage.getItem(LYRSHOP_CATEGORIES_VERSION_KEY) || 1);
    if (!Array.isArray(stored) || version >= LYRSHOP_CATEGORIES_VERSION) return;

    const merged = stored.map((category) => {
      const defaults = LYRSHOP_DEFAULT_CATEGORIES.find((item) => item.name === category.name);
      if (!defaults) return category;
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
