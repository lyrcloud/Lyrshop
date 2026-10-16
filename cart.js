// Cart and checkout page: items, shipping quotes, order summary and Stripe checkout.
const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";

const cartItems = document.getElementById("cart-items");
const cartCountLabel = document.getElementById("cart-count-label");
const cartSubtotal = document.getElementById("cart-subtotal");
const shippingTotal = document.getElementById("shipping-total");
const taxTotal = document.getElementById("tax-total");
const cartTotal = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");
const checkoutStatus = document.getElementById("checkout-status");
let shippingMethodInputs = document.querySelectorAll('input[name="shipping-method"]');
const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
const shippingZipInput = document.getElementById("shipping-zip");
const quoteShippingButton = document.getElementById("quote-shipping-button");
const detectLocationButton = document.getElementById("detect-location-button");
const shippingRatesPanel = document.getElementById("shipping-rates");
const shippingStatus = document.getElementById("shipping-status");
const shippingCountrySelect = document.getElementById("shipping-country");
const shippingZipLabel = document.getElementById("shipping-zip-label");
const taxLabel = document.getElementById("tax-label");
const currencyNote = document.getElementById("currency-note");
const discountRow = document.getElementById("discount-row");
const giftCardRow = document.getElementById("gift-card-row");
const pointsRow = document.getElementById("points-row");
const amountDueRow = document.getElementById("amount-due-row");
const pointsToggle = document.getElementById("points-toggle");
const usePointsInput = document.getElementById("use-points");
const pointsEarn = document.getElementById("points-earn");
const COUNTRY_KEY = "lyrshopShippingCountry";
// The quoted rates were for this country; they're cleared when the shopper picks another.
let quotedCountry = "US";
// The ZIP the current carrier rates were quoted for; the server re-quotes the same rates at checkout.
let quotedZip = "";
// Codes the shopper applied; the server checks them on every quote and again at checkout.
const appliedCodes = { coupon: "", gift_card: "" };
let usePoints = false;
// The server's latest price check of this exact cart, shown in place of the browser's estimate.
let serverQuote = null;
let quoteRequest = 0;
let quoteTimer = null;
const PLACEHOLDER_IMAGE_URL = "logo.svg";
const MAX_CART_UNITS = 500;

const DOMESTIC_SHIPPING = {
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

let shippingMethods = DOMESTIC_SHIPPING;

const paymentMethods = {
  stripe: {
    label: "Stripe Checkout",
    gateway: "Stripe",
  },
};

function readStoredCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(storedCart) ? storedCart : [];
  } catch (error) {
    console.warn("Stored cart is invalid, starting with an empty cart.", error);
    return [];
  }
}

let cart = readStoredCart();
let checkoutInProgress = false;
// Product details by id, for photos and links; the cart itself stores only id, name and price.
let productDetails = new Map();

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateHeaderCounts();
}

function getSelectedRadioValue(inputs, fallback) {
  const selected = Array.from(inputs).find((input) => input.checked);
  return selected ? selected.value : fallback;
}

function shippingCountry() {
  return shippingCountrySelect?.value || "US";
}

function getCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const shippingKey = getSelectedRadioValue(shippingMethodInputs, "usps");
  const paymentKey = getSelectedRadioValue(paymentMethodInputs, "stripe");
  const shipping = shippingMethods[shippingKey] || Object.values(shippingMethods)[0];
  const payment = paymentMethods[paymentKey] || paymentMethods.stripe;
  // Tax depends on the delivery state or country (some have none), so only the server's quote shows it.
  const tax = 0;
  // Nothing ships from an empty cart.
  const shippingCost = cart.length ? shipping.cost : 0;
  const total = subtotal + shippingCost + tax;

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
      <em>${formatPrice(rate.cost)}</em>
    </label>
  `).join("");

  shippingMethodInputs = document.querySelectorAll('input[name="shipping-method"]');
  shippingMethodInputs.forEach((input) => input.addEventListener("change", renderCart));
}

async function quoteShippingRates() {
  if (!shippingZipInput || !shippingStatus) return;

  const zip = shippingZipInput.value.trim();
  const country = shippingCountry();
  if (!zip && country === "US") {
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
      body: JSON.stringify({ destination_zip: zip, destination_country: country, items: cart }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || "Shipping quote failed");

    const rates = (json.rates || [])
      .map((rate) => [rate.id, normalizeShippingRate(rate)])
      .filter(([, rate]) => Boolean(rate));

    if (!rates.length) throw new Error("No shipping rates returned");

    const selectedKey = rates[0][0];
    shippingMethods = Object.fromEntries(rates);
    quotedCountry = country;
    quotedZip = zip;
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

// One line per product and chosen options (a tee in M and in L are separate lines).
function lineKey(item) {
  return `${item.id}|${item.variant || ""}`;
}

// The cart keeps one entry per unit; show one row per line with a quantity.
function groupCart() {
  const groups = new Map();
  cart.forEach((item) => {
    const key = lineKey(item);
    const group = groups.get(key) || { ...item, key, quantity: 0 };
    group.quantity += 1;
    groups.set(key, group);
  });
  return [...groups.values()];
}

function setQuantity(key, quantity) {
  const sample = cart.find((item) => lineKey(item) === key);
  if (!sample) return;
  const others = cart.filter((item) => lineKey(item) !== key);
  // Checkout accepts up to MAX_CART_UNITS units in one order.
  const allowed = Math.min(Math.max(0, quantity), MAX_CART_UNITS - others.length);
  cart = [...others, ...Array.from({ length: allowed }, () => ({ ...sample }))];
  saveCart();
  renderCart();
}

function renderCart() {
  const groups = groupCart();
  cartCountLabel.textContent = cart.length ? `${cart.length} item${cart.length === 1 ? "" : "s"}` : "";

  if (!groups.length) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <img src="logo.svg" alt="" />
        <h2>Your cart is empty</h2>
        <p>Find something you love and it will show up here.</p>
        <a href="index.html#product-list" class="button button-primary">Start shopping</a>
      </div>`;
  } else {
    cartItems.innerHTML = groups.map((item) => {
      const details = productDetails.get(String(item.id)) || {};
      const image = details.image_url || PLACEHOLDER_IMAGE_URL;
      const link = `product.html?id=${encodeURIComponent(item.id)}`;
      return `
        <article class="cart-line" data-line-id="${escapeHtml(item.id)}" data-quantity="${item.quantity}">
          <a href="${escapeHtml(link)}" class="cart-line-image"><img src="${escapeHtml(image)}" alt="" loading="lazy" /></a>
          <div class="cart-line-info">
            <a href="${escapeHtml(link)}" class="cart-line-name">${escapeHtml(item.name)}</a>
            ${item.variant ? `<small class="cart-line-variant">${escapeHtml(item.variant)}</small>` : ""}
            ${details.brand ? `<small>${escapeHtml(details.brand)}</small>` : ""}
            <span class="cart-line-each">${formatPrice(item.price)} each</span>
            <span class="cart-line-business" hidden>Business price</span>
          </div>
          <div class="cart-line-qty" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
            <button type="button" data-qty="${escapeHtml(item.key)}" data-step="-1" aria-label="Decrease quantity">&minus;</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty="${escapeHtml(item.key)}" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <strong class="cart-line-total">${formatPrice(item.price * item.quantity)}</strong>
          <button type="button" class="cart-line-remove" data-remove="${escapeHtml(item.key)}">Remove</button>
        </article>`;
    }).join("");
  }

  document.querySelectorAll(".needs-items").forEach((section) => { section.hidden = !cart.length; });
  const steps = document.querySelectorAll(".checkout-steps li");
  steps[0].classList.toggle("is-done", cart.length > 0);
  steps[0].classList.toggle("is-current", !cart.length);
  steps[1].classList.toggle("is-current", cart.length > 0);
  checkoutButton.disabled = !cart.length || checkoutInProgress;

  serverQuote = null;
  renderTotals();
  scheduleQuote();
}

// ── Server quote: coupons, gift cards and points ───────────────────────────────
// The browser's totals are only an estimate shown while the server prices the cart; checkout uses the server's.

function shippingRequest() {
  return {
    country: shippingCountry(),
    zip: shippingMethods === DOMESTIC_SHIPPING ? "" : quotedZip,
    // Picks the state's sales tax even before carrier rates are quoted.
    tax_zip: shippingZipInput.value.trim(),
    method: getSelectedRadioValue(shippingMethodInputs, "usps"),
  };
}

function checkoutRequest() {
  return {
    items: cart.map(({ id, name, variant, options }) => ({ id, name, ...(variant ? { variant, options } : {}) })),
    shipping: shippingRequest(),
    coupon_code: appliedCodes.coupon,
    gift_card_code: appliedCodes.gift_card,
    use_points: usePoints,
    ref: readReferral(),
  };
}

