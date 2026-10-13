// My Lyrshop: an Activity tab (summary, recently viewed, purchases, watchlist) and an Account tab, switched by URL hash.
const MY_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
const MY_PLACEHOLDER_IMAGE_URL = "logo.svg";
const SUMMARY_ORDER_COUNT = 3;
const SUMMARY_ITEM_COUNT = 6;
const SECTIONS = ["summary", "recently-viewed", "purchases", "watchlist", "account"];

const user = getCurrentUser();
let myOrders = null;
let ordersError = "";
let productsById = new Map();

function myEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(seconds) {
  return seconds
    ? new Date(seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";
}

function productUrl(id) {
  return `product.html?id=${encodeURIComponent(id)}`;
}

// ── Sections ───────────────────────────────────────────────────────────────────

function currentSection() {
  const hash = window.location.hash.slice(1);
  return SECTIONS.includes(hash) ? hash : "summary";
}

function showSection() {
  const section = currentSection();
  const isAccount = section === "account";
  document.querySelectorAll("[data-section]").forEach((element) => {
    element.hidden = element.dataset.section !== section;
  });
  document.querySelectorAll("[data-section-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.sectionLink === section);
    if (link.dataset.sectionLink === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    const active = (tab.dataset.tab === "account") === isAccount;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  document.getElementById("my-sidebar").hidden = isAccount;
}

// ── Purchases ──────────────────────────────────────────────────────────────────

// One row per product with a quantity; the order keeps one entry per unit.
function groupItems(items) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const key = String(item.id ?? item.name);
    const group = groups.get(key) || { ...item, quantity: 0 };
    group.quantity += 1;
    groups.set(key, group);
  });
  return [...groups.values()];
}

function deliveryLine(order) {
  const status = order.fulfillment_status || "unfulfilled";
  if (order.payment_status === "refunded") return "Refunded";
  if (order.payment_status === "failed") return "Payment failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "delivered") return `Delivered ${formatDate(order.delivered_at)}`.trim();
  if (status === "shipped") return `Shipped ${formatDate(order.shipped_at)}`.trim();
  if (status === "processing") return "Preparing to ship";
  if (order.payment_status === "pending") return "Awaiting payment confirmation";
  return `Ships in ${order.shipping_estimate || "3-5 business days"}`;
}

function statusTone(order) {
  if (order.payment_status === "refunded" || order.payment_status === "failed" || order.fulfillment_status === "cancelled") return "is-closed";
  if (order.payment_status === "pending" || order.payment_status === "authorized") return "is-waiting";
  return "";
}

function renderOrder(order) {
  const items = groupItems(order.items);
  const first = items[0] || {};
  const image = productsById.get(String(first.id))?.image_url || MY_PLACEHOLDER_IMAGE_URL;
  const others = items.length - 1;
  const tracking = order.tracking_number
    ? `<p class="my-order-tracking">${myEscape(order.shipping_carrier || "Tracking")} <strong>${myEscape(order.tracking_number)}</strong></p>`
    : "";
  return `
    <article class="my-order">
      <div class="my-order-meta">
        <span>Order date <strong>${myEscape(formatDate(order.created_at))}</strong></span>
        <span>Order total <strong>${money(order.total)}</strong></span>
        <span>Order number <strong>${myEscape(String(order.id).slice(0, 8).toUpperCase())}</strong></span>
      </div>
      <div class="my-order-body">
        <a class="my-thumb" href="${first.id ? productUrl(first.id) : "#purchases"}">
          <img src="${myEscape(image)}" alt="" loading="lazy" />
        </a>
        <div class="my-order-info">
          <p class="my-order-status ${statusTone(order)}">${myEscape(deliveryLine(order))}</p>
          <p>
            <a href="${first.id ? productUrl(first.id) : "#purchases"}">${myEscape(first.name || "Order")}</a>
            ${first.quantity > 1 ? `<span class="my-muted">× ${first.quantity}</span>` : ""}
          </p>
          ${others > 0 ? `<p class="my-muted">and ${others} more item${others === 1 ? "" : "s"}</p>` : ""}
          ${tracking}
        </div>
        <div class="my-order-badges">
          <span class="status-badge status-payment-${myEscape(order.payment_status || "pending")}">${myEscape(order.payment_status || "pending")}</span>
          <span class="status-badge status-shipping-${myEscape(order.fulfillment_status || "unfulfilled")}">${myEscape(order.fulfillment_status || "unfulfilled")}</span>
        </div>
      </div>
    </article>`;
}

