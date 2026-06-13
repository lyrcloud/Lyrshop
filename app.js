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
const searchInput = document.getElementById("search-input");
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

const defaultStorefrontCategories = [
  {
    name: "Electronics",
    label: "Electronics",
    subcategories: ["Computers & tablets", "Phones", "Cameras", "Accessories"],
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=320&q=70",
  },
  {
    name: "Audio",
    label: "Audio",
    subcategories: ["Headphones", "Speakers", "Microphones", "Home audio"],
    image_url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=320&q=70",
  },
  {
    name: "Home",
    label: "Home & Garden",
    subcategories: ["Lighting", "Kitchen", "Furniture", "Garden"],
    image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=320&q=70",
  },
  {
    name: "Lifestyle",
    label: "Fashion",
    subcategories: ["Bags", "Shoes", "Accessories", "Activewear"],
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=320&q=70",
  },
  {
    name: "Stationery",
    label: "Collectibles",
    subcategories: ["Pens", "Notebooks", "Art supplies", "Memorabilia"],
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=320&q=70",
  },
];

const fallbackProducts = [
  {
    id: "demo-1",
    name: "Premium Wireless Headphones",
    description: "Noise-canceling, 30-hour battery.",
    price: 79.99,
    original_price: 129.99,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=60",
    rating: 4.8,
  },
  {
    id: "demo-2",
    name: "Portable Bluetooth Speaker",
    description: "Rich bass, waterproof design.",
    price: 49.99,
    original_price: 79.99,
    category: "Audio",
    image_url: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=500&q=60",
    rating: 4.6,
  },
  {
    id: "demo-3",
    name: "Modern Desk Lamp LED",
    description: "Eye-care, adjustable brightness.",
    price: 39.99,
    original_price: 69.99,
    category: "Home",
    image_url: "https://images.unsplash.com/photo-1565636192335-14a8df713be0?auto=format&fit=crop&w=500&q=60",
    rating: 4.7,
  },
  {
    id: "demo-4",
    name: "Smart Digital Pen",
    description: "Cloud-synced notes and sketches.",
    price: 22.99,
    original_price: 39.99,
    category: "Stationery",
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=500&q=60",
    rating: 4.5,
  },
  {
    id: "demo-5",
    name: "Sustainable Eco Backpack",
    description: "Durable, weather-resistant fabric.",
    price: 64.99,
    original_price: 129.99,
    category: "Lifestyle",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=60",
    rating: 4.9,
  },
  {
    id: "demo-6",
    name: "Ultra-Thin Wireless Mouse",
    description: "Precision tracking, long battery.",
    price: 27.99,
    original_price: 49.99,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=500&q=60",
    rating: 4.4,
  },
];

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
let checkoutInProgress = false;

if (searchInput && searchQuery) {
  searchInput.value = searchQuery;
}

function saveCart() {
  localStorage.setItem("shopCart", JSON.stringify(cart));
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

function setActiveCategory(categoryName, subcategory = "") {
  activeCategory = categoryName || "All";
  activeSubcategory = subcategory;
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.category === activeCategory);
  });
  renderProductCards(getFilteredProducts());
}

function renderCategoryMenu(categories) {
  if (!categoryMenuPanel) return;

  categoryMenuPanel.innerHTML = `
    <div class="category-menu-grid">
      ${categories.map((category) => `
        <section class="category-menu-group">
          <button type="button" class="category-menu-heading" data-menu-category="${escapeHtml(category.name)}">${escapeHtml(category.label)}</button>
          <div>
            ${(category.subcategories || []).map((subcategory) => `
              <button type="button" class="category-menu-link" data-menu-category="${escapeHtml(category.name)}" data-menu-subcategory="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</button>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderStorefrontCategories() {
  const categories = readStorefrontCategories();
  const nav = document.querySelector(".nav-categories");
  const showcase = document.querySelector(".category-showcase");
  const searchSelect = document.querySelector(".search-bar select");

  if (nav) {
    nav.innerHTML = `
      <button class="nav-item ${activeCategory === "All" ? "active" : ""}" data-category="All">All</button>
      ${categories.map((category) => `
        <button class="nav-item ${activeCategory === category.name ? "active" : ""}" data-category="${escapeHtml(category.name)}">${escapeHtml(category.label)}</button>
      `).join("")}
    `;
    navItems = document.querySelectorAll(".nav-item");
  }

  if (showcase) {
    showcase.innerHTML = categories.map((category) => `
      <a href="#product-list" class="category-shortcut" data-shortcut-category="${escapeHtml(category.name)}">
        <span class="shortcut-image"><img src="${escapeHtml(category.image_url || defaultStorefrontCategories[0].image_url)}" alt="" /></span>
        <strong>${escapeHtml(category.label)}</strong>
      </a>
    `).join("");
    categoryShortcuts = document.querySelectorAll(".category-shortcut");
  }

  if (searchSelect) {
    searchSelect.innerHTML = `
      <option>All Categories</option>
      ${categories.map((category) => `<option>${escapeHtml(category.label)}</option>`).join("")}
    `;
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
        <span>${item.name}</span>
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

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  return filtered;
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

function renderProductCards(products) {
  productList.innerHTML = "";

  if (products.length === 0) {
    productList.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666;'>No products found.</p>";
    return;
  }

  products.forEach((product) => {
    const discount = getDiscountPercent(product.original_price, product.price);
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <a class="card-image product-card-link" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
        <img src="${product.image_url}" alt="${product.name}" />
        ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ""}
      </a>
      <div class="card-content">
        <h3 class="product-name"><a href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-rating">${renderStars(product.rating || 4)}</div>
        <div class="product-pricing">
          <span class="current-price">$${product.price.toFixed(2)}</span>
          ${product.original_price && product.original_price > product.price ? `<span class="original-price">$${product.original_price.toFixed(2)}</span>` : ""}
        </div>
        <button class="button button-primary add-cart-btn" data-product-id="${product.id}">Add to Cart</button>
      </div>
    `;

    card.querySelector(".add-cart-btn").addEventListener("click", () => {
      cart.push({ id: product.id, name: product.name, price: product.price });
      saveCart();
      renderCart();
    });

    productList.appendChild(card);
  });
}

async function loadProducts() {
  allProducts = fallbackProducts;
  renderProductCards(getFilteredProducts());

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
          original_price: Number(p.original_price) || price * 1.5,
          rating: Number(p.rating) || 4,
          image_url: p.image_url || fallbackProducts[0].image_url,
        };
      })
      .filter(Boolean);

    if (products.length) {
      allProducts = products;
      renderProductCards(getFilteredProducts());
    }
  } catch (error) {
    console.warn("Local backend unavailable, displaying demo products.", error);
  } finally {
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
      window.location.href = checkoutUrl;
      return;
    }
    setCheckoutState("Order saved. Stripe is in mock mode because STRIPE_SECRET_KEY is not configured.");
    window.location.href = "dashboard.html";
    return;
  }

  setCheckoutState("");
}

function renderAccountState() {
  const user = getCurrentUser();
  if (user) {
    accountLink.textContent = "Lyrshop";
    accountLink.href = "dashboard.html";
    return;
  }

  accountLink.textContent = "Lyrshop";
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
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      activeCategory = item.dataset.category;
      renderProductCards(getFilteredProducts());
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

// Search form event listener
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  searchQuery = searchInput.value;
  renderProductCards(getFilteredProducts());
});

function initStorefront() {
  renderStorefrontCategories();
  bindCategoryFilters();
  bindCategoryMenu();
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
