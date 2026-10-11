const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
const PRODUCT_REQUEST_TIMEOUT_MS = 2000;

const productList = document.getElementById("product-list");
const cartItems = document.getElementById("cart-items");
const cartSubtotal = document.getElementById("cart-subtotal");
const shippingTotal = document.getElementById("shipping-total");
const taxTotal = document.getElementById("tax-total");
const cartTotal = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");
const checkoutStatus = document.getElementById("checkout-status");
const searchForm = document.getElementById("search-form");
const categoryMenuButton = document.getElementById("category-menu-button");
const categoryMenuPanel = document.getElementById("category-menu-panel");
let shippingMethodInputs = document.querySelectorAll('input[name="shipping-method"]');
const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
const shippingZipInput = document.getElementById("shipping-zip");
const quoteShippingButton = document.getElementById("quote-shipping-button");
const detectLocationButton = document.getElementById("detect-location-button");
const shippingRatesPanel = document.getElementById("shipping-rates");
const shippingStatus = document.getElementById("shipping-status");
let navItems = document.querySelectorAll(".nav-item");
let categoryShortcuts = document.querySelectorAll(".category-shortcut");
const accountLink = document.getElementById("account-link");
const STOREFRONT_CATEGORIES_KEY = "lyrshopCategories";
const TAX_RATE = 0.0825;

let shippingMethods = {
  usps: {
    label: "USPS",
    carrier: "USPS",
    service: "USPS Ground Advantage",
    cost: 6.25,
    estimate: "3-5 business days",
  },
  ups: {
    label: "UPS",
    carrier: "UPS",
    service: "UPS Ground",
    cost: 9.5,
    estimate: "2-4 business days",
  },
  fedex: {
    label: "FedEx",
    carrier: "FedEx",
    service: "FedEx Home Delivery",
    cost: 10.25,
    estimate: "2-5 business days",
  },
};

const paymentMethods = {
  stripe: {
    label: "Stripe Checkout",
    gateway: "Stripe",
  },
};

const defaultStorefrontCategories = LYRSHOP_DEFAULT_CATEGORIES;

const PLACEHOLDER_IMAGE_URL = "logo.svg";

function readStoredCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem("shopCart") || "[]");
    return Array.isArray(storedCart) ? storedCart : [];
  } catch (error) {
    console.warn("Stored cart is invalid, starting with an empty cart.", error);
    return [];
  }
}

let cart = readStoredCart();
let allProducts = [];
const pageParams = new URLSearchParams(window.location.search);
let activeCategory = pageParams.get("category") || "All";
let activeSubcategory = pageParams.get("subcategory") || "";
let searchQuery = pageParams.get("search") || "";
// "deals" lists Seasonal Sales & Events; "brands" lists All Brands. Empty is the normal category listing.
let activeView = pageParams.get("view") || "";
let activeBrand = pageParams.get("brand") || "";
let activeEvent = pageParams.get("event") || "";
let activeSort = pageParams.get("sort") || "featured";
let productsLoaded = false;
let searchBox = null;
let checkoutInProgress = false;

const SORTS = {
  featured: { label: "Featured", compare: null },
  "price-asc": { label: "Price: low to high", compare: (a, b) => a.price - b.price },
  "price-desc": { label: "Price: high to low", compare: (a, b) => b.price - a.price },
  discount: { label: "Biggest discount", compare: (a, b) => getDiscountPercent(b.original_price, b.price) - getDiscountPercent(a.original_price, a.price) },
  name: { label: "Name: A to Z", compare: (a, b) => a.name.localeCompare(b.name) },
};

function saveCart() {
  localStorage.setItem("shopCart", JSON.stringify(cart));
  updateHeaderCounts();
}

function getSelectedRadioValue(inputs, fallback) {
  const selected = Array.from(inputs).find((input) => input.checked);
  return selected ? selected.value : fallback;
}

function getCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const shippingKey = getSelectedRadioValue(shippingMethodInputs, "usps");
  const paymentKey = getSelectedRadioValue(paymentMethodInputs, "stripe");
  const shipping = shippingMethods[shippingKey] || shippingMethods.usps;
  const payment = paymentMethods[paymentKey] || paymentMethods.stripe;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping.cost + tax;

  return {
    subtotal,
    shipping,
    payment,
    tax,
    total,
  };
}

function getStoredZip() {
  return localStorage.getItem("lyrshopShippingZip") || "";
}

function saveStoredZip(zip) {
  localStorage.setItem("lyrshopShippingZip", zip);
}

