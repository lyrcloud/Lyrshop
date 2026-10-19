const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
// The whole catalog comes back in one reply (about 300 listings); a cold API start can take several seconds.
const PRODUCT_REQUEST_TIMEOUT_MS = 12000;

const productList = document.getElementById("product-list");
const searchForm = document.getElementById("search-form");
const categoryMenuButton = document.getElementById("category-menu-button");
const categoryMenuPanel = document.getElementById("category-menu-panel");
let navItems = document.querySelectorAll(".nav-item");
let categoryShortcuts = document.querySelectorAll(".category-shortcut");
const accountLink = document.getElementById("account-link");
const STOREFRONT_CATEGORIES_KEY = "lyrshopCategories";
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
const DEFAULT_SORT = "nearby";
let activeSort = pageParams.get("sort") || DEFAULT_SORT;
// "country" or "region" keeps only items listed near the shopper; empty shows everywhere.
let activeNear = pageParams.get("near") || "";
let productsLoaded = false;
let searchBox = null;

// Products uploaded before upload times were recorded have no created_at and sort after newer ones.
const byNewest = (a, b) => b.created_at - a.created_at;
// Trending products picked for the shopper's country rank with items from that country, even when they ship from abroad.
const localRank = (product) => Math.max(product.nearby, product.market_pick ? 3 : 0);

const SORTS = {
  // Like a local marketplace: nearest first, then the prices that suit the shopper's country, then newest.
  nearby: { label: "Best for your location", compare: (a, b) => localRank(b) - localRank(a) || b.price_fit - a.price_fit || byNewest(a, b) },
  latest: { label: "Latest uploads", compare: byNewest },
  trending: { label: "Trending", compare: (a, b) => b.trending - a.trending || b.market_pick - a.market_pick || byNewest(a, b) },
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

  if (activeNear) {
    const minimum = activeNear === "country" ? 3 : 2;
    filtered = filtered.filter((p) => p.nearby >= minimum);
  }

  if (searchQuery.trim()) {
    const terms = getSearchTerms(searchQuery);
    filtered = filtered.filter((p) => matchesSearch(productSearchFields(p), terms));
  }

  const sort = SORTS[activeSort] || SORTS[DEFAULT_SORT];
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
    activeNear && { key: "near", label: activeNear === "country" ? "In your country" : "In your region" },
  ].filter(Boolean);
  active.innerHTML = chips.map((chip) => `
    <button type="button" class="active-filter" data-clear="${chip.key}" aria-label="Remove filter ${escapeHtml(chip.label)}">
      ${escapeHtml(chip.label)} <span aria-hidden="true">&times;</span>
    </button>`).join("")
    + (chips.length > 1 ? `<button type="button" class="active-filter-reset" data-clear="all">Clear all</button>` : "");
  sortSelect.value = SORTS[activeSort] ? activeSort : DEFAULT_SORT;
  const nearSelect = document.getElementById("near-select");
  if (nearSelect) nearSelect.value = activeNear;
}