function authHeaders() {
  const token = getCurrentUser()?.token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function scheduleQuote() {
  window.clearTimeout(quoteTimer);
  if (!cart.length) return;
  quoteTimer = window.setTimeout(fetchQuote, 250);
}

async function fetchQuote() {
  const request = ++quoteRequest;
  try {
    const response = await fetch(`${API_BASE_URL}/checkout/quote`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(checkoutRequest()),
    });
    if (!(response.headers.get("Content-Type") || "").includes("application/json")) return;
    const json = await response.json();
    if (request !== quoteRequest) return;
    if (!response.ok) {
      setCheckoutState(json.message || "");
      return;
    }
    serverQuote = json;
    renderCodeStatus("coupon", json.errors?.coupon, json.coupon && `${json.coupon.code} applied${json.coupon.description ? `: ${json.coupon.description}` : ""}.`);
    renderCodeStatus("gift_card", json.errors?.gift_card,
      json.gift_card && `Gift card ${json.gift_card.code} applied. ${formatPrice(json.gift_card.remaining_after)} will be left on it.`);
    renderTotals();
  } catch (error) {
    console.warn("Checkout quote unavailable; showing the browser's estimate.", error);
  }
}

function codeForm(kind) {
  return document.querySelector(`.code-form[data-code-kind="${kind}"]`);
}

function renderCodeStatus(kind, error, appliedText) {
  const form = codeForm(kind);
  const status = form.querySelector(".code-status");
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  if (error) appliedCodes[kind] = "";
  const applied = Boolean(appliedCodes[kind] && appliedText);
  input.disabled = applied;
  button.textContent = applied ? "Remove" : "Apply";
  status.classList.toggle("is-error", Boolean(error));
  status.textContent = error || (applied ? appliedText : "");
}

function renderTotals() {
  const estimate = getCheckoutTotals();
  const quote = serverQuote;
  const money = quote
    ? { subtotal: quote.subtotal, discount: quote.discount_total, shipping: quote.shipping_total, tax: quote.tax_total,
        total: quote.total, giftCard: quote.gift_card_applied, points: quote.points_value, due: quote.amount_due }
    : { subtotal: estimate.subtotal, discount: 0, shipping: cart.length ? estimate.shipping.cost : 0, tax: estimate.tax,
        total: estimate.total, giftCard: 0, points: 0, due: estimate.total };
  cartSubtotal.textContent = formatPrice(money.subtotal);
  shippingTotal.textContent = formatPrice(money.shipping);
  // Abroad, VAT/GST is an estimate the carrier collects on delivery; it isn't part of the total.
  const onDelivery = quote?.tax_info?.due_on_delivery;
  taxTotal.textContent = formatPrice(onDelivery ?? money.tax);
  cartTotal.textContent = formatPrice(money.total);
  discountRow.hidden = !(money.discount > 0);
  document.getElementById("discount-label").textContent = quote?.coupon ? `Coupon ${quote.coupon.code}` : "Coupon";
  document.getElementById("discount-total").textContent = `−${formatPrice(money.discount)}`;
  giftCardRow.hidden = !(money.giftCard > 0);
  document.getElementById("gift-card-total").textContent = `−${formatPrice(money.giftCard)}`;
  pointsRow.hidden = !(money.points > 0);
  document.getElementById("points-label").textContent = quote ? `${quote.points_redeemed.toLocaleString()} points` : "Points";
  document.getElementById("points-total").textContent = `−${formatPrice(money.points)}`;
  amountDueRow.hidden = money.due === money.total;
  document.getElementById("amount-due").textContent = formatPrice(money.due);
  checkoutButton.textContent = checkoutInProgress ? checkoutButton.textContent
    : quote && cart.length && money.due === 0 ? "Place order" : "Checkout with Stripe";

  const signedIn = Boolean(getCurrentUser());
  const available = quote?.points_available || 0;
  pointsToggle.hidden = !signedIn || available <= 0;
  usePointsInput.checked = usePoints;
  document.getElementById("points-toggle-text").textContent =
    `Use my ${available.toLocaleString()} points (worth ${formatPrice(quote?.points_available_value || 0)})`;
  pointsEarn.hidden = !quote || !quote.points_earned;
  pointsEarn.textContent = quote
    ? (signedIn ? `You'll earn ${quote.points_earned.toLocaleString()} points with this order.`
      : `Sign in to earn ${quote.points_earned.toLocaleString()} points with this order.`)
    : "";
  renderCurrencyNote({ total: money.due });
  renderBusinessPricing(quote);
}