function saveStoredLocation(location) {
  localStorage.setItem("lyrshopLocation", JSON.stringify(location));
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

function formatCurrency(amount) {
  return Number(amount || 0).toFixed(2);
}

function normalizeShippingRate(rate) {
  const amount = Number(rate.amount);
  if (!rate.id || !Number.isFinite(amount)) return null;
  return {
    label: rate.carrier || rate.id.toUpperCase(),
    carrier: rate.carrier || rate.id.toUpperCase(),
    service: rate.service || rate.carrier || rate.id.toUpperCase(),
    cost: amount,
    estimate: rate.estimate || "Carrier estimate unavailable",
  };
}

function renderShippingRates(selectedKey = getSelectedRadioValue(shippingMethodInputs, "usps")) {
  if (!shippingRatesPanel) return;

  shippingRatesPanel.innerHTML = Object.entries(shippingMethods).map(([key, rate], index) => `
    <label class="checkout-option">
      <input type="radio" name="shipping-method" value="${escapeHtml(key)}" ${key === selectedKey || (!selectedKey && index === 0) ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(rate.carrier)}</strong>
        <small>${escapeHtml(rate.service)} | ${escapeHtml(rate.estimate)}</small>
      </span>
      <em>$${formatCurrency(rate.cost)}</em>
    </label>
  `).join("");

  shippingMethodInputs = document.querySelectorAll('input[name="shipping-method"]');
  shippingMethodInputs.forEach((input) => input.addEventListener("change", renderCart));
}

async function quoteShippingRates() {
  if (!shippingZipInput || !shippingStatus) return;

  const zip = shippingZipInput.value.trim();
  if (!zip) {
    shippingStatus.textContent = "Enter a ZIP code to compare USPS, UPS, and FedEx.";
    return;
  }

  if (!cart.length) {
    shippingStatus.textContent = "Add an item before quoting shipping.";
    return;
  }

  quoteShippingButton.disabled = true;
  shippingStatus.textContent = "Getting carrier quotes...";

  try {
    const response = await fetch(`${API_BASE_URL}/shipping/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination_zip: zip, items: cart }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || "Shipping quote failed");

    const rates = (json.rates || [])
      .map((rate) => [rate.id, normalizeShippingRate(rate)])
      .filter(([, rate]) => Boolean(rate));

    if (!rates.length) throw new Error("No shipping rates returned");

    const selectedKey = rates[0][0];
    shippingMethods = Object.fromEntries(rates);
    saveStoredZip(zip);
    renderShippingRates(selectedKey);
    renderCart();
    shippingStatus.textContent = json.live_rates
      ? "Live carrier rates loaded."
      : "Estimated carrier rates loaded. Configure carrier credentials before production.";
  } catch (error) {
    console.warn("Shipping quote failed, using default carrier rates.", error);
    renderShippingRates();
    renderCart();
    shippingStatus.textContent = "Using default carrier estimates until the backend is available.";
  } finally {
    quoteShippingButton.disabled = false;
  }
}

async function detectUserLocation() {
  if (!shippingStatus || !shippingZipInput || !detectLocationButton) return;

  detectLocationButton.disabled = true;
  shippingStatus.textContent = "Requesting location permission...";

  try {
    const position = await getBrowserPosition();
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy_meters: Math.round(position.coords.accuracy || 0),
    };

    saveStoredLocation(location);
    shippingStatus.textContent = "Finding your postal code...";

    const response = await fetch(`${API_BASE_URL}/location/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(location),
    });
    const json = await response.json();

    if (!response.ok) throw new Error(json.message || "Location lookup failed");

    if (json.postal_code) {
      shippingZipInput.value = String(json.postal_code).split("-")[0];
      const place = [json.city, json.state].filter(Boolean).join(", ");
      shippingStatus.textContent = place ? `Location detected: ${place}.` : "Location detected.";
      await quoteShippingRates();
      return;
    }

    shippingStatus.textContent = `Location detected near ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}. Enter a ZIP code to quote shipping.`;
  } catch (error) {
    console.warn("Location detection failed.", error);
    if (error.code === 1) {
      shippingStatus.textContent = "Location permission was denied. Enter a ZIP code to quote shipping.";
    } else if (error.code === 3) {
      shippingStatus.textContent = "Location lookup timed out. Enter a ZIP code to quote shipping.";
    } else {
      shippingStatus.textContent = error.message || "Location lookup failed. Enter a ZIP code to quote shipping.";
    }
  } finally {
    detectLocationButton.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readStorefrontCategories() {
  if (!localStorage.getItem(STOREFRONT_CATEGORIES_KEY)) return defaultStorefrontCategories;
  try {
    const categories = JSON.parse(localStorage.getItem(STOREFRONT_CATEGORIES_KEY) || "[]");
    return Array.isArray(categories) ? normalizeCategories(categories) : defaultStorefrontCategories;
  } catch (error) {
    console.warn("Stored categories are invalid, using defaults.", error);
    return defaultStorefrontCategories;
  }
}

function normalizeCategories(categories) {
  return categories.map((category) => {
    const fallback = defaultStorefrontCategories.find((item) => item.name === category.name) || {};
    return {
      ...category,
      label: category.label || category.name,
      image_url: category.image_url || fallback.image_url || defaultStorefrontCategories[0].image_url,
      subcategories: Array.isArray(category.subcategories)
        ? category.subcategories.filter(Boolean)
        : (fallback.subcategories || []),
    };
  });
}

function updateNavActive() {
  navItems.forEach((item) => {
    item.classList.toggle("active", activeView
      ? item.dataset.view === activeView
      : !item.dataset.view && item.dataset.category === activeCategory);
  });
}

function setActiveCategory(categoryName, subcategory = "") {
  activeCategory = categoryName || "All";
  activeSubcategory = subcategory;
  activeView = "";
  activeBrand = "";
  activeEvent = "";
  searchBox?.setCategory(activeCategory === "All" ? "" : activeCategory);
  updateNavActive();
  refreshListing();
}

function setActiveView(view) {
  activeView = view;
  activeCategory = "All";
  activeSubcategory = "";
  activeBrand = "";
  activeEvent = "";
  updateNavActive();
  refreshListing();
}

// Mega menus show the first few subcategories per group; "See all" opens the whole category.
const CATEGORY_MENU_SUBCATEGORY_LIMIT = 6;

function renderCategoryMenu(categories) {
  if (!categoryMenuPanel) return;

  categoryMenuPanel.innerHTML = `
    <div class="category-menu-grid">
      ${categories.map((category) => `
        <section class="category-menu-group">
          <button type="button" class="category-menu-heading" data-menu-category="${escapeHtml(category.name)}">${escapeHtml(category.label)}</button>
          <div>
            ${(category.subcategories || []).slice(0, CATEGORY_MENU_SUBCATEGORY_LIMIT).map((subcategory) => `
              <button type="button" class="category-menu-link" data-menu-category="${escapeHtml(category.name)}" data-menu-subcategory="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</button>
            `).join("")}
            ${(category.subcategories || []).length > CATEGORY_MENU_SUBCATEGORY_LIMIT ? `
              <button type="button" class="category-menu-link category-menu-more" data-menu-category="${escapeHtml(category.name)}">See all ${escapeHtml(category.label)}</button>
            ` : ""}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderStorefrontCategories() {
  const categories = readStorefrontCategories();
  const showcase = document.querySelector(".category-showcase");

  if (showcase) {
    showcase.innerHTML = categories.filter((category) => category.featured !== false).map((category) => `
      <a href="#product-list" class="category-shortcut" data-shortcut-category="${escapeHtml(category.name)}">
        <span class="shortcut-image"><img src="${escapeHtml(category.image_url || defaultStorefrontCategories[0].image_url)}" alt="" /></span>
        <strong>${escapeHtml(category.label)}</strong>
      </a>
    `).join("");
    categoryShortcuts = document.querySelectorAll(".category-shortcut");
  }


  renderCategoryMenu(categories);
}

function renderCart() {
  cartItems.innerHTML = "";

  if (!cart.length) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
    checkoutButton.disabled = true;
  } else {
    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <span>${escapeHtml(item.name)}</span>
        <span>$${item.price.toFixed(2)}</span>
        <button class="small-button" data-index="${index}">Remove</button>
      `;
      cartItems.appendChild(row);
    });
    checkoutButton.disabled = checkoutInProgress;
  }

  const totals = getCheckoutTotals();
  cartSubtotal.textContent = totals.subtotal.toFixed(2);
  shippingTotal.textContent = totals.shipping.cost.toFixed(2);
  taxTotal.textContent = totals.tax.toFixed(2);
  cartTotal.textContent = totals.total.toFixed(2);
}

function setCheckoutState(message, inProgress = false) {
  checkoutInProgress = inProgress;
  if (checkoutStatus) checkoutStatus.textContent = message || "";
  if (checkoutButton) {
    checkoutButton.disabled = inProgress || !cart.length;
    checkoutButton.textContent = inProgress ? "Starting checkout..." : "Checkout with Stripe";
  }
}

function getFilteredProducts() {
  let filtered = allProducts;

  if (activeCategory !== "All") {
    filtered = filtered.filter((p) => p.category === activeCategory);
  }

  if (activeSubcategory) {
    filtered = filtered.filter((p) => !p.subcategory || p.subcategory === activeSubcategory);
  }

  if (activeView === "watchlist") {
    filtered = filtered.filter((p) => isWatched(p.id));
  }

  if (activeView === "deals") {
    filtered = filtered.filter(isOnSale);
    if (activeEvent) filtered = filtered.filter((p) => (p.sale_event || "") === activeEvent);
  }

  if (activeBrand) {
    filtered = filtered.filter((p) => (p.brand || "").toLowerCase() === activeBrand.toLowerCase());
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => [p.name, p.description, p.brand]
      .some((field) => String(field || "").toLowerCase().includes(q)));
  }

  const sort = SORTS[activeSort] || SORTS.featured;
  return sort.compare ? [...filtered].sort(sort.compare) : filtered;
}

function isOnSale(product) {
  return product.original_price > product.price;
}

function countBy(products, key) {
  const counts = new Map();
  products.forEach((product) => {
    const value = (product[key] || "").trim();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderChips(entries, selected, allLabel, dataKey, emptyText) {
  if (!entries.length) return `<p class="listing-empty">${emptyText}</p>`;
  return `
    <button type="button" class="filter-chip ${selected ? "" : "active"}" data-${dataKey}="">${allLabel}</button>
    ${entries.map(([value, count]) => `
      <button type="button" class="filter-chip ${value === selected ? "active" : ""}" data-${dataKey}="${escapeHtml(value)}">
        ${escapeHtml(value)} <span>${count}</span>
      </button>
    `).join("")}
  `;
}

// Sets the listing heading and, for the deals/brands views, the event or brand chips above the grid.
function renderListingControls() {
  const heading = document.getElementById("listing-title");
  const subheading = document.getElementById("listing-subtitle");
  const filters = document.getElementById("listing-filters");
  if (!heading || !filters) return;

  if (activeView === "watchlist") {
    heading.textContent = "Your Watchlist";
    subheading.textContent = "Items you saved with the heart button";
    filters.innerHTML = "";
  } else if (activeView === "deals") {
    heading.textContent = "Seasonal Sales & Events";
    subheading.textContent = "Marked-down items from current sales and events";
    filters.innerHTML = renderChips(countBy(allProducts.filter(isOnSale), "sale_event"), activeEvent,
      "All deals", "event", "Sale events will appear here as sellers add them.");
  } else if (activeView === "brands") {
    heading.textContent = activeBrand ? activeBrand : "All Brands";
    subheading.textContent = activeBrand ? `Everything from ${activeBrand}` : "Shop by brand, A to Z";
    filters.innerHTML = renderChips(countBy(allProducts, "brand"), activeBrand,
      "All brands", "brand", "Brands will appear here as sellers add them.");
  } else if (searchQuery) {
    heading.textContent = `Results for "${searchQuery}"`;
    subheading.textContent = "Matching names, brands and descriptions";
    filters.innerHTML = "";
  } else if (activeCategory !== "All") {
    heading.textContent = categoryLabel(activeCategory);
    subheading.textContent = activeSubcategory || "Everything in this category";
    filters.innerHTML = "";
  } else {
    heading.textContent = "Today's Deals";
    subheading.textContent = "Great savings on popular items";
    filters.innerHTML = "";
  }
  filters.hidden = !filters.innerHTML;
  renderListingToolbar();
}

function categoryLabel(name) {
  return readStorefrontCategories().find((category) => category.name === name)?.label || name;
}

// Result count, removable chips for each active filter, and the sort menu.
function renderListingToolbar() {
  const count = document.getElementById("listing-count");
  const active = document.getElementById("active-filters");
  const sortSelect = document.getElementById("sort-select");
  if (!count || !active || !sortSelect) return;

  const total = getFilteredProducts().length;
  count.textContent = productsLoaded ? `${total} ${total === 1 ? "item" : "items"}` : "Loading items...";
  const chips = [
    searchQuery && { key: "search", label: `"${searchQuery}"` },
    activeCategory !== "All" && { key: "category", label: categoryLabel(activeCategory) },
    activeSubcategory && { key: "subcategory", label: activeSubcategory },
    activeBrand && { key: "brand", label: activeBrand },
    activeEvent && { key: "event", label: activeEvent },
  ].filter(Boolean);
  active.innerHTML = chips.map((chip) => `
    <button type="button" class="active-filter" data-clear="${chip.key}" aria-label="Remove filter ${escapeHtml(chip.label)}">
      ${escapeHtml(chip.label)} <span aria-hidden="true">&times;</span>
    </button>`).join("")
    + (chips.length > 1 ? `<button type="button" class="active-filter-reset" data-clear="all">Clear all</button>` : "");
  sortSelect.value = SORTS[activeSort] ? activeSort : "featured";
}

function clearFilter(key) {
  if (key === "search" || key === "all") { searchQuery = ""; searchBox?.setQuery(""); }
  if (key === "category" || key === "all") { activeCategory = "All"; activeSubcategory = ""; searchBox?.setCategory(""); }
  if (key === "subcategory") activeSubcategory = "";
  if (key === "brand" || key === "all") activeBrand = "";
  if (key === "event" || key === "all") activeEvent = "";
  if (key === "all") activeView = "";
  refreshListing();
}

// Keep the address bar in step with the listing so it can be shared or bookmarked.
function syncListingUrl() {
  const params = new URLSearchParams();
  if (searchQuery) params.set("search", searchQuery);
  if (activeCategory !== "All") params.set("category", activeCategory);
  if (activeSubcategory) params.set("subcategory", activeSubcategory);
  if (activeView) params.set("view", activeView);
  if (activeBrand) params.set("brand", activeBrand);
  if (activeEvent) params.set("event", activeEvent);
  if (activeSort !== "featured") params.set("sort", activeSort);
  const query = params.toString();
  history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

// ── Hero slider ─────────────────────────────────────────────────────────────
// Sale slides come only from products with a real was price; the rest are category and brand promos.
const HERO_IMAGE = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=520&q=70`;
const HERO_AUTOPLAY_MS = 6000;
const HERO_PROMOS = [
  { eyebrow: "Welcome to Lyrshop", title: "Everyday picks and rare scores", text: "Browse 20 categories from Lyrshop sellers.",
    cta: "Shop now", href: "#product-list", image: "1550009158-9ebf69173e03", tone: "#f7d7c4" },
  { eyebrow: "Motors", title: "Gear up your ride", text: "Parts, accessories, tires and garage tools.",
    cta: "Shop Motors", href: "index.html?category=Motors#product-list", image: "1492144534655-ae79c964c9d7", tone: "#dfe6f0" },
  { eyebrow: "Electronics", title: "Tech for every day", text: "Laptops, phones, cameras and smart home.",
    cta: "Shop Electronics", href: "index.html?category=Electronics#product-list", image: "1517336714731-489689fd1ca8", tone: "#e6e1f7" },
  { eyebrow: "Clothing & Accessories", title: "Style that fits", text: "Clothing, handbags and collectible sneakers.",
    cta: "Shop fashion", href: "index.html?category=Lifestyle#product-list", image: "1483985988355-763728e1935b", tone: "#f3e3e8" },
  { eyebrow: "Home & Garden", title: "Refresh your space", text: "Furniture, kitchen, bedding and garden.",
    cta: "Shop Home & Garden", href: "index.html?category=Home#product-list", image: "1505693416388-ac5ce068fe85", tone: "#ece6dc" },
  { eyebrow: "All Brands", title: "Shop by brand", text: "Find your favorite makers, A to Z.",
    cta: "Browse brands", href: "index.html?view=brands#product-list", image: "1441986300917-64674bd600d8", tone: "#e3efe6" },
];
let heroSlides = [];
let heroIndex = 0;
let heroTimer = null;

function buildHeroSlides() {
  const events = new Map();
  allProducts.filter(isOnSale).forEach((product) => {
    const name = product.sale_event || "Sale";
    const event = events.get(name) || { count: 0, best: 0 };
    event.count += 1;
    event.best = Math.max(event.best, getDiscountPercent(product.original_price, product.price));
    events.set(name, event);
  });
  const saleSlides = [...events.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([name, { count, best }]) => ({
      eyebrow: "Sale event",
      title: best ? `${name}: up to ${best}% off` : name,
      text: `${count} marked-down ${count === 1 ? "item" : "items"} from Lyrshop sellers.`,
      cta: "Shop the sale",
      href: `index.html?view=deals${name === "Sale" ? "" : `&event=${encodeURIComponent(name)}`}#product-list`,
      image: "1607082348824-0a96f2a4b9da",
      tone: "#fde2e1",
    }));
  return [...saleSlides, ...HERO_PROMOS];
}

function goToHeroSlide(index) {
  const track = document.getElementById("hero-track");
  if (!track || !heroSlides.length) return;
  heroIndex = (index + heroSlides.length) % heroSlides.length;
  track.style.transform = `translateX(-${heroIndex * 100}%)`;
  track.querySelectorAll(".hero-slide").forEach((slide, i) => {
    const current = i === heroIndex;
    slide.setAttribute("aria-hidden", String(!current));
    slide.inert = !current;
  });
  document.querySelectorAll("#hero-dots button").forEach((dot, i) => {
    dot.setAttribute("aria-selected", String(i === heroIndex));
  });
}

function stopHeroAutoplay() {
  window.clearInterval(heroTimer);
  heroTimer = null;
}

function startHeroAutoplay() {
  stopHeroAutoplay();
  if (heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = window.setInterval(() => goToHeroSlide(heroIndex + 1), HERO_AUTOPLAY_MS);
}

function renderHeroSlider() {
  const track = document.getElementById("hero-track");
  const dots = document.getElementById("hero-dots");
  if (!track || !dots) return;
  heroSlides = buildHeroSlides();
  track.innerHTML = heroSlides.map((slide, i) => `
    <article class="market-hero hero-slide" style="--hero-tone: ${slide.tone}" aria-roledescription="slide" aria-label="${i + 1} of ${heroSlides.length}">
      <div class="market-hero-copy">
        <p class="eyebrow">${escapeHtml(slide.eyebrow)}</p>
        <h2>${escapeHtml(slide.title)}</h2>
        <p>${escapeHtml(slide.text)}</p>
        <a href="${escapeHtml(slide.href)}" class="button button-dark">${escapeHtml(slide.cta)}</a>
      </div>
      <div class="market-hero-visual" aria-hidden="true">
        <img src="${HERO_IMAGE(slide.image)}" alt="" ${i === 0 ? "" : 'loading="lazy"'} />
      </div>
    </article>
  `).join("");
  dots.innerHTML = heroSlides.map((slide, i) => `
    <button type="button" role="tab" aria-label="Slide ${i + 1}: ${escapeHtml(slide.title)}" data-slide="${i}"></button>
  `).join("");
  goToHeroSlide(0);
  startHeroAutoplay();
}

function bindHeroSlider() {
  const slider = document.getElementById("hero-slider");
  if (!slider) return;
  document.getElementById("hero-prev").addEventListener("click", () => { goToHeroSlide(heroIndex - 1); startHeroAutoplay(); });
  document.getElementById("hero-next").addEventListener("click", () => { goToHeroSlide(heroIndex + 1); startHeroAutoplay(); });
  document.getElementById("hero-dots").addEventListener("click", (event) => {
    const dot = event.target.closest("[data-slide]");
    if (!dot) return;
    goToHeroSlide(Number(dot.dataset.slide));
    startHeroAutoplay();
  });
  slider.addEventListener("mouseenter", stopHeroAutoplay);
  slider.addEventListener("mouseleave", startHeroAutoplay);
  slider.addEventListener("focusin", stopHeroAutoplay);
  slider.addEventListener("focusout", startHeroAutoplay);

  let touchStartX = null;
  slider.addEventListener("touchstart", (event) => { touchStartX = event.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(deltaX) < 40) return;
    goToHeroSlide(heroIndex + (deltaX < 0 ? 1 : -1));
    startHeroAutoplay();
  });
}

function refreshListing() {
  renderListingControls();
  renderProductCards(getFilteredProducts());
  syncListingUrl();
}

function renderStars(score) {
  const maxStars = 5;
  const filledStars = Math.round(score || 4);
  let stars = "";
  for (let i = 0; i < maxStars; i += 1) {
    stars += i < filledStars ? "★" : "☆";
  }
  return stars;
}

function getDiscountPercent(original, current) {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

function renderSkeletonCards(count = 8) {
  productList.innerHTML = Array.from({ length: count }, () => `
    <div class="product-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-image"></div>
      <div class="card-content">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line price"></div>
      </div>
    </div>`).join("");
  productList.setAttribute("aria-busy", "true");
}

function renderEmptyState() {
  const watchlist = activeView === "watchlist";
  productList.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">${watchlist ? "&#9825;" : "&#128269;"}</span>
      <h3>${watchlist ? "Your watchlist is empty" : "No items match"}</h3>
      <p>${watchlist ? "Tap the heart on any item to save it here." : "Try a different search or clear your filters."}</p>
      <button type="button" class="button button-primary" data-clear="all">${watchlist ? "Browse all items" : "Clear filters"}</button>
    </div>`;
}

function renderProductCards(products) {
  productList.removeAttribute("aria-busy");
  if (!productsLoaded) {
    renderSkeletonCards();
    return;
  }
  if (products.length === 0) {
    renderEmptyState();
    return;
  }

  productList.innerHTML = products.map((product, index) => {
    const discount = getDiscountPercent(product.original_price, product.price);
    const productUrl = `product.html?id=${encodeURIComponent(product.id)}`;
    const watched = isWatched(product.id);
    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}" style="--i: ${Math.min(index, 12)}">
        <a class="card-image product-card-link" href="${productUrl}" aria-label="View ${escapeHtml(product.name)}">
          <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" />
          ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ""}
        </a>
        <button type="button" class="watch-toggle${watched ? " is-watched" : ""}" data-watch="${escapeHtml(product.id)}"
          aria-pressed="${watched}" aria-label="${watched ? "Remove from" : "Add to"} watchlist: ${escapeHtml(product.name)}">${watched ? "&#9829;" : "&#9825;"}</button>
        <div class="card-content">
          ${product.brand ? `<p class="product-brand">${escapeHtml(product.brand)}</p>` : ""}
          <h3 class="product-name"><a href="${productUrl}">${escapeHtml(product.name)}</a></h3>
          <p class="product-desc">${escapeHtml(product.description)}</p>
          ${isOnSale(product) && product.sale_event ? `<span class="sale-event-badge">${escapeHtml(product.sale_event)}</span>` : ""}
          <div class="product-rating" aria-label="Rated ${Math.round(product.rating || 4)} out of 5">${renderStars(product.rating || 4)}</div>
          <div class="product-pricing">
            <span class="current-price">$${product.price.toFixed(2)}</span>
            ${isOnSale(product) ? `<span class="original-price">$${product.original_price.toFixed(2)}</span>` : ""}
          </div>
          <button type="button" class="button button-primary add-cart-btn" data-add="${escapeHtml(product.id)}">Add to Cart</button>
        </div>
      </article>`;
  }).join("");
}

// One delegated handler for every card: add to cart, watchlist hearts, and empty-state reset.
function bindProductListActions() {
  productList.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      const product = allProducts.find((item) => String(item.id) === addButton.dataset.add);
      if (!product) return;
      cart.push({ id: product.id, name: product.name, price: product.price });
      saveCart();
      renderCart();
      addButton.classList.add("is-added");
      addButton.textContent = "Added \u2713";
      window.setTimeout(() => { addButton.classList.remove("is-added"); addButton.textContent = "Add to Cart"; }, 1400);
      showToast(`${product.name} added to your cart`, { actionLabel: "View cart", actionHref: "#cart-panel" });
      return;
    }
    const heart = event.target.closest("[data-watch]");
    if (heart) {
      const watched = toggleWatchlist(heart.dataset.watch);
      const product = allProducts.find((item) => String(item.id) === heart.dataset.watch);
      if (activeView === "watchlist" && !watched) {
        refreshListing();
      } else {
        heart.classList.toggle("is-watched", watched);
        heart.setAttribute("aria-pressed", String(watched));
        heart.innerHTML = watched ? "&#9829;" : "&#9825;";
        heart.setAttribute("aria-label", `${watched ? "Remove from" : "Add to"} watchlist: ${product?.name || ""}`);
      }
      showToast(watched ? "Saved to your watchlist" : "Removed from your watchlist",
        watched ? { actionLabel: "View watchlist", actionHref: "index.html?view=watchlist#product-list" } : {});
      return;
    }
    if (event.target.closest("[data-clear]")) clearFilter("all");
  });

  document.getElementById("active-filters")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-clear]");
    if (chip) clearFilter(chip.dataset.clear);
  });
  document.getElementById("sort-select")?.addEventListener("change", (event) => {
    activeSort = event.target.value;
    refreshListing();
  });
}