function clearFilter(key) {
  if (key === "search" || key === "all") { searchQuery = ""; searchBox?.setQuery(""); }
  if (key === "category" || key === "all") { activeCategory = "All"; activeSubcategory = ""; searchBox?.setCategory(""); }
  if (key === "subcategory") activeSubcategory = "";
  if (key === "brand" || key === "all") activeBrand = "";
  if (key === "event" || key === "all") activeEvent = "";
  if (key === "near" || key === "all") activeNear = "";
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
  if (activeSort !== DEFAULT_SORT) params.set("sort", activeSort);
  if (activeNear) params.set("near", activeNear);
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
// GET /calendar: the open sales-calendar event (if any) and the next one, which drive the banner and first slides.
let salesCalendar = null;
const UPCOMING_SLIDE_DAYS = 45;
const EVENT_FALLBACK_IMAGE = "1607082348824-0a96f2a4b9da";
let heroIndex = 0;
let heroTimer = null;

// The best discount the open event currently gives, from the listings the server marked down.
function bestEventDiscount(event) {
  return allProducts.reduce((best, product) => (product.event_name === event.name ? Math.max(best, Number(product.event_discount) || 0) : best), 0);
}

function eventDealsHref(event) {
  return `index.html?view=deals&event=${encodeURIComponent(event.name)}#product-list`;
}

function activeEventSlide() {
  const active = salesCalendar?.active;
  if (!active) return null;
  const best = bestEventDiscount(active) || active.max_discount;
  return {
    eyebrow: active.phase === "live" ? `${active.name} · ends in ${timeUntilEndOf(active.closes)}` : `Early ${active.name} deals`,
    title: `${active.headline || active.name}: up to ${best}% off`,
    text: active.phase === "live"
      ? `${active.message || ""} Trending and new items are marked down today.`.trim()
      : `${active.message || ""} Up to ${active.max_discount}% off on ${formatEventDate(active.date)}.`.trim(),
    cta: "Shop the sale",
    href: eventDealsHref(active),
    imageUrl: active.image_url || HERO_IMAGE(EVENT_FALLBACK_IMAGE),
    tone: active.tone,
  };
}

function upcomingEvent() {
  const next = salesCalendar?.upcoming;
  const daysAway = next ? (Date.parse(`${next.opens}T00:00:00Z`) - Date.now()) / 86400000 : Infinity;
  return daysAway <= UPCOMING_SLIDE_DAYS ? next : null;
}

function upcomingEventSlide() {
  const next = upcomingEvent();
  if (!next) return null;
  return {
    eyebrow: `Coming ${formatEventDate(next.date)}`,
    title: next.headline || next.name,
    text: `Deals up to ${next.max_discount}% off on trending and new items start ${formatEventDate(next.opens)}.`,
    cta: "Shop trending now",
    href: "index.html?sort=trending#product-list",
    imageUrl: next.image_url || HERO_IMAGE(EVENT_FALLBACK_IMAGE),
    tone: next.tone,
  };
}

function buildHeroSlides() {
  const events = new Map();
  // The open calendar event has its own slide, so its markdowns are not counted again below.
  allProducts.filter((product) => isOnSale(product) && !(salesCalendar?.active && product.sale_event === salesCalendar.active.name)).forEach((product) => {
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
  return [activeEventSlide(), ...saleSlides, upcomingEventSlide(), ...HERO_PROMOS].filter(Boolean);
}

// The strip above the slider: the open event with its countdown, or a heads-up for the next one.
function renderEventBanner() {
  const banner = document.getElementById("event-banner");
  if (!banner) return;
  const active = salesCalendar?.active;
  const next = upcomingEvent();
  let text = "";
  let link = "";
  if (active) {
    const best = bestEventDiscount(active) || active.max_discount;
    text = active.phase === "live"
      ? `<strong>${escapeHtml(active.name)} is on:</strong> up to ${best}% off trending &amp; new items · ends in ${escapeHtml(timeUntilEndOf(active.closes))}`
      : `<strong>Early ${escapeHtml(active.name)} deals:</strong> up to ${best}% off now, up to ${active.max_discount}% on ${escapeHtml(formatEventDate(active.date))}`;
    link = `<a href="${escapeHtml(eventDealsHref(active))}">Shop the sale &rsaquo;</a>`;
  } else if (next) {
    text = `<strong>${escapeHtml(next.name)}</strong> deals up to ${next.max_discount}% off start ${escapeHtml(formatEventDate(next.opens))}`;
  }
  banner.hidden = !text;
  banner.style.setProperty("--event-tone", (active || next)?.tone || "#fde2e1");
  banner.innerHTML = text ? `<span class="event-banner-icon" aria-hidden="true">&#127881;</span><p>${text}</p>${link}` : "";
}

async function loadSalesCalendar() {
  try {
    const response = await fetch(`${API_BASE_URL}/calendar`);
    // CloudFront answers unknown paths with the storefront page, so only JSON counts.
    if (!response.ok || !(response.headers.get("Content-Type") || "").includes("application/json")) return;
    salesCalendar = await response.json();
  } catch (error) {
    console.warn("Sales calendar unavailable.", error);
    return;
  }
  renderEventBanner();
  renderHeroSlider();
  // Keep the countdown current while the page stays open.
  window.setInterval(renderEventBanner, 60000);
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
        <img src="${escapeHtml(slide.imageUrl || HERO_IMAGE(slide.image))}" alt="" ${i === 0 ? "" : 'loading="lazy"'} />
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
        <a class="card-image product-card-link" href="${productUrl}" aria-label="View ${escapeHtml(product.name)}" data-photos="${escapeHtml(JSON.stringify(cardPhotos(product)))}">
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
          ${product.wholesale_tiers?.length ? `<span class="bulk-badge" title="Wholesale prices for approved business accounts">Bulk pricing</span>` : ""}
          ${product.regional_factor ? `<span class="regional-badge" title="The seller lowered this price for shoppers in your country">Fair price for your country</span>` : ""}
          <p class="product-location${product.nearby >= 3 ? " is-local" : ""}" title="${escapeHtml(product.nearby_label || "Item location")}">&#128205; ${escapeHtml(itemLocationLabel(product))}</p>
          <div class="product-rating">${ratingStars(product.rating || 4)}</div>
          <div class="product-pricing">
            <span class="current-price">${formatPrice(product.price)}</span>
            ${isOnSale(product) ? `<span class="original-price">${formatPrice(product.original_price)}</span>` : ""}
          </div>
          ${product.options?.length
            ? `<a class="button button-primary add-cart-btn" href="${productUrl}">Choose options</a>`
            : `<button type="button" class="button button-primary add-cart-btn" data-add="${escapeHtml(product.id)}">Add to Cart</button>`}
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
      cart = readStoredCart(); // The cart page or another tab may have changed it.
      cart.push({ id: product.id, name: product.name, price: product.price });
      saveCart();
      addButton.classList.add("is-added");
      addButton.textContent = "Added \u2713";
      window.setTimeout(() => { addButton.classList.remove("is-added"); addButton.textContent = "Add to Cart"; }, 1400);
      showToast(`${product.name} added to your cart`, { actionLabel: "View cart", actionHref: "cart.html" });
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
  document.getElementById("near-select")?.addEventListener("change", (event) => {
    activeNear = event.target.value;
    refreshListing();
  });
}

async function loadProducts() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PRODUCT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(shopperProductsUrl(API_BASE_URL), { signal: controller.signal });
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
          ...listingPrices(p),
          rating: Number(p.rating) || 4,
          created_at: Number(p.created_at) || 0,
          // Units sold in the last 30 days, counted by the server.
          trending: Number(p.trending) || 0,
          // How near the item is (0 abroad … 4 same city) and how well its price suits the shopper's country.
          nearby: Number(p.nearby) || 0,
          price_fit: Number(p.price_fit) || 0,
          // Picked for the shopper's country from CJ's trending products there.
          market_pick: p.market_pick ? 1 : 0,
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
    renderEventBanner();
    window.clearTimeout(timeoutId);
  }
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

// ── Card photo preview ───────────────────────────────────────────────────────────
// Hovering a listing card with a mouse cycles through its first few photos; leaving it shows the main photo again.

const CARD_PHOTO_LIMIT = 5;
const CARD_PHOTO_MS = 1100;
let cardSlide = null;

function cardPhotos(product) {
  const photos = (Array.isArray(product.media) ? product.media : []).filter((item) => item?.type === "image" && item.url).map((item) => item.url);
  return [...new Set([product.image_url, ...photos].filter(Boolean))].slice(0, CARD_PHOTO_LIMIT);
}

function stopCardSlide() {
  if (!cardSlide) return;
  window.clearInterval(cardSlide.timer);
  cardSlide.image.src = cardSlide.photos[0];
  cardSlide = null;
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  productList.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse") return;
    const link = event.target.closest(".card-image[data-photos]");
    if (!link || cardSlide?.link === link) return;
    stopCardSlide();
    let photos = [];
    try { photos = JSON.parse(link.dataset.photos); } catch { return; }
    const image = link.querySelector("img");
    if (photos.length < 2 || !image) return;
    photos.slice(1).forEach((url) => { new Image().src = url; });
    let index = 0;
    cardSlide = {
      link, image, photos,
      timer: window.setInterval(() => {
        index = (index + 1) % photos.length;
        image.src = photos[index];
      }, CARD_PHOTO_MS),
    };
  });
  productList.addEventListener("pointerout", (event) => {
    if (cardSlide && !cardSlide.link.contains(event.relatedTarget)) stopCardSlide();
  });
}

productList.addEventListener("click", (event) => {
  if (event.target.matches(".button")) {
    // handled by product creation listener already
  }
});

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
  loadSalesCalendar();
  bindProductListActions();
  // Re-price the cards when the visitor's currency is detected or changed.
  LyrLocale.onChange(() => { if (productsLoaded) refreshListing(); });
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
  loadProducts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStorefront);
} else {
  initStorefront();
}