// Approved business accounts get wholesale tier prices from the server's quote; show them on each line.
function renderBusinessPricing(quote) {
  const prices = new Map((quote?.items || []).map((item) => [String(item.id), item.price]));
  cartItems.querySelectorAll(".cart-line[data-line-id]").forEach((line) => {
    const sample = cart.find((item) => String(item.id) === line.dataset.lineId);
    const price = prices.get(line.dataset.lineId) ?? sample?.price ?? 0;
    const business = Boolean(quote) && quote.buyer_type === "business" && sample && price < sample.price;
    line.querySelector(".cart-line-each").textContent = `${formatPrice(price)} each`;
    line.querySelector(".cart-line-total").textContent = formatPrice(price * Number(line.dataset.quantity));
    line.querySelector(".cart-line-business").hidden = !business;
  });
  const savings = document.getElementById("business-savings");
  savings.hidden = !(quote?.wholesale_savings > 0);
  savings.textContent = quote?.wholesale_savings > 0 ? `Business pricing saved you ${formatPrice(quote.wholesale_savings)}.` : "";
}

function renderCurrencyNote(totals) {
  // Tax-free places (no sales tax or VAT, or a tax-exempt business) get no tax line at all, just a short note.
  const tax = serverQuote?.tax_info;
  document.getElementById("tax-row").hidden = !tax || tax.tax_free;
  if (tax) {
    const place = tax.place || (tax.country && LyrLocale.countryName(tax.country));
    taxLabel.textContent = tax.tax_name
      ? `Estimated ${tax.tax_name} (${place}, ${Number((tax.rate * 100).toFixed(3))}%), due on delivery`
      : tax.label;
  }
  const notes = [];
  if (LyrLocale.isLocalCurrency()) {
    notes.push(`Prices are shown in ${LyrLocale.currency()} at today's rate. Stripe charges in ${LyrLocale.currency()} where it supports it; otherwise you pay ${LyrLocale.formatUsd(totals.total)} USD.`);
  }
  if (tax?.note) notes.push(tax.note);
  currencyNote.textContent = notes.join(" ");
  currencyNote.hidden = !notes.length || !cart.length;
}

function setCheckoutState(message, inProgress = false) {
  checkoutInProgress = inProgress;
  if (checkoutStatus) checkoutStatus.textContent = message || "";
  if (checkoutButton) {
    checkoutButton.disabled = inProgress || !cart.length;
    checkoutButton.textContent = inProgress ? "Starting checkout..." : "Checkout with Stripe";
  }
}

async function loadProductDetails() {
  try {
    // Regional prices follow the ship-to country, the same way checkout prices them.
    const response = await fetch(shopperProductsUrl(API_BASE_URL, shippingCountry()));
    if (!response.ok) return;
    const json = await response.json();
    productDetails = new Map((json.products || []).map((product) => [String(product.id), product]));
    // Cart prices follow the listing, so a sales-calendar discount reaches items already in the cart and ends with it.
    let repriced = false;
    cart.forEach((item) => {
      const product = productDetails.get(String(item.id));
      const { price } = product ? listingPrices(product) : {};
      if (price > 0 && price !== item.price) {
        item.price = price;
        repriced = true;
      }
    });
    if (repriced) saveCart();
    renderCart();
  } catch (error) {
    console.warn("Product details unavailable; showing the cart without photos.", error);
  }
}

async function checkout() {
  if (!cart.length || checkoutInProgress) return;
  const user = getCurrentUser();

  if (!user) {
    localStorage.setItem("lyrshopAuthReturnTo", "cart.html");
    window.location.href = "auth.html";
    return;
  }

  setCheckoutState("Starting checkout...", true);
  let result;
  try {
    // The server prices the cart, applies codes and points, saves the order and opens Stripe for what's left.
    const response = await fetch(`${API_BASE_URL}/checkout/session`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        ...checkoutRequest(),
        display_currency: LyrLocale.currency(),
        success_url: `${window.location.origin}/dashboard.html`,
        cancel_url: `${window.location.origin}/cart.html`,
      }),
    });
    result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCheckoutState(response.status === 401 ? "Please sign in again to check out." : (result.message || "Checkout failed. Please try again."));
      scheduleQuote();
      return;
    }
  } catch (error) {
    console.warn("Checkout failed.", error);
    setCheckoutState("We couldn't reach checkout. Check your connection and try again.");
    return;
  }

  saveOrderForCurrentUser(result.order);
  cart = [];
  appliedCodes.coupon = "";
  appliedCodes.gift_card = "";
  usePoints = false;
  saveCart();
  renderCart();
  if (result.paid) {
    setCheckoutState("Order placed and paid with your gift card and points. Taking you to your orders...", true);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
    return;
  }
  if (result.stripe_configured && result.checkout_url) {
    setCheckoutState("Redirecting to Stripe...", true);
    window.location.href = result.checkout_url;
    return;
  }
  setCheckoutState("Order placed! Stripe payments are not configured — redirecting to your orders...");
  setTimeout(() => { window.location.href = "dashboard.html"; }, 2000);
}

