// My Lyrshop: an Activity tab (summary, recently viewed, purchases, watchlist) and an Account tab, switched by URL hash.
const MY_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
const MY_PLACEHOLDER_IMAGE_URL = "logo.svg";
const SUMMARY_ORDER_COUNT = 3;
const SUMMARY_ITEM_COUNT = 6;
const SECTIONS = ["summary", "recently-viewed", "purchases", "watchlist", "offers", "rewards", "gift-cards", "affiliate", "quotes", "account"];

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
  return formatPrice(value);
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

// ── Rewards, gift cards and affiliate ───────────────────────────────────────────
// All from GET /rewards/me; points and badges change only when the server confirms a payment.

let rewards = null;

const BADGE_ICONS = {
  "first-purchase": "&#128717;", "loyal-shopper": "&#128150;", "big-spender": "&#128142;", "first-sale": "&#127991;",
  "rising-seller": "&#128200;", "power-seller": "&#9889;", "affiliate": "&#129309;", "super-affiliate": "&#127942;",
  "gift-giver": "&#127873;",
};

function tierProgress(data) {
  if (!data.next_tier) return `<p class="tier-note">You're at the top tier. Thank you!</p>`;
  const floor = data.rules.tiers.find((tier) => tier.name === data.tier)?.points || 0;
  const goal = data.points_lifetime + data.next_tier.points_needed;
  const percent = Math.min(100, Math.round(((data.points_lifetime - floor) / Math.max(1, goal - floor)) * 100));
  return `
    <div class="tier-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"
      aria-label="Progress to ${myEscape(data.next_tier.name)}"><span style="width: ${percent}%"></span></div>
    <p class="tier-note">${data.next_tier.points_needed.toLocaleString()} more points to reach <strong>${myEscape(data.next_tier.name)}</strong>.</p>`;
}

function renderRewards() {
  if (!rewards) return;
  const data = rewards;
  const earned = data.badges.filter((badge) => badge.earned);
  const strip = document.getElementById("summary-rewards");
  strip.hidden = false;
  strip.innerHTML = `<span class="tier-pill tier-${data.tier.toLowerCase()}">${myEscape(data.tier)}</span>
    <strong>${data.points.toLocaleString()} points</strong><span>worth ${money(data.points_value)} · ${earned.length} badge${earned.length === 1 ? "" : "s"}</span>
    <span class="rewards-strip-link">Rewards &rsaquo;</span>`;

  document.getElementById("rewards-overview").innerHTML = `
    <div class="rewards-card">
      <span class="tier-pill tier-${data.tier.toLowerCase()}">${myEscape(data.tier)} member</span>
      <p class="rewards-points"><strong>${data.points.toLocaleString()}</strong> points</p>
      <p class="rewards-value">Worth ${money(data.points_value)} at checkout · ${data.points_lifetime.toLocaleString()} earned in total</p>
      ${tierProgress(data)}
    </div>
    <dl class="rewards-stats">
      <div><dt>Paid orders</dt><dd>${data.stats.orders_paid}</dd></div>
      <div><dt>Items sold</dt><dd>${data.stats.items_sold}</dd></div>
      <div><dt>Referred orders</dt><dd>${data.stats.referral_orders}</dd></div>
      <div><dt>Gift cards sent</dt><dd>${data.stats.gift_cards_sent}</dd></div>
    </dl>`;
  document.getElementById("badge-list").innerHTML = data.badges.map((badge) => `
    <li class="badge-item${badge.earned ? " is-earned" : ""}" title="${myEscape(badge.description)}">
      <span class="badge-icon" aria-hidden="true">${BADGE_ICONS[badge.id] || "&#11088;"}</span>
      <strong>${myEscape(badge.label)}</strong>
      <small>${badge.earned ? "Earned" : myEscape(badge.description)}</small>
    </li>`).join("");
  document.getElementById("points-history").innerHTML = data.history.length
    ? data.history.map((entry) => `
      <li>
        <span>${myEscape(entry.note)}<small>${formatDate(entry.at)}</small></span>
        <strong class="${entry.points < 0 ? "is-negative" : ""}">${entry.points > 0 ? "+" : ""}${Number(entry.points).toLocaleString()}</strong>
      </li>`).join("")
    : '<li class="my-empty">No points yet. You earn points when an order is paid, when your items sell, and when people you refer buy.</li>';
  const rules = data.rules;
  const points = (n) => `${Number(n)} point${Number(n) === 1 ? "" : "s"}`;
  document.getElementById("rewards-rules").innerHTML = `
    <li>Buying: ${points(rules.points_per_dollar_spent)} for every $1 of items (after coupons), once the payment clears.</li>
    <li>Selling: ${points(rules.points_per_dollar_sold)} for every $1 of your items sold.</li>
    <li>Affiliate: ${Math.round(rules.affiliate_rate * 1000) / 10}% of what your referrals spend, paid as points.</li>
    <li>Spending: ${rules.points_per_dollar} points = $1 off at checkout. Points from refunded orders are taken back.</li>
    <li>Tiers: ${rules.tiers.slice().reverse().map((tier) => `${myEscape(tier.name)} ${tier.points.toLocaleString()}+`).join(" · ")} lifetime points.</li>`;
  renderGiftCards();
  renderAffiliate();
}

