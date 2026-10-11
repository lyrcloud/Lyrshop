// Shared storefront interactions for index.html and product.html: toasts, watchlist, cart badge,
// back-to-top and the "/" search shortcut. Loaded after auth.js and before the page script.
const WATCHLIST_KEY = "lyrshopWatchlist";
const CART_KEY = "shopCart";

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

function updateHeaderCounts() {
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
    const q = query.toLowerCase();
    const category = select.value;
    const products = getProducts()
      .filter((p) => (!category || p.category === category)
        && [p.name, p.brand].some((field) => String(field || "").toLowerCase().includes(q)))
      .slice(0, 6);
    const brands = [...new Set(getProducts().map((p) => p.brand).filter((b) => b && b.toLowerCase().includes(q)))].slice(0, 3);
    const categories = getCategories().filter((c) => c.label.toLowerCase().includes(q)).slice(0, 3);

    const rows = [
      ...products.map((p) => ({ kind: "Product", label: p.name, meta: `$${Number(p.price).toFixed(2)}`,
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

  return {
    setCategory(value) { select.value = value || ""; },
    setQuery(value) { input.value = value; clear.hidden = !value; },
  };
}

function initSharedUi() {
  updateHeaderCounts();
  initBackToTop();
  initSearchShortcut();
  // Keep counts in sync when the cart or watchlist changes in another tab.
  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY || event.key === WATCHLIST_KEY) updateHeaderCounts();
  });
}

initSharedUi();
