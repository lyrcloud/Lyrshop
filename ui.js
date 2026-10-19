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
function listingPrices(product) {
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
  return watched;
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
      ...brands.map((b) => ({ kind: "Brand", label: b, href: `index.html?view=brands&brand=${encodeURIComponent(b)}#product-list` })),
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

function initSharedUi() {
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