function giftCardStatus(card) {
  if (card.status === "active") return card.balance > 0 ? `Balance ${money(card.balance)}` : "Used up";
  return { pending: "Waiting for payment", cancelled: "Cancelled (not paid)", refunded: "Refunded" }[card.status] || card.status;
}

function renderGiftCards() {
  const received = rewards.gift_cards_received;
  document.getElementById("gift-cards-received").innerHTML = received.length
    ? received.map((card) => `
      <article class="gift-card-row">
        <div class="gift-card-mini" aria-hidden="true">${money(card.amount)}</div>
        <div class="gift-card-info">
          <strong>From ${myEscape(card.sender_name || "a friend")}</strong>
          ${card.message ? `<p class="gift-card-message">“${myEscape(card.message)}”</p>` : ""}
          <span>${giftCardStatus(card)}</span>
          <code class="gift-card-code">${myEscape(card.code)}</code>
        </div>
        <button type="button" class="button button-secondary" data-copy="${myEscape(card.code)}">Copy code</button>
      </article>`).join("")
    : '<p class="my-empty">No gift cards sent to you yet.</p>';
  const bought = rewards.gift_cards;
  document.getElementById("gift-cards-bought").innerHTML = bought.length
    ? bought.map((card) => `
      <article class="gift-card-row">
        <div class="gift-card-mini" aria-hidden="true">${money(card.amount)}</div>
        <div class="gift-card-info">
          <strong>${card.recipient_email ? `For ${myEscape(card.recipient_name || card.recipient_email)}` : "For you"}</strong>
          <span>${giftCardStatus(card)} · bought ${formatDate(card.created_at)}${card.sent_at ? ` · emailed ${formatDate(card.sent_at)}` : ""}</span>
          ${card.code ? `<code class="gift-card-code">${myEscape(card.code)}</code>` : ""}
          ${card.status === "active" ? `
          <form class="gift-card-send" data-send-card="${myEscape(card.code)}">
            <input type="email" name="recipient_email" placeholder="Recipient email" value="${myEscape(card.recipient_email || "")}" required aria-label="Recipient email" />
            <input type="text" name="recipient_name" placeholder="Their name (optional)" value="${myEscape(card.recipient_name || "")}" aria-label="Recipient name" />
            <input type="text" name="message" placeholder="Message (optional)" value="${myEscape(card.message || "")}" maxlength="300" aria-label="Message" />
            <button type="submit" class="button button-primary">${card.sent_at ? "Send again" : "Send by email"}</button>
            <p class="gift-card-send-status" role="status"></p>
          </form>` : ""}
        </div>
        ${card.code ? `<button type="button" class="button button-secondary" data-copy="${myEscape(card.code)}">Copy code</button>` : ""}
      </article>`).join("")
    : '<p class="my-empty">You haven\'t bought any gift cards. <a href="giftcards.html">Buy one</a> for a friend or for yourself.</p>';
}

function renderAffiliate() {
  const referral = rewards.referral;
  document.getElementById("affiliate-panel").innerHTML = `
    <p>Share your link. When someone buys within 30 days of opening it, you earn <strong>${Math.round(referral.rate * 1000) / 10}%</strong>
      of their item total as points (${Number(rewards.rules?.points_per_dollar) || 100} points = $1). Your own orders don't count.</p>
    <div class="affiliate-link">
      <input type="text" readonly value="${myEscape(referral.link)}" aria-label="Your affiliate link" />
      <button type="button" class="button button-primary" data-copy="${myEscape(referral.link)}">Copy link</button>
    </div>
    <p class="checkout-muted">Your code: <code>${myEscape(referral.code)}</code>. Add <code>?ref=${myEscape(referral.code)}</code> to any Lyrshop page link.</p>
    <dl class="rewards-stats">
      <div><dt>Referred orders</dt><dd>${referral.orders}</dd></div>
      <div><dt>Points earned</dt><dd>${referral.points.toLocaleString()}</dd></div>
      <div><dt>Worth</dt><dd>${money(referral.points / 100)}</dd></div>
    </dl>`;
}