async function loadProducts() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PRODUCT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/products`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Product request failed with ${response.status}`);
    }
    const json = await response.json();
    const products = (json.products || [])
      .map((p) => {
        const price = Number(p.price);
        if (!Number.isFinite(price)) return null;

        return {
          ...p,
          price,
          // Only a real seller-set "was" price is shown; never invent a discount.
          original_price: Number(p.compare_at_price) || 0,
          rating: Number(p.rating) || 4,
          image_url: p.image_url || PLACEHOLDER_IMAGE_URL,
        };
      })
      .filter(Boolean);

    allProducts = products;
    productsLoaded = true;
  } catch (error) {
    console.warn("Product request failed.", error);
    allProducts = [];
    productsLoaded = true;
  } finally {
    refreshListing();
    // Rebuild once products arrive so real sale events get their own slides.
    if (allProducts.some(isOnSale)) renderHeroSlider();
    window.clearTimeout(timeoutId);
  }
}

async function checkout() {
  if (!cart.length || checkoutInProgress) return;
  const user = getCurrentUser();

  if (!user) {
    localStorage.setItem("lyrshopAuthReturnTo", "index.html#cart-panel");
    window.location.href = "auth.html";
    return;
  }

  setCheckoutState("Starting Stripe checkout...", true);
  const totals = getCheckoutTotals();
  const order = {
    items: cart,
    subtotal: totals.subtotal,
    shipping_total: totals.shipping.cost,
    tax_total: totals.tax,
    total: totals.total,
    shipping_method: totals.shipping.service,
    shipping_estimate: totals.shipping.estimate,
    shipping_carrier: totals.shipping.carrier,
    shipping_service: totals.shipping.service,
    payment_method: totals.payment.label,
    payment_gateway: totals.payment.gateway,
    payment_status: "pending",
    user_email: user.email,
  };

  let savedOrder = { ...order };
  let orderWasAccepted = false;
  let checkoutUrl = "";
  let stripeConfigured = false;

  try {
    const sessionResponse = await fetch(`${API_BASE_URL}/checkout/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...order,
        success_url: `${window.location.origin}/dashboard.html`,
        cancel_url: `${window.location.origin}/index.html#cart-panel`,
      }),
    });
    const sessionJson = await sessionResponse.json();
    if (!sessionResponse.ok) {
      setCheckoutState("Stripe checkout failed: " + (sessionJson.message || "unknown error"));
      return;
    }

    savedOrder.stripe_session_id = sessionJson.session_id;
    checkoutUrl = sessionJson.checkout_url;
    stripeConfigured = Boolean(sessionJson.stripe_configured);

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savedOrder),
    });

    if (response.ok) {
      const json = await response.json();
      savedOrder = json.order || order;
      orderWasAccepted = true;
    } else {
      const error = await response.json();
      setCheckoutState("Checkout failed: " + (error.message || "unknown error"));
      return;
    }
  } catch (error) {
    console.warn("Checkout backend unavailable, saving order in browser history.", error);
    orderWasAccepted = true;
  }

  if (orderWasAccepted) {
    saveOrderForCurrentUser(savedOrder);
    cart = [];
    saveCart();
    renderCart();
    if (stripeConfigured && checkoutUrl) {
      setCheckoutState("Redirecting to Stripe...", true);
      window.location.href = checkoutUrl;
      return;
    }
    if (stripeConfigured && !checkoutUrl) {
      setCheckoutState("Stripe checkout failed: no checkout URL returned. Contact support.");
      return;
    }
    setCheckoutState("Order placed! Stripe payments are not configured — redirecting to your orders...");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 2000);
    return;
  }

  setCheckoutState("");
}

