// Shared storefront interactions for index.html and product.html: toasts, watchlist, cart badge,
// back-to-top and the "/" search shortcut. Loaded after auth.js and before the page script.
const WATCHLIST_KEY = "lyrshopWatchlist";
const CART_KEY = "shopCart";

// The storefront as this shopper sees it: the server adds regional prices and nearby/price_fit ranking for the
// country (CloudFront's guess when /locale hasn't answered yet). Pass a country to override, e.g. the cart's ship-to.
// query adds "view=cards" (listings trimmed for product cards) or "ids=a,b" (just those listings, in full).
function shopperProductsUrl(apiBase, country, query = "") {
  return `${apiBase}/products?country=${encodeURIComponent(country || LyrLocale.country() || "auto")}${query ? `&${query}` : ""}`;
}

// "Mumbai, India" for a product's {country, city}; listings from before item locations were all from the US.
function itemLocationLabel(product) {
  return [product.location?.city, LyrLocale.countryName(product.location?.country || "US")].filter(Boolean).join(", ");
}

// What a shopper pays now. While a sales-calendar event is open the server adds event_price to the trending and new
// listings it discounts; otherwise it is the seller's price with their optional "was" price.
// ── Condition and selling format (eBay-style; see backend/market_core.py) ───────
const CONDITION_LABELS = {
  new: "New", open_box: "Open box", new_defects: "New with defects", certified_refurbished: "Certified - Refurbished",
  excellent_refurbished: "Excellent - Refurbished", very_good_refurbished: "Very Good - Refurbished",
  good_refurbished: "Good - Refurbished", seller_refurbished: "Seller refurbished", used_excellent: "Used - Excellent",
  used_good: "Used - Good", used_fair: "Used - Fair", for_parts: "For parts or not working",
};

// Listings from before conditions were recorded were all new stock.
function conditionLabel(product) {
  return CONDITION_LABELS[product?.condition] || "New";
}

// The filter groups eBay shows: New, Open box, Refurbished, Used, For parts.
function conditionGroup(product) {
  const condition = product?.condition || "new";
  if (condition === "new" || condition === "new_defects") return "new";
  if (condition.endsWith("refurbished")) return "refurbished";
  if (condition.startsWith("used")) return "used";
  return condition;
}

function isAuctionListing(product) {
  return product?.format === "auction" && Boolean(product.auction);
}

function auctionLive(product) {
  return isAuctionListing(product) && product.auction.status === "live" && Number(product.auction.ends_at) * 1000 > Date.now();
}

