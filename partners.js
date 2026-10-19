// Partner portal for the Lyrshop Dropshipping API: apply, then (once the super admin approves) manage API keys, the
// prepaid wallet, the order webhook and recent API orders. Everything comes from GET /dropship/me.
const partnerLoading = document.getElementById("partner-loading");
const partnerStatus = document.getElementById("partner-status");
const partnerApply = document.getElementById("partner-apply");
const partnerForm = document.getElementById("partner-form");
const partnerConsole = document.getElementById("partner-console");
let portal = null;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function usd(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount) || 0);
}

function day(seconds) {
  return seconds ? new Date(seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function setStatus(id, text, isError = false) {
  const element = document.getElementById(id);
  element.textContent = text;
  element.classList.toggle("is-error", isError);
}

const STATUS_COPY = {
  pending: ["Application received", "We're reviewing your store and will email you when you're approved. You can still update your details below."],
  rejected: ["Application not approved", "We couldn't approve this application. Update your details below to apply again, or email support@lyrshop.com."],
  suspended: ["Account paused", "Your API access is paused, so keys and orders don't work right now. Email support@lyrshop.com to sort it out."],
};

const ORDER_STATUS_LABELS = {
  awaiting_payment: "Awaiting payment", paid: "Paid", processing: "Processing", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};

function render() {
  partnerLoading.hidden = true;
  const info = portal.partner || {};
  const status = info.status;
  document.querySelectorAll("[data-base-url]").forEach((element) => {
    element.textContent = portal.api_base_url;
  });

  partnerStatus.hidden = !STATUS_COPY[status];
  if (STATUS_COPY[status]) {
    const [title, text] = STATUS_COPY[status];
    partnerStatus.innerHTML = `<h2>${title}</h2><p>${esc(text)}</p>${info.note && status !== "pending" ? `<p class="checkout-muted">${esc(info.note)}</p>` : ""}`;
  }
  partnerApply.hidden = status === "approved" || status === "suspended";
  document.getElementById("partner-apply-title").textContent = status ? "Your application" : "Apply to become a partner";
  document.getElementById("partner-submit").textContent = status ? "Update application" : "Send application";
  for (const field of ["company", "website", "country", "platform", "monthly_orders", "about"]) {
    if (info[field]) partnerForm.elements[field].value = info[field];
  }

  partnerConsole.hidden = status !== "approved";
  if (status !== "approved") return;
  document.getElementById("stat-discount").textContent = `${Number(portal.discount_percent)}%`;
  document.getElementById("stat-wallet").textContent = usd(portal.wallet.balance);
  document.getElementById("stat-orders").textContent = portal.orders.length;
  document.getElementById("stat-base-url").textContent = portal.api_base_url;
  renderWallet();
  renderKeys();
  renderWebhook();
  renderOrders();
}

function renderWallet() {
  const rows = portal.wallet.history;
  document.getElementById("wallet-history").innerHTML = rows.length ? rows.map((row) => `
    <tr><td>${day(row.at)}</td><td class="${row.amount < 0 ? "amount-out" : "amount-in"}">${row.amount < 0 ? "−" : "+"}${usd(Math.abs(row.amount))}</td><td>${esc(row.note)}</td></tr>`).join("")
    : `<tr><td colspan="3">No wallet activity yet. Top up to start sending orders.</td></tr>`;
}

function renderKeys() {
  document.getElementById("key-table").innerHTML = portal.keys.length ? portal.keys.map((key) => `
    <tr>
      <td>${esc(key.name)}</td>
      <td><code>${esc(key.prefix)}…</code></td>
      <td>${day(key.created_at)}</td>
      <td>${key.last_used_at ? day(key.last_used_at) : "Never"}</td>
      <td><button type="button" class="button danger-button" data-delete-key="${esc(key.key_id)}">Delete</button></td>
    </tr>`).join("")
    : `<tr><td colspan="5">No keys yet. Create one to start calling the API.</td></tr>`;
}

function renderWebhook() {
  const hook = portal.webhook || {};
  const input = document.getElementById("webhook-url");
  if (document.activeElement !== input) input.value = hook.url || "";
  document.getElementById("webhook-test").disabled = !hook.url;
  document.getElementById("webhook-rotate").disabled = !hook.url;
  if (hook.last_sent_at && !document.getElementById("webhook-message").textContent) {
    const ok = hook.last_status >= 200 && hook.last_status < 300;
    setStatus("webhook-message", `Last event ${hook.last_event} on ${day(hook.last_sent_at)}: ${hook.last_status ? `HTTP ${hook.last_status}` : "couldn't connect"}.`, !ok);
  }
}

function renderOrders() {
  document.getElementById("order-table").innerHTML = portal.orders.length ? portal.orders.map((order) => {
    const ship = order.shipping_address || {};
    const items = (order.items || []).map((item) => `${item.quantity} × ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", ");
    const tracking = order.tracking_number ? `<small>${esc(order.shipping_carrier || "")} ${esc(order.tracking_number)}</small>` : "";
    const actions = [
      order.status === "awaiting_payment" ? `<button type="button" class="button button-primary" data-order="${esc(order.id)}" data-order-action="pay">Pay</button>` : "",
      ["awaiting_payment", "paid"].includes(order.status) ? `<button type="button" class="button button-secondary" data-order="${esc(order.id)}" data-order-action="cancel">Cancel</button>` : "",
    ].join("");
    return `
      <tr>
        <td><strong>${esc(order.reference)}</strong></td>
        <td>${day(order.created_at)}</td>
        <td>${esc([ship.name, ship.city, ship.country_code].filter(Boolean).join(", "))}</td>
        <td>${esc(items)}</td>
        <td>${usd(order.total)}</td>
        <td><span class="partner-order-status is-${esc(order.status)}">${ORDER_STATUS_LABELS[order.status] || esc(order.status)}</span>${tracking}</td>
        <td><div class="table-actions">${actions}</div></td>
      </tr>`;
  }).join("") : `<tr><td colspan="7">No API orders yet. They'll appear here as your store sends them.</td></tr>`;
}

async function load() {
  if (!getCurrentUser()?.token) {
    partnerLoading.hidden = true;
    document.getElementById("partner-signin").hidden = false;
    return;
  }
  try {
    portal = await authApi("/dropship/me");
    render();
  } catch (error) {
    partnerLoading.hidden = true;
    if (error.status === 401) {
      document.getElementById("partner-signin").hidden = false;
      return;
    }
    partnerLoading.hidden = false;
    partnerLoading.textContent = error.message || "Couldn't load your partner account. Refresh to try again.";
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────

partnerForm.elements.country.innerHTML = LyrLocale.countryOptions()
  .map(({ code, name }) => `<option value="${code}">${esc(name)}</option>`).join("");
partnerForm.elements.country.value = LyrLocale.country() || "US";

document.querySelector("#partner-signin a").addEventListener("click", () => {
  localStorage.setItem("lyrshopAuthReturnTo", "partners.html");
});

partnerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.getElementById("partner-submit");
  button.disabled = true;
  try {
    portal = await authApi("/dropship/apply", { method: "POST", body: Object.fromEntries(new FormData(partnerForm)) });
    render();
    setStatus("partner-form-message", portal.partner.status === "approved" ? "Details updated." : "Application sent. We'll email you once it's reviewed.");
  } catch (error) {
    setStatus("partner-form-message", error.message, true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("topup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.getElementById("topup-submit");
  button.disabled = true;
  setStatus("topup-message", "Opening secure checkout…");
  try {
    const result = await authApi("/dropship/wallet/topup", { method: "POST", body: { amount: Number(document.getElementById("topup-amount").value) } });
    if (!result.stripe_configured) {
      setStatus("topup-message", result.message);
      button.disabled = false;
      return;
    }
    window.location.href = result.checkout_url;
  } catch (error) {
    setStatus("topup-message", error.message, true);
    button.disabled = false;
  }
});

document.getElementById("key-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { key } = await authApi("/dropship/keys", { method: "POST", body: { name: document.getElementById("key-name").value } });
    document.getElementById("new-key-value").textContent = key.key;
    document.getElementById("new-key").hidden = false;
    document.getElementById("key-name").value = "";
    setStatus("key-message", "");
    portal = await authApi("/dropship/me");
    render();
  } catch (error) {
    setStatus("key-message", error.message, true);
  }
});

document.getElementById("key-table").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-key]");
  if (!button || !confirm("Delete this key? Anything still using it stops working at once.")) return;
  button.disabled = true;
  try {
    await authApi(`/dropship/keys/${encodeURIComponent(button.dataset.deleteKey)}`, { method: "DELETE" });
    document.getElementById("new-key").hidden = true;
    setStatus("key-message", "Key deleted.");
    portal = await authApi("/dropship/me");
    render();
  } catch (error) {
    setStatus("key-message", error.message, true);
    button.disabled = false;
  }
});

async function saveWebhook(rotate) {
  const url = document.getElementById("webhook-url").value.trim();
  try {
    const { webhook } = await authApi("/dropship/webhook", { method: "PUT", body: { url, rotate_secret: rotate } });
    document.getElementById("webhook-secret").hidden = !webhook.secret;
    if (webhook.secret) document.getElementById("webhook-secret-value").textContent = webhook.secret;
    setStatus("webhook-message", !url ? "Webhook removed." : rotate ? "New signing secret made. Update your server with it." : "Webhook saved.");
    portal = await authApi("/dropship/me");
    render();
  } catch (error) {
    setStatus("webhook-message", error.message, true);
  }
}

document.getElementById("webhook-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveWebhook(false);
});

document.getElementById("webhook-rotate").addEventListener("click", () => {
  if (confirm("Make a new signing secret? Events signed with the old one stop verifying on your server.")) saveWebhook(true);
});

document.getElementById("webhook-test").addEventListener("click", async (event) => {
  event.target.disabled = true;
  setStatus("webhook-message", "Sending a ping…");
  try {
    const result = await authApi("/dropship/webhook/test", { method: "POST", body: {} });
    setStatus("webhook-message", result.ok ? `Delivered (HTTP ${result.status}).` : `Your endpoint answered ${result.status ? `HTTP ${result.status}` : "nothing (couldn't connect)"}.`, !result.ok);
  } catch (error) {
    setStatus("webhook-message", error.message, true);
  } finally {
    event.target.disabled = false;
  }
});

document.getElementById("order-table").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-order-action]");
  if (!button) return;
  const action = button.dataset.orderAction;
  if (action === "cancel" && !confirm("Cancel this order? If it's paid, the money goes back to your wallet.")) return;
  button.disabled = true;
  try {
    await authApi(`/dropship/orders/${encodeURIComponent(button.dataset.order)}/${action}`, { method: "POST", body: {} });
    setStatus("order-message", action === "pay" ? "Order paid from your wallet." : "Order cancelled.");
    portal = await authApi("/dropship/me");
    render();
  } catch (error) {
    setStatus("order-message", error.message, true);
    button.disabled = false;
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(document.querySelector(button.dataset.copy).textContent);
    const label = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = label; }, 1500);
  } catch {
    button.textContent = "Select and copy";
  }
});

// Back from Stripe: the webhook credits the wallet a moment later, so look again a few times.
async function watchTopUp() {
  setStatus("topup-message", "Payment received. Your balance updates as soon as Stripe confirms it.");
  await load();
  const start = portal?.wallet?.balance;
  for (let tries = 0; tries < 6; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await load();
    if (portal?.wallet?.balance !== start) {
      setStatus("topup-message", "Your wallet has been topped up.");
      return;
    }
  }
}

if (new URLSearchParams(window.location.search).get("topup") === "done") watchTopUp();
else load();