function renderAccountState() {
  const user = getCurrentUser();
  if (user) {
    accountLink.textContent = `Hi, ${String(user.name || "there").split(" ")[0]}`;
    accountLink.href = "dashboard.html";
    return;
  }

  accountLink.textContent = "Sign in";
  accountLink.href = "auth.html";
}

productList.addEventListener("click", (event) => {
  if (event.target.matches(".button")) {
    // handled by product creation listener already
  }
});

cartItems.addEventListener("click", (event) => {
  if (event.target.matches(".small-button")) {
    const index = Number(event.target.dataset.index);
    cart.splice(index, 1);
    saveCart();
    renderCart();
  }
});

checkoutButton.addEventListener("click", checkout);
if (quoteShippingButton) quoteShippingButton.addEventListener("click", quoteShippingRates);
if (detectLocationButton) detectLocationButton.addEventListener("click", detectUserLocation);
paymentMethodInputs.forEach((input) => input.addEventListener("change", renderCart));

function bindCategoryFilters() {
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.view) {
        setActiveView(item.dataset.view);
      } else {
        setActiveCategory(item.dataset.category);
      }
    });
  });

  categoryShortcuts.forEach((link) => {
    link.addEventListener("click", () => {
      setActiveCategory(link.dataset.shortcutCategory || "All");
    });
  });
}