function renderOrders(target, limit) {
  const element = document.getElementById(target);
  if (myOrders === null) {
    element.innerHTML = `<p class="my-empty">${ordersError ? myEscape(ordersError) : "Loading your purchases…"}</p>`;
    return;
  }
  if (!myOrders.length) {
    element.innerHTML = `<p class="my-empty">You haven't bought anything yet. <a href="index.html">Start shopping</a></p>`;
    return;
  }
  element.innerHTML = myOrders.slice(0, limit).map(renderOrder).join("");
}

async function loadOrders() {
  try {
    myOrders = (await authApi("/orders/mine")).orders || [];
  } catch (error) {
    if (error.status === 401) {
      clearCurrentUser();
      window.location.href = "auth.html";
      return;
    }
    ordersError = error.message;
  }
  renderAll();
}

// ── Watchlist and recently viewed ──────────────────────────────────────────────

function renderItem(product, { removable }) {
  return `
    <article class="my-item">
      <a class="my-item-image" href="${productUrl(product.id)}">
        <img src="${myEscape(product.image_url || MY_PLACEHOLDER_IMAGE_URL)}" alt="" loading="lazy" />
      </a>
      <a class="my-item-name" href="${productUrl(product.id)}">${myEscape(product.name)}</a>
      <span class="my-item-price">${money(product.price)}</span>
      ${removable ? `<button type="button" class="link-button" data-unwatch="${myEscape(product.id)}">Remove</button>` : ""}
    </article>`;
}

function renderItems(target, ids, { limit, removable, emptyText }) {
  const element = document.getElementById(target);
  if (!productsById.size && ids.length) {
    element.innerHTML = `<p class="my-empty">Loading…</p>`;
    return;
  }
  // Items that were deleted or unpublished since are skipped.
  const products = ids.map((id) => productsById.get(String(id))).filter(Boolean).slice(0, limit);
  element.innerHTML = products.length
    ? products.map((product) => renderItem(product, { removable })).join("")
    : `<p class="my-empty">${emptyText}</p>`;
}

async function loadProducts() {
  try {
    const response = await fetch(`${MY_API_BASE_URL}/products`);
    const products = (await response.json()).products || [];
    productsById = new Map(products.map((product) => [String(product.id), product]));
  } catch (error) {
    console.warn("Product request failed.", error);
  }
  renderAll();
}

// ── Page ───────────────────────────────────────────────────────────────────────

function renderAll() {
  const watchEmpty = `Nothing saved yet. Tap the heart on any item to watch it. <a href="index.html">Browse items</a>`;
  const recentEmpty = `Items you look at will show up here. <a href="index.html">Browse items</a>`;
  // The watchlist is stored oldest first; show the newest saves first.
  const watchlist = getWatchlist().slice().reverse();
  renderOrders("summary-purchases", SUMMARY_ORDER_COUNT);
  renderOrders("purchase-list", Infinity);
  renderItems("summary-watchlist", watchlist, { limit: SUMMARY_ITEM_COUNT, removable: false, emptyText: watchEmpty });
  renderItems("watchlist-list", watchlist, { limit: Infinity, removable: true, emptyText: watchEmpty });
  renderItems("summary-recent", getRecentlyViewed(), { limit: SUMMARY_ITEM_COUNT, removable: false, emptyText: recentEmpty });
  renderItems("recent-list", getRecentlyViewed(), { limit: Infinity, removable: false, emptyText: recentEmpty });
  document.getElementById("clear-recent").hidden = !getRecentlyViewed().length;
}

function renderProfile(account) {
  const roleLabels = { superadmin: "Super admin", admin: "Admin", user: "Customer" };
  document.getElementById("my-greeting").textContent = `Hi, ${account.name}`;
  document.getElementById("profile-name").textContent = account.name;
  document.getElementById("profile-email").textContent = getAccountContact(account);
  document.getElementById("profile-provider").textContent = account.provider || "—";
  document.getElementById("profile-role").textContent = roleLabels[account.role] || "Customer";
}

if (!user) {
  window.location.href = "auth.html";
} else {
  renderProfile(user);
  // The role can change after sign-in (the super admin grants or removes admin access).
  refreshCurrentUser().then((fresh) => fresh && renderProfile(fresh));

  showSection();
  renderAll();
  loadOrders();
  loadProducts();

  window.addEventListener("hashchange", () => {
    showSection();
    window.scrollTo({ top: 0 });
  });
  document.querySelector(".my-content").addEventListener("click", (event) => {
    const unwatch = event.target.closest("[data-unwatch]");
    if (unwatch) {
      toggleWatchlist(unwatch.dataset.unwatch);
      renderAll();
    }
  });
  document.getElementById("clear-recent").addEventListener("click", () => {
    clearRecentlyViewed();
    renderAll();
  });
  document.getElementById("logout-button").addEventListener("click", () => {
    clearCurrentUser();
    window.location.href = "index.html";
  });
}