function renderCheckoutAccount() {
  const user = getCurrentUser();
  const link = document.getElementById("account-link");
  link.textContent = user ? `Hi, ${String(user.name || "there").split(" ")[0]}` : "Sign in";
  link.href = user ? "dashboard.html" : "auth.html";
}

cartItems.addEventListener("click", (event) => {
  const step = event.target.closest("[data-qty]");
  if (step) {
    const current = cart.filter((item) => lineKey(item) === step.dataset.qty).length;
    setQuantity(step.dataset.qty, current + Number(step.dataset.step));
    return;
  }
  const remove = event.target.closest("[data-remove]");
  if (remove) setQuantity(remove.dataset.remove, 0);
});

// Another tab changed the cart (e.g. added an item); show it here too.
window.addEventListener("storage", (event) => {
  if (event.key !== CART_KEY) return;
  cart = readStoredCart();
  renderCart();
});

checkoutButton.addEventListener("click", checkout);
quoteShippingButton.addEventListener("click", quoteShippingRates);
detectLocationButton.addEventListener("click", detectUserLocation);
paymentMethodInputs.forEach((input) => input.addEventListener("change", renderCart));

function initShippingCountry() {
  shippingCountrySelect.innerHTML = LyrLocale.countryOptions()
    .map(({ code, name }) => `<option value="${code}">${escapeHtml(name)}</option>`)
    .join("");
  let saved = null;
  try { saved = localStorage.getItem(COUNTRY_KEY); } catch { /* storage blocked */ }
  shippingCountrySelect.value = saved || LyrLocale.country() || "US";
  if (!shippingCountrySelect.value) shippingCountrySelect.value = "US";
  syncCountryFields();
}

// US addresses use a ZIP code; elsewhere the postal code is optional for an estimate.
function syncCountryFields() {
  const isUs = shippingCountry() === "US";
  shippingZipLabel.textContent = isUs ? "Delivery ZIP code" : "Postal code (optional)";
  shippingZipInput.placeholder = isUs ? "10001" : "";
  shippingZipInput.inputMode = isUs ? "numeric" : "text";
  detectLocationButton.hidden = !isUs;
}

// A new ZIP can change the state's sales tax, or make the order tax-free.
shippingZipInput.addEventListener("input", scheduleQuote);

shippingCountrySelect.addEventListener("change", () => {
  try { localStorage.setItem(COUNTRY_KEY, shippingCountry()); } catch { /* storage blocked */ }
  syncCountryFields();
  if (shippingCountry() !== quotedCountry) {
    quotedCountry = shippingCountry();
    quotedZip = "";
    loadProductDetails();
    if (shippingCountry() === "US") {
      shippingMethods = DOMESTIC_SHIPPING;
      renderShippingRates();
      shippingStatus.textContent = "Enter a ZIP code to compare USPS, UPS, and FedEx.";
    } else {
      shippingRatesPanel.innerHTML = "";
      quoteShippingRates();
    }
  }
  renderCart();
});

// Prices re-render when the visitor's currency is detected or changed.
LyrLocale.onChange(() => {
  renderShippingRates();
  renderCart();
});

document.querySelectorAll(".code-form").forEach((form) => form.addEventListener("submit", (event) => {
  event.preventDefault();
  const kind = form.dataset.codeKind;
  const input = form.querySelector("input");
  if (appliedCodes[kind]) {
    appliedCodes[kind] = "";
    input.value = "";
    renderCodeStatus(kind, "", "");
  } else {
    appliedCodes[kind] = input.value.trim().toUpperCase();
    if (!appliedCodes[kind]) return;
    form.querySelector(".code-status").textContent = "Checking...";
  }
  serverQuote = null;
  renderTotals();
  fetchQuote();
}));

usePointsInput.addEventListener("change", () => {
  usePoints = usePointsInput.checked;
  fetchQuote();
});

initShippingCountry();
shippingZipInput.value = getStoredZip();
renderCheckoutAccount();
renderShippingRates();
renderCart();
loadProductDetails();
if (shippingCountry() !== "US" && cart.length) quoteShippingRates();