function bindCategoryMenu() {
  if (!categoryMenuButton || !categoryMenuPanel) return;

  categoryMenuButton.addEventListener("click", () => {
    const isOpen = !categoryMenuPanel.hidden;
    categoryMenuPanel.hidden = isOpen;
    categoryMenuButton.setAttribute("aria-expanded", String(!isOpen));
  });

  categoryMenuPanel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-menu-category]");
    if (!button) return;

    setActiveCategory(button.dataset.menuCategory || "All", button.dataset.menuSubcategory || "");
    categoryMenuPanel.hidden = true;
    categoryMenuButton.setAttribute("aria-expanded", "false");
    document.getElementById("product-list").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.addEventListener("click", (event) => {
    if (categoryMenuPanel.hidden) return;
    if (event.target.closest(".category-menu-wrap")) return;
    categoryMenuPanel.hidden = true;
    categoryMenuButton.setAttribute("aria-expanded", "false");
  });
}

function applySearch(query, category) {
  searchQuery = query;
  const nextCategory = category || "All";
  if (nextCategory !== activeCategory) {
    activeCategory = nextCategory;
    activeSubcategory = "";
  }
  // Searching from a special view (deals, brands, watchlist) searches the whole store.
  if (query && activeView) {
    activeView = "";
    activeBrand = "";
    activeEvent = "";
  }
  updateNavActive();
  refreshListing();
}

