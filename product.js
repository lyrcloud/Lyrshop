const DETAIL_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
const DETAIL_REQUEST_TIMEOUT_MS = 2000;
const DETAIL_CATEGORIES_KEY = "lyrshopCategories";

const detailCategories = LYRSHOP_DEFAULT_CATEGORIES;

const DETAIL_PLACEHOLDER_IMAGE_URL = "logo.svg";

const params = new URLSearchParams(window.location.search);
const requestedId = params.get("id") || "";

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("shopCart") || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch (error) {
    console.warn("Stored cart is invalid, starting with an empty cart.", error);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("shopCart", JSON.stringify(cart));
  updateHeaderCounts();
}

function normalizeProduct(product) {
  const price = Number(product.price);
  if (!Number.isFinite(price)) return null;
  return {
    ...product,
    price,
    // Only a real seller-set "was" price is shown; never invent a discount.
    original_price: Number(product.compare_at_price) || 0,
    rating: Number(product.rating) || 4,
    image_url: product.image_url || DETAIL_PLACEHOLDER_IMAGE_URL,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readDetailCategories() {
  try {
    const categories = JSON.parse(localStorage.getItem(DETAIL_CATEGORIES_KEY) || "null");
    if (!Array.isArray(categories)) return detailCategories;
    return categories.map((category) => {
      const fallback = detailCategories.find((item) => item.name === category.name) || {};
      return {
        ...category,
        label: category.label || category.name,
        subcategories: Array.isArray(category.subcategories) ? category.subcategories.filter(Boolean) : (fallback.subcategories || []),
      };
    });
  } catch (error) {
    console.warn("Stored categories are invalid, using defaults.", error);
    return detailCategories;
  }
}

// Mega menus show the first few subcategories per group; "See all" opens the whole category.
const CATEGORY_MENU_SUBCATEGORY_LIMIT = 6;

function bindCategoryMenu() {
  const button = document.getElementById("detail-category-menu-button");
  const panel = document.getElementById("detail-category-menu-panel");
  if (!button || !panel) return;

  const categories = readDetailCategories();
  panel.innerHTML = `
    <div class="category-menu-grid">
      ${categories.map((category) => `
        <section class="category-menu-group">
          <a class="category-menu-heading" href="index.html?category=${encodeURIComponent(category.name)}#product-list">${escapeHtml(category.label)}</a>
          <div>
            ${(category.subcategories || []).slice(0, CATEGORY_MENU_SUBCATEGORY_LIMIT).map((subcategory) => `
              <a class="category-menu-link" href="index.html?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subcategory)}#product-list">${escapeHtml(subcategory)}</a>
            `).join("")}
            ${(category.subcategories || []).length > CATEGORY_MENU_SUBCATEGORY_LIMIT ? `
              <a class="category-menu-link category-menu-more" href="index.html?category=${encodeURIComponent(category.name)}#product-list">See all ${escapeHtml(category.label)}</a>
            ` : ""}
          </div>
        </section>
      `).join("")}
    </div>
  `;

  button.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    button.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (event.target.closest(".category-menu-wrap")) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  });
}

async function fetchProducts() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DETAIL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DETAIL_API_BASE_URL}/products`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Product request failed with ${response.status}`);
    const json = await response.json();
    const products = (json.products || []).map(normalizeProduct).filter(Boolean);
    return products;
  } catch (error) {
    console.warn("Product request failed.", error);
    return [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function renderSpecifics(product) {
  const specifics = [
    ["Condition", "New"],
    ["Brand", product.brand
      ? `<a href="index.html?view=brands&brand=${encodeURIComponent(product.brand)}#product-list">${escapeHtml(product.brand)}</a>`
      : "Unbranded"],
    ["Category", escapeHtml(product.category)],
    ["Model", escapeHtml(product.id.toUpperCase())],
    ["Item location", "United States"],
    ["Returns", "30 days"],
  ];

  document.getElementById("specifics-grid").innerHTML = specifics
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function addProductToCart(product, quantity) {
  const cart = readCart();
  for (let i = 0; i < quantity; i += 1) {
    cart.push({ id: product.id, name: product.name, price: product.price });
  }
  saveCart(cart);
}

function renderProduct(product) {
  document.title = `${product.name} - Lyrshop`;
  document.getElementById("breadcrumb-category").textContent = product.category;
  document.getElementById("breadcrumb-product").textContent = product.name;
  document.getElementById("detail-title").textContent = product.name;
  document.getElementById("detail-subtitle").textContent = `${product.rating.toFixed(1)} out of 5 seller rating | ${product.category}`;
  document.getElementById("detail-price").textContent = `$${product.price.toFixed(2)}`;
  document.getElementById("detail-description").textContent = product.description;

  const originalPrice = document.getElementById("detail-original-price");
  const wasPrice = product.original_price > product.price ? `Was $${product.original_price.toFixed(2)}` : "";
  originalPrice.textContent = [wasPrice, wasPrice && product.sale_event].filter(Boolean).join(" · ");

  const detailImage = document.getElementById("detail-image");
  detailImage.src = product.image_url;
  detailImage.alt = product.name;

  renderSpecifics(product);
}

function renderWatchButton(button, product) {
  const watched = isWatched(product.id);
  button.classList.toggle("is-watched", watched);
  button.setAttribute("aria-pressed", String(watched));
  button.innerHTML = watched ? "&#9829; On your watchlist" : "&#9825; Add to Watchlist";
}

function bindActions(product) {
  const quantitySelect = document.getElementById("quantity-select");
  const cartButton = document.getElementById("detail-cart-button");
  cartButton.addEventListener("click", () => {
    const quantity = Number(quantitySelect.value);
    addProductToCart(product, quantity);
    cartButton.classList.add("is-added");
    cartButton.textContent = "Added \u2713";
    window.setTimeout(() => { cartButton.classList.remove("is-added"); cartButton.textContent = "Add to cart"; }, 1400);
    showToast(`${quantity > 1 ? `${quantity} \u00d7 ` : ""}${product.name} added to your cart`,
      { actionLabel: "Go to cart", actionHref: "cart.html" });
  });

  const watchButton = document.querySelector(".watch-button");
  renderWatchButton(watchButton, product);
  watchButton.addEventListener("click", () => {
    const watched = toggleWatchlist(product.id);
    renderWatchButton(watchButton, product);
    showToast(watched ? "Saved to your watchlist" : "Removed from your watchlist",
      watched ? { actionLabel: "View watchlist", actionHref: "index.html?view=watchlist#product-list" } : {});
  });

  document.getElementById("buy-now-button").addEventListener("click", () => {
    addProductToCart(product, Number(quantitySelect.value));
    window.location.href = "cart.html";
  });

}

function bindSearch(products) {
  initSearchBox({
    form: document.getElementById("detail-search-form"),
    getProducts: () => products,
    getCategories: readDetailCategories,
    onSubmit: (query, category) => {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (category) params.set("category", category);
      const search = params.toString();
      window.location.href = `index.html${search ? `?${search}` : ""}#product-list`;
    },
  });
}

async function initProductDetail() {
  bindCategoryMenu();
  const products = await fetchProducts();
  bindSearch(products);
  const product = products.find((item) => String(item.id) === requestedId) || products[0];
  if (!product) {
    document.getElementById("detail-title").textContent = "Product not found.";
    return;
  }
  renderProduct(product);
  bindActions(product);
  recordRecentlyViewed(product.id);
}

initProductDetail();