// "2d 4h", "3h 12m", "45m 10s", or "Ended".
function auctionTimeLeft(endsAt) {
  const seconds = Math.max(0, Math.floor(Number(endsAt) - Date.now() / 1000));
  if (!seconds) return "Ended";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function listingPrices(product) {
  if (isAuctionListing(product)) {
    // Auctions show and sort by the current bid; Buy It Now (if still open) is shown separately.
    return { price: Number(product.auction.current_price || product.auction.start_price || product.price), original_price: 0, sale_event: "" };
  }
  const price = Number(product.price);
  const eventPrice = Number(product.event_price);
  if (eventPrice > 0 && eventPrice < price) {
    return { price: eventPrice, original_price: Number(product.event_was_price) || price, sale_event: product.event_name || "" };
  }
  // Only a real seller-set "was" price is shown; never invent a discount.
  return { price, original_price: Number(product.compare_at_price) || 0, sale_event: product.sale_event || "" };
}

// "Oct 31" for a calendar date like "2026-10-31" (the sales calendar runs on UTC days).
function formatEventDate(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

// "3 days" or "5 hours" until the end of a UTC calendar day.
function timeUntilEndOf(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  const hours = Math.max(1, Math.ceil((Date.UTC(year, month - 1, day + 1) - Date.now()) / 3600000));
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${Math.floor(hours / 24)} days`;
}

// Affiliate links (lyrshop.com/?ref=CODE) credit the referrer for orders placed within REFERRAL_DAYS.
const REFERRAL_KEY = "lyrshopReferral";
const REFERRAL_DAYS = 30;

function captureReferral() {
  const code = new URLSearchParams(window.location.search).get("ref");
  if (!code || !/^[A-Za-z0-9]{4,16}$/.test(code)) return;
  try {
    localStorage.setItem(REFERRAL_KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
  } catch { /* storage blocked */ }
}

function readReferral() {
  try {
    const saved = JSON.parse(localStorage.getItem(REFERRAL_KEY) || "null");
    return saved && Date.now() - saved.at < REFERRAL_DAYS * 86400000 ? saved.code : "";
  } catch {
    return "";
  }
}

captureReferral();

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getWatchlist() {
  return readStoredList(WATCHLIST_KEY);
}

function isWatched(productId) {
  return getWatchlist().includes(String(productId));
}

// Adds or removes the product and returns whether it is now on the watchlist.
function toggleWatchlist(productId) {
  const id = String(productId);
  const list = getWatchlist();
  const watched = !list.includes(id);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watched ? [...list, id] : list.filter((item) => item !== id)));
  updateHeaderCounts();
  syncWatchInterest();
  return watched;
}

// ── Email updates ────────────────────────────────────────────────────────────
// Signed-in shoppers' searches and watchlist go to their account, so the daily email can tell them about new matching
// listings, price drops and watched auctions ending soon (they can switch it off in Account → Email preferences).

function signedInForInterests() {
  return typeof getCurrentUser === "function" && typeof authApi === "function" && getCurrentUser()?.token;
}

let watchSyncTimer = null;
function syncWatchInterest() {
  if (!signedInForInterests()) return;
  window.clearTimeout(watchSyncTimer);
  watchSyncTimer = window.setTimeout(() => {
    authApi("/market/interests", { method: "POST", body: { watch: getWatchlist() } }).catch(() => {});
  }, 1500);
}

const SEARCH_REPORTED_KEY = "lyrshopSearchReported";
function recordSearchInterest(query) {
  const q = String(query || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2 || !signedInForInterests()) return;
  try {
    // Each search is sent once per browser session.
    const sent = JSON.parse(sessionStorage.getItem(SEARCH_REPORTED_KEY) || "[]");
    if (sent.includes(q)) return;
    sessionStorage.setItem(SEARCH_REPORTED_KEY, JSON.stringify([...sent, q].slice(-50)));
  } catch (error) { /* storage blocked: send anyway */ }
  authApi("/market/interests", { method: "POST", body: { search: q } }).catch(() => {});
}

const RECENTLY_VIEWED_KEY = "lyrshopRecentlyViewed";
const RECENTLY_VIEWED_LIMIT = 24;

// Newest first; viewing an item again moves it back to the front.
function getRecentlyViewed() {
  return readStoredList(RECENTLY_VIEWED_KEY);
}

function recordRecentlyViewed(productId) {
  const id = String(productId);
  const list = [id, ...getRecentlyViewed().filter((item) => item !== id)].slice(0, RECENTLY_VIEWED_LIMIT);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
}

function clearRecentlyViewed() {
  localStorage.removeItem(RECENTLY_VIEWED_KEY);
}

// ── Live shopper counts ──────────────────────────────────────────────────────────
// Product pages show how many people are viewing a listing and how many carts hold it. Each browser gets an anonymous
// random visitor id; every page reports which listings joined or left its cart (POST /products/cart-presence).

const VISITOR_KEY = "lyrshopVisitor";
const CART_REPORTED_KEY = "lyrshopCartReported";
const CART_REPORT_REFRESH_MS = 3 * 24 * 60 * 60 * 1000; // The server forgets carts after a week, so re-report sooner.
const UI_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname) ? "http://127.0.0.1:5000" : "";

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id || "")) {
      id = window.crypto?.randomUUID?.() || `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function cartProductIds() {
  return [...new Set(readStoredList(CART_KEY).map((item) => String(item?.id || "")).filter(Boolean))];
}

const reportCartPresence = debounce(async () => {
  const visitor = visitorId();
  if (!visitor) return;
  const current = cartProductIds();
  let reported = { ids: [], at: 0 };
  try {
    reported = { ...reported, ...JSON.parse(localStorage.getItem(CART_REPORTED_KEY) || "{}") };
  } catch { /* Report everything again. */ }
  const stale = Date.now() - Number(reported.at || 0) > CART_REPORT_REFRESH_MS;
  const add = stale ? current : current.filter((id) => !reported.ids.includes(id));
  const remove = (reported.ids || []).filter((id) => !current.includes(id));
  if (!add.length && !remove.length) return;
  try {
    const response = await fetch(`${UI_API_BASE_URL}/products/cart-presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor, add, remove }),
      keepalive: true,
    });
    if (response.ok && (response.headers.get("Content-Type") || "").includes("application/json")) {
      localStorage.setItem(CART_REPORTED_KEY, JSON.stringify({ ids: current, at: stale ? Date.now() : reported.at || Date.now() }));
    }
  } catch { /* Counts are a nicety; try again on the next change or page. */ }
}, 800);

function updateHeaderCounts() {
  reportCartPresence();
  const counts = { cart: readStoredList(CART_KEY).length, watchlist: getWatchlist().length };
  document.querySelectorAll("[data-count]").forEach((badge) => {
    const count = counts[badge.dataset.count] || 0;
    const previous = badge.textContent;
    badge.textContent = count;
    badge.hidden = count === 0;
    if (previous !== String(count) && count > 0) {
      badge.classList.remove("count-bump");
      void badge.offsetWidth; // Restart the bump animation.
      badge.classList.add("count-bump");
    }
  });
}

// Five stars for a 0-5 score. Hovering or focusing lights them in a wave and shows the exact score.
function ratingStars(score, { label = "out of 5" } = {}) {
  const value = Math.max(0, Math.min(5, Number(score) || 0));
  const filled = Math.round(value);
  const text = `${value.toFixed(1)} ${label}`;
  const stars = Array.from({ length: 5 }, (_, index) =>
    `<span class="star${index < filled ? " is-full" : ""}" style="--star: ${index}" aria-hidden="true">\u2605</span>`).join("");
  return `<span class="rating-stars" tabindex="0" role="img" aria-label="Rated ${text}" data-tip="${text}">${stars}</span>`;
}

function showToast(message, { tone = "success", actionLabel, actionHref } = {}) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.className = "toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  if (actionLabel && actionHref) {
    const link = document.createElement("a");
    link.href = actionHref;
    link.textContent = actionLabel;
    toast.appendChild(link);
  }
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  window.setTimeout(() => {
    toast.classList.remove("toast-visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function initBackToTop() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.setAttribute("aria-label", "Back to top");
  button.innerHTML = "&#8593;";
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(button);
  const update = () => button.classList.toggle("back-to-top-visible", window.scrollY > 600);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

// Press "/" anywhere outside a text field to jump to the search box.
function initSearchShortcut() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const search = document.querySelector(".search-bar input");
    if (!search) return;
    event.preventDefault();
    search.focus();
    search.select();
  });
}

function uiEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]);
}

function highlightMatch(text, query) {
  const safe = uiEscape(text);
  if (!query) return safe;
  const index = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return safe;
  return `${uiEscape(text.slice(0, index))}<mark>${uiEscape(text.slice(index, index + query.length))}</mark>${uiEscape(text.slice(index + query.length))}`;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

/**
 * Wires a .search-bar form: category dropdown, clear button, suggestions with keyboard navigation.
 * getProducts/getCategories supply data lazily; onChange (optional) runs as the shopper types,
 * onSubmit runs on Enter/Search without a highlighted suggestion.
 */
// Words people say or type around what they want ("show me red shoes"); ignored when matching.
const SEARCH_FILLER_WORDS = new Set(["a", "an", "the", "some", "any", "me", "my", "i", "i'm", "im", "want", "need",
  "looking", "look", "for", "find", "search", "show", "get", "buy", "please", "to", "of", "can", "you"]);

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

// Splits a query into words to match; each word also matches its singular ("backpacks" finds "backpack").
function getSearchTerms(query) {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  const meaningful = words.filter((word) => !SEARCH_FILLER_WORDS.has(word));
  return (meaningful.length ? meaningful : words).map((word) => {
    const forms = [word];
    if (word.length > 4 && word.endsWith("es")) forms.push(word.slice(0, -2));
    if (word.length > 3 && word.endsWith("s")) forms.push(word.slice(0, -1));
    return forms;
  });
}

// True when every search word appears somewhere in the given fields.
function matchesSearch(fields, terms) {
  if (!terms.length) return true;
  const text = ` ${normalizeSearchText(fields.join(" "))} `;
  return terms.every((forms) => forms.some((form) => text.includes(form)));
}

function productSearchFields(product) {
  return [product.name, product.brand, product.description, product.category, product.subcategory];
}

const VOICE_ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser to search by voice.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser to search by voice.",
  "no-speech": "Didn't catch that. Tap the microphone and try again.",
  "audio-capture": "No microphone found.",
  network: "Voice search needs an internet connection.",
};

// Adds a microphone button that fills the search box from speech, then runs the search.
// Hidden in browsers without the Web Speech API (e.g. Firefox).
function initVoiceSearch(form, input, onFinal) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  const field = form.querySelector(".search-field");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "search-voice";
  button.setAttribute("aria-label", "Search by voice");
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>`;
  field.classList.add("has-voice");
  field.appendChild(button);

  let recognition = null;
  const placeholder = input.placeholder;

  function setListening(listening) {
    button.classList.toggle("is-listening", listening);
    button.setAttribute("aria-pressed", String(listening));
    button.setAttribute("aria-label", listening ? "Stop voice search" : "Search by voice");
    input.placeholder = listening ? "Listening…" : placeholder;
  }

  button.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
      return;
    }
    recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let transcript = "";

    recognition.addEventListener("result", (event) => {
      // Dictation often ends with a period ("Backpacks."); keep the box clean.
      transcript = [...event.results].map((result) => result[0].transcript).join("").trim().replace(/[.!?]+$/, "");
      input.value = transcript;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    recognition.addEventListener("error", (event) => {
      if (event.error !== "aborted") showToast(VOICE_ERRORS[event.error] || "Voice search stopped. Please try again.");
    });
    recognition.addEventListener("end", () => {
      recognition = null;
      setListening(false);
      if (transcript) onFinal(transcript);
    });

    setListening(true);
    try {
      recognition.start();
    } catch {
      recognition = null;
      setListening(false);
    }
  });
}

function initSearchBox({ form, getProducts, getCategories, onChange, onSubmit, initialQuery = "", initialCategory = "" }) {
  const input = form.querySelector("input");
  const clear = form.querySelector(".search-clear");
  const select = form.querySelector(".search-category");
  const list = form.querySelector(".search-suggestions");
  let activeIndex = -1;

  select.innerHTML = `<option value="">All Categories</option>${getCategories()
    .map((category) => `<option value="${uiEscape(category.name)}">${uiEscape(category.label)}</option>`).join("")}`;
  input.value = initialQuery;
  select.value = initialCategory;
  clear.hidden = !input.value;

  const options = () => [...list.querySelectorAll("[role='option']")];

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function setActive(index) {
    const items = options();
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((item, i) => item.setAttribute("aria-selected", String(i === activeIndex)));
    input.setAttribute("aria-activedescendant", items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function renderSuggestions() {
    const query = input.value.trim();
    if (query.length < 2) {
      close();
      return;
    }
    const terms = getSearchTerms(query);
    const category = select.value;
    const products = getProducts()
      .filter((p) => (!category || p.category === category) && matchesSearch(productSearchFields(p), terms))
      .slice(0, 6);
    const brands = [...new Set(getProducts().map((p) => p.brand).filter((b) => b && matchesSearch([b], terms)))].slice(0, 3);
    const categories = getCategories().filter((c) => matchesSearch([c.label, c.name], terms)).slice(0, 3);

    const rows = [
      ...products.map((p) => ({ kind: "Product", label: p.name, meta: formatPrice(p.price),
        href: `product.html?id=${encodeURIComponent(p.id)}`, image: p.image_url })),
      ...brands.map((b) => ({ kind: "Brand", label: b, href: `brands.html?b=${encodeURIComponent(b)}` })),
      ...categories.map((c) => ({ kind: "Category", label: c.label, href: `index.html?category=${encodeURIComponent(c.name)}#product-list` })),
    ];
    list.innerHTML = rows.length
      ? rows.map((row, i) => `
        <li role="option" id="suggestion-${i}" aria-selected="false" data-href="${uiEscape(row.href)}">
          ${row.image ? `<img src="${uiEscape(row.image)}" alt="" loading="lazy" />` : `<span class="suggestion-icon" aria-hidden="true">${row.kind === "Brand" ? "★" : "▦"}</span>`}
          <span class="suggestion-label">${highlightMatch(row.label, query)}</span>
          <span class="suggestion-meta">${uiEscape(row.meta || row.kind)}</span>
        </li>`).join("")
      : `<li class="suggestion-empty">No matches for "${uiEscape(query)}" yet</li>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activeIndex = -1;
  }

  const notifyChange = debounce(() => onChange && onChange(input.value.trim(), select.value), 180);
  const suggest = debounce(renderSuggestions, 120);

  input.addEventListener("input", () => {
    clear.hidden = !input.value;
    suggest();
    notifyChange();
  });
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2) renderSuggestions(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (list.hidden) renderSuggestions(); setActive(activeIndex + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(activeIndex - 1); }
    else if (event.key === "Escape") { close(); }
  });
  list.addEventListener("mousedown", (event) => {
    const item = event.target.closest("[data-href]");
    if (!item) return;
    event.preventDefault();
    window.location.href = item.dataset.href;
  });
  select.addEventListener("change", () => {
    if (onChange) onChange(input.value.trim(), select.value);
    if (!list.hidden) renderSuggestions();
  });
  clear.addEventListener("click", () => {
    input.value = "";
    clear.hidden = true;
    close();
    if (onChange) onChange("", select.value);
    input.focus();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const active = options()[activeIndex];
    if (active) {
      window.location.href = active.dataset.href;
      return;
    }
    close();
    onSubmit(input.value.trim(), select.value);
  });
  document.addEventListener("click", (event) => { if (!form.contains(event.target)) close(); });
  initVoiceSearch(form, input, () => {
    close();
    onSubmit(input.value.trim(), select.value);
  });

  return {
    setCategory(value) { select.value = value || ""; },
    setQuery(value) { input.value = value; clear.hidden = !value; },
  };
}

// A round profile photo, or the first letter of the name when there is none.
function userAvatar(user, className = "user-avatar") {
  const name = String(user?.name || "?").trim();
  return user?.photo_url
    ? `<img class="${className}" src="${uiEscape(user.photo_url)}" alt="" />`
    : `<span class="${className} is-initial" aria-hidden="true">${uiEscape(name.charAt(0).toUpperCase() || "?")}</span>`;
}

// The top bar's greeting: "Hi! Sign in or register", or the signed-in shopper's photo and first name.
function renderUserGreeting() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  document.querySelectorAll("[data-user-greeting]").forEach((slot) => {
    slot.innerHTML = user
      ? `<a href="dashboard.html#account" class="utility-user">${userAvatar(user)}Hi, ${uiEscape(String(user.name || "there").split(" ")[0])}</a>`
      : `Hi! <a href="auth.html">Sign in</a> or <a href="auth.html">register</a>`;
  });
}

const DRAWER_ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  watch: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  offer: '<path d="M4 12l8-8h8v8l-8 8z"/><circle cx="16" cy="8" r="1.4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  sell: '<path d="M4 7h16v13H4z"/><path d="M4 7l2-3h12l2 3"/><path d="M10 11h4"/>',
  star: '<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
  gift: '<path d="M4 10h16v10H4z"/><path d="M3 7h18v3H3z"/><path d="M12 7v13"/><path d="M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  deals: '<path d="M5 19L19 5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  brands: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  card: '<path d="M3 6h18v12H3z"/><path d="M3 10h18"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12h11.2L21 7H6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17" r=".6"/>',
  out: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
};

function drawerIcon(name) {
  return `<svg class="drawer-icon" viewBox="0 0 24 24" aria-hidden="true">${DRAWER_ICONS[name]}</svg>`;
}

// The signed-in shopper's side menu, like the eBay app's: profile on top, then shopping, account and help links.
function initAccountDrawer() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const logoLink = document.querySelector("header .logo")?.closest("a");
  if (!user || !logoLink || document.getElementById("account-drawer")) return;

  const firstName = String(user.name || "there").split(" ")[0];
  const staff = typeof isStaffRole === "function" && isStaffRole(user.role);
  const item = (href, icon, label, badge = "") => `<a href="${href}" class="drawer-link">${drawerIcon(icon)}<span>${label}</span>${badge}</a>`;
  const groups = [
    [
      item("index.html", "home", "Home"),
      item("index.html?view=watchlist#product-list", "watch", "Saved", '<span class="count-badge" data-count="watchlist" hidden></span>'),
      item("dashboard.html#purchases", "bag", "Purchases"),
      item("dashboard.html#offers", "offer", "Bids &amp; offers"),
      item("dashboard.html#recently-viewed", "clock", "Recently viewed"),
      item("admin.html", "sell", "Selling"),
    ],
    [
      item("index.html?view=deals#product-list", "deals", "Deals"),
      item("brands.html", "brands", "Brands"),
      '<button type="button" class="drawer-link" data-drawer-categories>' + drawerIcon("grid") + "<span>Categories</span></button>",
      item("giftcards.html", "card", "Gift cards"),
      item("cart.html", "cart", "Cart", '<span class="count-badge" data-count="cart" hidden></span>'),
    ],
    [
      item("dashboard.html#rewards", "star", "Rewards &amp; badges"),
      item("dashboard.html#gift-cards", "gift", "My gift cards"),
      item("dashboard.html#affiliate", "link", "Affiliate"),
      item("dashboard.html#account", "gear", "Settings"),
      staff ? item("admin.html", "shield", "Admin") : "",
      item("dashboard.html", "help", "Help &amp; orders"),
      '<button type="button" class="drawer-link" data-drawer-signout>' + drawerIcon("out") + "<span>Sign out</span></button>",
    ],
  ];

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "drawer-toggle";
  toggle.setAttribute("aria-label", "Open menu");
  toggle.setAttribute("aria-controls", "account-drawer");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const brand = document.createElement("div");
  brand.className = "drawer-brand";
  logoLink.replaceWith(brand);
  brand.append(toggle, logoLink);

  const scrim = document.createElement("div");
  scrim.className = "drawer-scrim";
  scrim.hidden = true;
  const drawer = document.createElement("aside");
  drawer.id = "account-drawer";
  drawer.className = "account-drawer";
  drawer.setAttribute("aria-label", "My Lyrshop menu");
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="drawer-profile">
      ${userAvatar(user, "drawer-avatar")}
      <div>
        <strong>Hi, ${uiEscape(firstName)}</strong>
        <a href="dashboard.html#account">View account</a>
      </div>
      <button type="button" class="drawer-close" aria-label="Close menu">&times;</button>
    </div>
    <nav class="drawer-nav">${groups.map((links) => `<div class="drawer-group">${links.join("")}</div>`).join("")}</nav>
  `;
  document.body.append(scrim, drawer);

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-open", open);
    if (open) {
      scrim.hidden = false;
      drawer.hidden = false;
      void drawer.offsetWidth; // Start the slide-in from the closed position.
      drawer.classList.add("is-open");
      drawer.querySelector(".drawer-close").focus({ preventScroll: true });
    } else {
      drawer.classList.remove("is-open");
      scrim.hidden = true;
      window.setTimeout(() => { if (!drawer.classList.contains("is-open")) drawer.hidden = true; }, 250);
    }
  };
  toggle.addEventListener("click", () => setOpen(true));
  scrim.addEventListener("click", () => setOpen(false));
  drawer.querySelector(".drawer-close").addEventListener("click", () => { setOpen(false); toggle.focus(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
  });
  // Same-page links (dashboard sections) only change the hash, so close the menu for them too.
  drawer.querySelectorAll("a.drawer-link").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  const signOut = () => {
    if (typeof clearCurrentUser === "function") clearCurrentUser();
    window.location.href = "index.html";
  };
  const openCategories = (event) => {
    // Without this the category panel's outside-click handler would close the panel straight away.
    event.stopPropagation();
    setOpen(false);
    const menuButton = document.getElementById("category-menu-button");
    if (menuButton) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      menuButton.click();
    }
    else window.location.href = "index.html#product-list";
  };
  drawer.querySelector("[data-drawer-categories]").addEventListener("click", openCategories);
  drawer.querySelector("[data-drawer-signout]").addEventListener("click", signOut);
  initAccountRail(user, { openMenu: () => setOpen(true), openCategories, signOut });
}

// Which rail link matches the page being viewed: the file name, plus ?view= on the home page or the #section on My Lyrshop.
function railLinkIsCurrent(href) {
  const target = new URL(href, window.location.href);
  const page = (path) => path.split("/").pop() || "index.html";
  if (page(target.pathname) !== page(window.location.pathname)) return false;
  const view = new URLSearchParams(window.location.search).get("view") || "";
  if (page(target.pathname) === "index.html") return (target.searchParams.get("view") || "") === view;
  if (page(target.pathname) === "dashboard.html") {
    const hash = window.location.hash.slice(1) || "summary";
    return (target.hash.slice(1) || "summary") === hash;
  }
  return true;
}

// A slim rail fixed to the left edge on wider screens (phones keep the slide-out menu): icons with short labels.
function initAccountRail(user, { openMenu, openCategories, signOut }) {
  const link = (href, icon, label, badge = "") =>
    `<a href="${href}" class="rail-link" title="${label}">${drawerIcon(icon)}<span class="rail-label">${label}</span>${badge}</a>`;
  const button = (action, icon, label) =>
    `<button type="button" class="rail-link" data-rail="${action}" title="${label}">${drawerIcon(icon)}<span class="rail-label">${label}</span></button>`;
  const rail = document.createElement("nav");
  rail.className = "account-rail";
  rail.setAttribute("aria-label", "My Lyrshop shortcuts");
  rail.innerHTML = `
    <button type="button" class="rail-menu" data-rail="menu" aria-label="Open full menu" aria-controls="account-drawer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <a href="dashboard.html#account" class="rail-profile" title="My account">${userAvatar(user, "rail-avatar")}</a>
    <div class="rail-links">
      ${link("index.html", "home", "Home")}
      ${link("index.html?view=watchlist#product-list", "watch", "Saved", '<span class="count-badge rail-badge" data-count="watchlist" hidden></span>')}
      ${link("dashboard.html#purchases", "bag", "Orders")}
      ${link("dashboard.html#offers", "offer", "Offers")}
      ${link("admin.html", "sell", "Selling")}
      ${link("index.html?view=deals#product-list", "deals", "Deals")}
      ${button("categories", "grid", "Browse")}
      ${link("cart.html", "cart", "Cart", '<span class="count-badge rail-badge" data-count="cart" hidden></span>')}
    </div>
    <div class="rail-links rail-bottom">
      ${link("dashboard.html#account", "gear", "Settings")}
      ${button("signout", "out", "Sign out")}
    </div>
  `;
  const markCurrent = () => rail.querySelectorAll("a.rail-link").forEach((anchor) => {
    const current = railLinkIsCurrent(anchor.getAttribute("href"));
    anchor.classList.toggle("is-current", current);
    if (current) anchor.setAttribute("aria-current", "page");
    else anchor.removeAttribute("aria-current");
  });
  markCurrent();
  window.addEventListener("hashchange", markCurrent);
  rail.querySelector('[data-rail="menu"]').addEventListener("click", openMenu);
  rail.querySelector('[data-rail="categories"]').addEventListener("click", openCategories);
  rail.querySelector('[data-rail="signout"]').addEventListener("click", signOut);
  document.body.prepend(rail);
  document.body.classList.add("has-account-rail");
}

function initSharedUi() {
  initAccountDrawer();
  updateHeaderCounts();
  renderUserGreeting();
  initBackToTop();
  initSearchShortcut();
  // Keep counts in sync when the cart or watchlist changes in another tab.
  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY || event.key === WATCHLIST_KEY) updateHeaderCounts();
  });
}

initSharedUi();