function bindListingFilters() {
  const filters = document.getElementById("listing-filters");
  if (!filters) return;
  filters.addEventListener("click", (event) => {
    const chip = event.target.closest(".filter-chip");
    if (!chip) return;
    if ("event" in chip.dataset) activeEvent = chip.dataset.event;
    if ("brand" in chip.dataset) activeBrand = chip.dataset.brand;
    refreshListing();
  });
}

function initStorefront() {
  renderStorefrontCategories();
  bindCategoryFilters();
  bindListingFilters();
  bindCategoryMenu();
  bindHeroSlider();
  renderHeroSlider();
  bindProductListActions();
  searchBox = initSearchBox({
    form: searchForm,
    getProducts: () => allProducts,
    getCategories: readStorefrontCategories,
    onChange: applySearch,
    onSubmit: (query, category) => {
      applySearch(query, category);
      document.getElementById("product-list").scrollIntoView({ behavior: "smooth", block: "start" });
    },
    initialQuery: searchQuery,
    initialCategory: activeCategory === "All" ? "" : activeCategory,
  });
  refreshListing();
  renderAccountState();
  if (shippingZipInput) shippingZipInput.value = getStoredZip();
  renderShippingRates();
  renderCart();
  loadProducts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStorefront);
} else {
  initStorefront();
}
