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
const PLACEHOLDER_IMAGE_URL = "logo.svg";
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

function getCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const shippingKey = getSelectedRadioValue(shippingMethodInputs, "usps");
  const paymentKey = getSelectedRadioValue(paymentMethodInputs, "stripe");
  const shipping = shippingMethods[shippingKey] || shippingMethods.usps;
  const payment = paymentMethods[paymentKey] || paymentMethods.stripe;
  const tax = subtotal * TAX_RATE;
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

// The cart keeps one entry per unit; show one row per product with a quantity.
function groupCart() {
  const groups = new Map();
  cart.forEach((item) => {
    const key = String(item.id);
    const group = groups.get(key) || { ...item, quantity: 0 };
    group.quantity += 1;
    groups.set(key, group);
  });
  return [...groups.values()];
}

function setQuantity(productId, quantity) {
  const key = String(productId);
  const sample = cart.find((item) => String(item.id) === key);
  if (!sample) return;
  const others = cart.filter((item) => String(item.id) !== key);
  cart = [...others, ...Array.from({ length: Math.max(0, quantity) }, () => ({ ...sample }))];
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
        <article class="cart-line">
          <a href="${escapeHtml(link)}" class="cart-line-image"><img src="${escapeHtml(image)}" alt="" loading="lazy" /></a>
          <div class="cart-line-info">
            <a href="${escapeHtml(link)}" class="cart-line-name">${escapeHtml(item.name)}</a>
            ${details.brand ? `<small>${escapeHtml(details.brand)}</small>` : ""}
            <span class="cart-line-each">$${formatCurrency(item.price)} each</span>
          </div>
          <div class="cart-line-qty" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
            <button type="button" data-qty="${escapeHtml(item.id)}" data-step="-1" aria-label="Decrease quantity">&minus;</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty="${escapeHtml(item.id)}" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <strong class="cart-line-total">$${formatCurrency(item.price * item.quantity)}</strong>
          <button type="button" class="cart-line-remove" data-remove="${escapeHtml(item.id)}">Remove</button>
        </article>`;
    }).join("");
  }

  document.querySelectorAll(".needs-items").forEach((section) => { section.hidden = !cart.length; });
  const steps = document.querySelectorAll(".checkout-steps li");
  steps[0].classList.toggle("is-done", cart.length > 0);
  steps[0].classList.toggle("is-current", !cart.length);
  steps[1].classList.toggle("is-current", cart.length > 0);
  checkoutButton.disabled = !cart.length || checkoutInProgress;

  const totals = getCheckoutTotals();
  cartSubtotal.textContent = totals.subtotal.toFixed(2);
  shippingTotal.textContent = (cart.length ? totals.shipping.cost : 0).toFixed(2);
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

async function loadProductDetails() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) return;
    const json = await response.json();
    productDetails = new Map((json.products || []).map((product) => [String(product.id), product]));
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
        cancel_url: `${window.location.origin}/cart.html`,
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
      // The sign-in token ties the order to this account, so it shows under Purchases on any device.
      headers: { "Content-Type": "application/json", ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}) },
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

function renderCheckoutAccount() {
  const user = getCurrentUser();
  const link = document.getElementById("account-link");
  link.textContent = user ? `Hi, ${String(user.name || "there").split(" ")[0]}` : "Sign in";
  link.href = user ? "dashboard.html" : "auth.html";
}

cartItems.addEventListener("click", (event) => {
  const step = event.target.closest("[data-qty]");
  if (step) {
    const current = cart.filter((item) => String(item.id) === step.dataset.qty).length;
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

shippingZipInput.value = getStoredZip();
renderCheckoutAccount();
renderShippingRates();
renderCart();
loadProductDetails();