async function loadRewards() {
  try {
    rewards = await authApi("/rewards/me");
    renderRewards();
  } catch (error) {
    const message = `<p class="my-empty">${myEscape(error.status === 401 ? "Please sign in again to see your rewards." : "Rewards are unavailable right now.")}</p>`;
    ["rewards-overview", "affiliate-panel", "gift-cards-bought"].forEach((id) => { document.getElementById(id).innerHTML = message; });
  }
}

async function copyText(button) {
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    const label = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => { button.textContent = label; }, 1500);
  } catch {
    window.prompt("Copy this:", button.dataset.copy);
  }
}

async function sendGiftCard(form) {
  const status = form.querySelector(".gift-card-send-status");
  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "Sending…";
  status.classList.remove("is-error");
  try {
    const fields = Object.fromEntries(new FormData(form));
    await authApi(`/giftcards/${encodeURIComponent(form.dataset.sendCard)}/send`, { method: "POST", body: fields });
    status.textContent = `Sent to ${fields.recipient_email}.`;
    loadRewards();
  } catch (error) {
    status.textContent = error.message || "Couldn't send the gift card.";
    status.classList.add("is-error");
  } finally {
    button.disabled = false;
  }
}

// ── Purchases ──────────────────────────────────────────────────────────────────

// One row per product with a quantity; the order keeps one entry per unit.
function groupItems(items) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const key = `${item.id ?? item.name}|${item.variant || ""}`;
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
  const isGiftCard = order.kind === "giftcard";
  const image = productsById.get(String(first.id))?.image_url || MY_PLACEHOLDER_IMAGE_URL;
  const link = isGiftCard ? "#gift-cards" : first.id ? productUrl(first.id) : "#purchases";
  const savings = [
    Number(order.discount_total) > 0 && `${order.coupon_code ? `Coupon ${myEscape(order.coupon_code)}` : "Coupon"} −${money(order.discount_total)}`,
    Number(order.gift_card_applied) > 0 && `Gift card −${money(order.gift_card_applied)}`,
    Number(order.points_redeemed) > 0 && `${Number(order.points_redeemed).toLocaleString()} points −${money(order.points_value)}`,
  ].filter(Boolean);
  const others = items.length - 1;
  const tracking = order.tracking_number
    ? `<p class="my-order-tracking">${myEscape(order.shipping_carrier || "Tracking")} <strong>${myEscape(order.tracking_number)}</strong>${
      /^https:\/\//.test(order.tracking_url || "") ? ` · <a href="${myEscape(order.tracking_url)}" target="_blank" rel="noopener">Track package</a>` : ""}</p>`
    : "";
  // Orders with items from several places arrive as several parcels, each with its own tracking number.
  const moreParcels = (order.tracking_numbers || []).filter((number) => number !== order.tracking_number);
  const overdue = order.payment_status === "invoiced" && Number(order.invoice_due_at) * 1000 < Date.now();
  const invoice = order.invoice_number
    ? `<p class="my-order-invoice${overdue ? " is-overdue" : ""}">Invoice ${myEscape(order.invoice_number)} · ${
      order.payment_status === "invoiced" ? `${overdue ? "overdue since" : "due"} ${myEscape(formatDate(order.invoice_due_at))}` : "paid"
    } · <a href="invoice.html?id=${encodeURIComponent(order.id)}">View invoice</a></p>`
    : "";
  const parcels = moreParcels.length
    ? `<p class="my-order-tracking">Also shipped separately: ${moreParcels.map((number) => `<strong>${myEscape(number)}</strong>`).join(", ")}</p>`
    : "";
  return `
    <article class="my-order">
      <div class="my-order-meta">
        <span>Order date <strong>${myEscape(formatDate(order.created_at))}</strong></span>
        <span>Order total <strong>${money(order.total)}</strong></span>
        <span>Order number <strong>${myEscape(String(order.id).slice(0, 8).toUpperCase())}</strong></span>
      </div>
      <div class="my-order-body">
        <a class="my-thumb" href="${link}">
          <img src="${myEscape(image)}" alt="" loading="lazy" />
        </a>
        <div class="my-order-info">
          <p class="my-order-status ${statusTone(order)}">${myEscape(deliveryLine(order))}</p>
          <p>
            <a href="${link}">${myEscape(first.name || "Order")}</a>
            ${first.quantity > 1 ? `<span class="my-muted">× ${first.quantity}</span>` : ""}
          </p>
          ${first.variant ? `<p class="my-muted">${myEscape(first.variant)}</p>` : ""}
          ${others > 0 ? `<p class="my-muted">and ${others} more item${others === 1 ? "" : "s"}</p>` : ""}
          ${tracking}${parcels}${invoice}
          ${savings.length ? `<p class="my-muted">${savings.join(" · ")}</p>` : ""}
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

// ── Profile ────────────────────────────────────────────────────────────────────
// Name and photo are saved with PUT /auth/me; photos go up through the same signed upload as product images.

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const profileForm = document.getElementById("profile-form");
const profileNameInput = document.getElementById("profile-name-input");
const profileMessage = document.getElementById("profile-message");
const photoInput = document.getElementById("photo-input");
const photoUploadButton = document.getElementById("photo-upload");
const photoRemoveButton = document.getElementById("photo-remove");
const profileSave = document.getElementById("profile-save");
// The photo shown in the form; saved only when the seller presses Save.
let pendingPhoto = null;

function setProfileMessage(text, isError = false) {
  profileMessage.textContent = text;
  profileMessage.classList.toggle("is-error", isError);
}

function renderAvatarPreview(account) {
  const shown = { ...account, photo_url: pendingPhoto ?? account.photo_url };
  document.getElementById("profile-avatar").innerHTML = userAvatar(shown, "user-avatar profile-avatar-large");
  photoRemoveButton.hidden = !shown.photo_url;
  photoUploadButton.textContent = shown.photo_url ? "Change photo" : "Upload photo";
}

async function uploadPhoto(file) {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Choose a JPEG, PNG, WebP or GIF image.");
  if (file.size > PHOTO_MAX_BYTES) throw new Error("Photos must be 10 MB or smaller.");
  const signRes = await fetch(`${MY_API_BASE_URL}/media/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser().token}` },
    body: JSON.stringify({ content_type: file.type, filename: file.name }),
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok) throw new Error(sign.message || "Could not start the upload.");
  const body = new FormData();
  Object.entries(sign.fields || {}).forEach(([key, value]) => body.append(key, value));
  body.append("file", file, file.name);
  const uploadRes = await fetch(sign.url, { method: "POST", body });
  if (!uploadRes.ok) throw new Error("Upload failed. Please try again.");
  return new URL(sign.public_url, sign.url.startsWith("http://127.0.0.1") ? MY_API_BASE_URL : window.location.origin).href;
}

function bindProfileForm() {
  photoUploadButton.addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    photoInput.value = "";
    if (!file) return;
    photoUploadButton.disabled = true;
    setProfileMessage("Uploading photo…");
    try {
      pendingPhoto = await uploadPhoto(file);
      renderAvatarPreview(getCurrentUser());
      setProfileMessage("Photo ready. Press Save changes to keep it.");
    } catch (error) {
      setProfileMessage(error.message, true);
    } finally {
      photoUploadButton.disabled = false;
    }
  });
  photoRemoveButton.addEventListener("click", () => {
    pendingPhoto = "";
    renderAvatarPreview(getCurrentUser());
    setProfileMessage("Photo will be removed when you save.");
  });
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = { name: profileNameInput.value };
    if (pendingPhoto !== null) body.photo_url = pendingPhoto;
    profileSave.disabled = true;
    setProfileMessage("Saving…");
    try {
      const { user: saved } = await authApi("/auth/me", { method: "PUT", body });
      setCurrentUser(saved, getCurrentUser().token);
      pendingPhoto = null;
      renderProfile(saved);
      renderUserGreeting();
      setProfileMessage("Profile saved.");
    } catch (error) {
      if (error.status === 401) {
        clearCurrentUser();
        window.location.href = "auth.html";
        return;
      }
      setProfileMessage(error.message, true);
    } finally {
      profileSave.disabled = false;
    }
  });
}

function renderProfile(account) {
  const roleLabels = { superadmin: "Super admin", admin: "Admin", user: "Customer" };
  document.getElementById("my-heading-avatar").innerHTML = userAvatar(account, "user-avatar my-heading-avatar");
  if (document.activeElement !== profileNameInput) profileNameInput.value = account.name || "";
  renderAvatarPreview(account);
  document.getElementById("my-greeting").textContent = `Hi, ${account.name}`;
  document.getElementById("profile-name").textContent = account.name;
  document.getElementById("profile-email").textContent = getAccountContact(account);
  document.getElementById("profile-provider").textContent = account.provider || "—";
  document.getElementById("profile-role").textContent = roleLabels[account.role] || "Customer";
  renderBusiness(account);
}

// ── Business account (B2B) ─────────────────────────────────────────────────────
// Shoppers apply here; the super admin approves them before wholesale prices or tax exemption apply.

const BUSINESS_STATUS_TEXT = {
  pending: "Your application is being reviewed. You'll keep retail prices until it's approved.",
  approved: "Approved. You see sellers' wholesale prices on bulk quantities.",
  rejected: "Your application wasn't approved. Update your details and apply again, or contact support@lyrshop.com.",
};

function renderBusiness(account) {
  const info = account.business || {};
  const approved = info.status === "approved";
  document.getElementById("profile-buyer-type").textContent = approved
    ? `Business — ${info.company}${info.tax_exempt ? " (tax-exempt)" : ""}` : "Personal (retail prices)";
  const status = document.getElementById("business-status");
  status.dataset.status = info.status || "";
  const waiting = approved && info.wants_tax_exempt && !info.tax_exempt
    ? info.certificate_key ? " Your certificate is being checked for tax exemption." : " Tax exemption needs your certificate: upload it below."
    : "";
  const terms = approved && info.net_terms ? ` You can order on invoice (net 30), up to ${money(info.credit_limit)} unpaid at a time.` : "";
  status.textContent = info.status
    ? `${BUSINESS_STATUS_TEXT[info.status] || ""}${approved && info.tax_exempt ? " Your orders are tax-exempt." : ""}${waiting}${terms}`
    : "Buying for a business? Apply for wholesale prices on bulk orders and, with a resale certificate, tax-exempt checkout.";
  document.getElementById("quotes-link").hidden = !approved;
  const form = document.getElementById("business-form");
  if (document.activeElement?.form !== form) {
    for (const field of ["company", "tax_id", "phone", "address", "website", "industry"]) form.elements[field].value = info[field] || "";
    form.elements.country.value = info.country || LyrLocale.country() || "US";
    form.elements.wants_tax_exempt.checked = Boolean(info.wants_tax_exempt);
  }
  document.getElementById("certificate-field").hidden = !form.elements.wants_tax_exempt.checked;
  document.getElementById("certificate-on-file").hidden = !info.certificate_key;
  document.getElementById("business-submit").textContent = info.status ? "Update business details" : "Apply for a business account";
}

function bindBusinessForm() {
  const form = document.getElementById("business-form");
  const names = new Intl.DisplayNames([navigator.language || "en"], { type: "region" });
  form.elements.country.innerHTML = "AE AR AT AU BD BE BR CA CH CL CN CO CZ DE DK EG ES FI FR GB GH GR HK ID IE IL IN IT JP KE KR LK MX MY NG NL NO NZ PH PK PL PT QA RO SA SE SG TH TR TW UA US VN ZA"
    .split(" ").map((code) => ({ code, name: names.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => `<option value="${code}">${myEscape(name)}</option>`).join("");
  form.elements.wants_tax_exempt.addEventListener("change", () => {
    document.getElementById("certificate-field").hidden = !form.elements.wants_tax_exempt.checked;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("business-message");
    const fields = Object.fromEntries(new FormData(form));
    delete fields.certificate;
    fields.wants_tax_exempt = form.elements.wants_tax_exempt.checked;
    const file = form.elements.wants_tax_exempt.checked ? form.elements.certificate.files[0] : null;
    const current = getCurrentUser()?.business;
    if (current?.status === "approved" && !confirm("Changing your business details sends your account back for review, and wholesale prices pause until it's approved again. Continue?")) return;
    message.textContent = "Sending…";
    message.classList.remove("is-error");
    try {
      if (file) fields.certificate_key = await uploadCertificate(file);
      const { user: updated } = await authApi("/business/apply", { method: "POST", body: fields });
      form.elements.certificate.value = "";
      setCurrentUser(updated, getCurrentUser().token);
      renderProfile(updated);
      message.textContent = updated.business.status === "approved" ? "No changes needed." : "Application sent. We'll review it shortly.";
    } catch (error) {
      message.textContent = error.message || "Couldn't send your application.";
      message.classList.add("is-error");
    }
  });
}

// The certificate goes straight to private storage with a one-time upload form; the application keeps its key.
async function uploadCertificate(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error("The certificate file must be 10 MB or smaller.");
  const upload = await authApi("/business/certificate/upload-url", { method: "POST", body: { content_type: file.type } });
  const form = new FormData();
  Object.entries(upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);
  const response = await fetch(upload.url, { method: "POST", body: form });
  if (!response.ok) throw new Error("The certificate didn't upload. Please try again.");
  return upload.key;
}

// ── Business quotes ────────────────────────────────────────────────────────────

const QUOTE_STATUS_TEXT = {
  requested: "Waiting for our prices", quoted: "Prices ready", declined: "Declined", ordered: "Ordered",
  expired: "Expired", withdrawn: "Withdrawn",
};
let myQuotes = [];

function renderQuotes() {
  const list = document.getElementById("quote-list");
  if (!myQuotes.length) {
    list.innerHTML = `<p class="my-empty">No quotes yet. Fill your cart with what you need and choose "Request a quote".</p>`;
    return;
  }
  list.innerHTML = myQuotes.map((quote) => {
    const lines = quote.lines.map((line) => `<li>${line.quantity} × ${myEscape(line.name)}${line.variant ? ` (${myEscape(line.variant)})` : ""}${
      line.price != null ? ` at <strong>${money(line.price)}</strong> <span class="my-muted">(list ${money(line.list_price)})</span>` : ""}</li>`).join("");
    const open = quote.status === "quoted";
    return `
      <article class="my-quote">
        <div class="my-quote-head">
          <strong>Quote ${myEscape(quote.id.slice(0, 6).toUpperCase())} · ${myEscape(formatDate(quote.created_at))}</strong>
          <span class="status-badge status-quote-${myEscape(quote.status)}">${myEscape(QUOTE_STATUS_TEXT[quote.status] || quote.status)}</span>
        </div>
        <ul>${lines}</ul>
        ${quote.total != null ? `<p>Quoted total <strong>${money(quote.total)}</strong> <span class="my-muted">instead of ${money(quote.list_total)}, before shipping and tax${open ? ` · valid until ${myEscape(formatDate(quote.valid_until))}` : ""}</span></p>` : ""}
        ${quote.reply_note ? `<p class="my-muted">${myEscape(quote.reply_note)}</p>` : ""}
        <div class="my-quote-actions">
          ${open ? `<button type="button" class="button button-primary" data-quote-checkout="${myEscape(quote.id)}">Check out at these prices</button>` : ""}
          ${["requested", "quoted"].includes(quote.status) ? `<button type="button" class="button button-secondary" data-quote-withdraw="${myEscape(quote.id)}">Withdraw</button>` : ""}
        </div>
      </article>`;
  }).join("");
}

async function loadQuotes() {
  try {
    myQuotes = (await authApi("/business/quotes")).quotes || [];
  } catch (error) {
    myQuotes = [];
  }
  renderQuotes();
}

document.getElementById("quote-list").addEventListener("click", async (event) => {
  const checkout = event.target.closest("[data-quote-checkout]");
  if (checkout) {
    const quote = myQuotes.find((item) => item.id === checkout.dataset.quoteCheckout);
    if (!quote || (readStoredList(CART_KEY).length && !confirm("This replaces what's in your cart with the quoted items. Continue?"))) return;
    // One cart entry per unit, as the product page adds them; the server checks the cart matches the quote.
    const items = quote.lines.flatMap((line) => Array.from({ length: line.quantity }, () => ({
      id: line.id, name: line.name, price: line.price,
      ...(line.variant ? { variant: line.variant, options: Object.fromEntries(line.variant.split(" · ").map((part) => part.split(": "))) } : {}),
    })));
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    localStorage.setItem("lyrshopQuote", JSON.stringify({ id: quote.id }));
    window.location.href = "cart.html";
    return;
  }
  const withdraw = event.target.closest("[data-quote-withdraw]");
  if (withdraw && confirm("Withdraw this quote?")) {
    try {
      await authApi(`/business/quotes/${encodeURIComponent(withdraw.dataset.quoteWithdraw)}/withdraw`, { method: "POST", body: {} });
    } catch (error) {
      alert(error.message);
    }
    loadQuotes();
  }
});

// ── Bids & offers ──────────────────────────────────────────────────────────────
// GET /market/offers: auctions the account bid on, offers it made or received, and accepted ones waiting for payment.

let market = { offers: [], deals: [], bids: [] };
const OFFER_STATUS_LABELS = {
  pending: "Waiting for the seller", countered: "Counteroffer", accepted: "Accepted", declined: "Declined",
  expired: "Expired", withdrawn: "Withdrawn", purchased: "Purchased",
};

function offerHistory(offer) {
  return (offer.history || []).map((step) => {
    const who = step.by === offer.side ? "You" : offer.side === "buyer" ? "Seller" : "Buyer";
    const what = { offer: "offered", counter: "countered with", accept: "accepted", decline: "declined", withdraw: "withdrew" }[step.action] || step.action;
    const amount = ["offer", "counter"].includes(step.action) ? ` ${money(step.amount)}` : "";
    return `<li>${myEscape(who)} ${myEscape(what)}${myEscape(amount)} · ${myEscape(formatDate(step.at))}${step.message ? `<br><q>${myEscape(step.message)}</q>` : ""}</li>`;
  }).join("");
}

function offerCard(offer) {
  const open = ["pending", "countered"].includes(offer.status);
  const quantity = Number(offer.quantity || 1);
  const status = offer.your_turn ? "Your turn to answer" : OFFER_STATUS_LABELS[offer.status] || offer.status;
  const deal = market.deals.find((item) => item.ref === offer.deal_ref && item.status === "quoted");
  return `
    <article class="market-card" data-offer="${myEscape(offer.ref)}">
      <a href="${productUrl(offer.product_id)}"><img src="${myEscape(offer.image_url || MY_PLACEHOLDER_IMAGE_URL)}" alt="" loading="lazy" /></a>
      <div class="market-card-body">
        <a class="market-card-title" href="${productUrl(offer.product_id)}">${myEscape(offer.product_name)}</a>
        <p><strong>${money(offer.amount)}</strong>${quantity > 1 ? ` each × ${quantity}` : ""} · Buy It Now ${money(offer.list_price)}${offer.variant ? ` · ${myEscape(offer.variant)}` : ""}</p>
        <p class="market-status status-${myEscape(offer.status)}${offer.your_turn ? " is-your-turn" : ""}">${myEscape(status)}${open ? ` · expires ${myEscape(auctionTimeLeft(offer.expires_at))}` : ""}</p>
        <ol class="offer-history">${offerHistory(offer)}</ol>
        <div class="market-actions">
          ${offer.your_turn ? `
            <button type="button" class="button button-primary" data-offer-action="accept">Accept ${money(offer.amount)}</button>
            <button type="button" class="button button-secondary" data-offer-action="counter">Counter</button>
            <button type="button" class="button button-secondary" data-offer-action="decline">Decline</button>` : ""}
          ${open && offer.side === "buyer" && !offer.your_turn ? `<button type="button" class="button button-secondary" data-offer-action="withdraw">Withdraw offer</button>` : ""}
          ${deal ? `<a class="button button-primary" href="cart.html?deal=${encodeURIComponent(deal.ref)}">Pay now</a>` : ""}
        </div>
      </div>
    </article>`;
}

function bidCard(entry) {
  const auction = entry.auction;
  const live = auction.status === "live" && Number(auction.ends_at) * 1000 > Date.now();
  const deal = market.deals.find((item) => item.source === "auction" && item.source_ref === entry.product_id && item.status === "quoted");
  const standing = live ? (auction.you_lead ? "You're the high bidder" : "Outbid")
    : auction.winner === "You" ? (deal ? "You won! Pay now" : "You won") : "Didn't win";
  return `
    <article class="market-card">
      <a href="${productUrl(entry.product_id)}"><img src="${myEscape(entry.image_url || MY_PLACEHOLDER_IMAGE_URL)}" alt="" loading="lazy" /></a>
      <div class="market-card-body">
        <a class="market-card-title" href="${productUrl(entry.product_id)}">${myEscape(entry.name)}</a>
        <p><strong>${money(auction.final_price || auction.current_price)}</strong> · ${Number(auction.bid_count || 0)} bids${auction.your_max ? ` · your max ${money(auction.your_max)}` : ""}</p>
        <p class="market-status ${auction.you_lead || auction.winner === "You" ? "is-winning" : "is-outbid"}">${myEscape(standing)} · ${live ? `${myEscape(auctionTimeLeft(auction.ends_at))} left` : "Ended"}</p>
        <div class="market-actions">
          ${live && !auction.you_lead ? `<a class="button button-primary" href="${productUrl(entry.product_id)}">Bid again</a>` : ""}
          ${deal ? `<a class="button button-primary" href="cart.html?deal=${encodeURIComponent(deal.ref)}">Pay now</a>` : ""}
        </div>
      </div>
    </article>`;
}

function renderMarket() {
  const buying = market.offers.filter((offer) => offer.side === "buyer");
  const selling = market.offers.filter((offer) => offer.side === "seller");
  const waiting = market.deals.filter((deal) => deal.status === "quoted");
  document.getElementById("deal-list").innerHTML = waiting.length ? `
    <div class="deal-banner">${waiting.map((deal) => `
      <p><strong>${myEscape(deal.lines?.[0]?.name || "Item")}</strong>: ${{ auction: "you won it", watcher: "the seller sent you an offer" }[deal.source] || "your offer was accepted"}
        for ${money(deal.total)}. Pay within ${myEscape(auctionTimeLeft(deal.valid_until))}.
        <a class="button button-primary" href="cart.html?deal=${encodeURIComponent(deal.ref)}">Pay now</a></p>`).join("")}</div>` : "";
  document.getElementById("bid-list").innerHTML = market.bids.map(bidCard).join("")
    || `<p class="my-empty">You haven't bid on any auctions yet. <a href="index.html?format=auction#product-list">Browse auctions</a></p>`;
  document.getElementById("buying-offer-list").innerHTML = buying.map(offerCard).join("")
    || `<p class="my-empty">No offers yet. Look for "or Best Offer" on items you like.</p>`;
  document.getElementById("selling-offer-list").innerHTML = selling.map(offerCard).join("")
    || `<p class="my-empty">No offers on your items. Turn on "Allow offers" when you list an item.</p>`;
  const attention = market.offers.filter((offer) => offer.your_turn).length + waiting.length;
  const badge = document.getElementById("offers-count");
  badge.hidden = !attention;
  badge.textContent = attention;
}

