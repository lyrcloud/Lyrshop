const DETAIL_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
const DETAIL_REQUEST_TIMEOUT_MS = 2000;
const DETAIL_CATEGORIES_KEY = "lyrshopCategories";

const detailCategories = [
  { name: "Electronics", label: "Electronics", subcategories: ["Computers & tablets", "Phones", "Cameras", "Accessories"] },
  { name: "Audio", label: "Audio", subcategories: ["Headphones", "Speakers", "Microphones", "Home audio"] },
  { name: "Home", label: "Home & Garden", subcategories: ["Lighting", "Kitchen", "Furniture", "Garden"] },
  { name: "Lifestyle", label: "Fashion", subcategories: ["Bags", "Shoes", "Accessories", "Activewear"] },
  { name: "Stationery", label: "Collectibles", subcategories: ["Pens", "Notebooks", "Art supplies", "Memorabilia"] },
];

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
}

function normalizeProduct(product) {
  const price = Number(product.price);
  if (!Number.isFinite(price)) return null;
  return {
    ...product,
    price,
    original_price: Number(product.original_price) || price * 1.5,
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
            ${(category.subcategories || []).map((subcategory) => `
              <a class="category-menu-link" href="index.html?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(subcategory)}#product-list">${escapeHtml(subcategory)}</a>
            `).join("")}
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
    ["Brand", "Lyrshop"],
    ["Category", product.category],
    ["Model", product.id.toUpperCase()],
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
  const title = `${product.name} - ${product.description}`;
  document.title = `${product.name} - Lyrshop`;
  document.getElementById("breadcrumb-category").textContent = product.category;
  document.getElementById("breadcrumb-product").textContent = product.name;
  document.getElementById("detail-title").textContent = title;
  document.getElementById("detail-subtitle").textContent = `${product.rating.toFixed(1)} out of 5 seller rating | ${product.category}`;
  document.getElementById("detail-price").textContent = `$${product.price.toFixed(2)}`;
  document.getElementById("detail-description").textContent = product.description;

  const originalPrice = document.getElementById("detail-original-price");
  originalPrice.textContent = product.original_price > product.price ? `Was $${product.original_price.toFixed(2)}` : "";

  const detailImage = document.getElementById("detail-image");
  detailImage.src = product.image_url;
  detailImage.alt = product.name;

  renderSpecifics(product);
}

function bindActions(product) {
  const quantitySelect = document.getElementById("quantity-select");
  document.getElementById("detail-cart-button").addEventListener("click", () => {
    addProductToCart(product, Number(quantitySelect.value));
    alert("Item added to cart.");
  });

  document.getElementById("buy-now-button").addEventListener("click", () => {
    addProductToCart(product, Number(quantitySelect.value));
    window.location.href = getCurrentUser() ? "dashboard.html" : "auth.html";
  });

  document.getElementById("detail-search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("detail-search-input").value.trim();
    window.location.href = query ? `index.html?search=${encodeURIComponent(query)}#product-list` : "index.html#product-list";
  });
}

async function initProductDetail() {
  bindCategoryMenu();
  const products = await fetchProducts();
  const product = products.find((item) => String(item.id) === requestedId) || products[0];
  if (!product) {
    document.getElementById("detail-title").textContent = "Product not found.";
    return;
  }
  renderProduct(product);
  bindActions(product);
}

initProductDetail();