async function loadMarket() {
  try {
    market = await authApi("/market/offers");
  } catch (error) {
    market = { offers: [], deals: [], bids: [] };
  }
  renderMarket();
}

document.querySelector('[data-section="offers"]').addEventListener("click", async (event) => {
  const button = event.target.closest("[data-offer-action]");
  if (!button) return;
  const ref = button.closest("[data-offer]").dataset.offer;
  const offer = market.offers.find((item) => item.ref === ref);
  const action = button.dataset.offerAction;
  const body = { action };
  if (action === "counter") {
    const amount = prompt(`Your counteroffer${Number(offer.quantity) > 1 ? " per item" : ""} (USD). Buy It Now is ${LyrLocale.formatUsd(offer.list_price)}.`);
    if (!amount) return;
    body.amount = Number(amount);
    body.message = prompt("Message (optional)") || "";
  } else if (action === "decline") {
    body.message = prompt("Tell them why (optional)") || "";
  } else if (!confirm(action === "accept" ? `Accept ${LyrLocale.formatUsd(offer.amount)} USD? This is binding.` : "Withdraw this offer?")) {
    return;
  }
  button.disabled = true;
  try {
    const reply = await authApi(`/market/offers/${encodeURIComponent(ref)}`, { method: "POST", body });
    if (reply.deal && offer.side === "buyer") {
      window.location.href = `cart.html?deal=${encodeURIComponent(reply.deal.ref)}`;
      return;
    }
    showToast({ accept: "Offer accepted. We've emailed the buyer to pay.", decline: "Offer declined.",
      counter: "Counteroffer sent.", withdraw: "Offer withdrawn." }[action]);
  } catch (error) {
    alert(error.message);
  }
  loadMarket();
});

// ── Email preferences ──────────────────────────────────────────────────────────

async function loadEmailPrefs() {
  const form = document.getElementById("email-prefs-form");
  try {
    const { prefs, has_email: hasEmail } = await authApi("/market/prefs");
    form.offers.checked = prefs.offers;
    form.updates.checked = prefs.updates;
    form.hidden = !hasEmail;
    document.getElementById("email-prefs-none").hidden = hasEmail;
  } catch (error) {
    form.hidden = true;
  }
  form.addEventListener("change", async () => {
    const status = document.getElementById("email-prefs-message");
    try {
      await authApi("/market/prefs", { method: "PUT", body: { offers: form.offers.checked, updates: form.updates.checked } });
      status.textContent = "Saved.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

if (!user) {
  window.location.href = "auth.html";
} else {
  bindProfileForm();
  bindBusinessForm();
  renderProfile(user);
  // The role can change after sign-in (the super admin grants or removes admin access).
  refreshCurrentUser().then((fresh) => fresh && renderProfile(fresh));

  showSection();
  renderAll();
  LyrLocale.onChange(renderAll);
  loadOrders();
  loadProducts();
  loadRewards();
  loadQuotes();
  loadMarket();
  loadEmailPrefs();
  // The browser's watchlist is the source; the account copy drives price-drop emails.
  if (getWatchlist().length) syncWatchInterest();

  window.addEventListener("hashchange", () => {
    showSection();
    window.scrollTo({ top: 0 });
  });
  document.querySelector(".my-content").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-send-card]");
    if (form) {
      event.preventDefault();
      sendGiftCard(form);
    }
  });
  document.querySelector(".my-content").addEventListener("click", (event) => {
    const copy = event.target.closest("[data-copy]");
    if (copy) copyText(copy);
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
