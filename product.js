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

const detailProducts = [
  {
    id: "demo-1",
    name: "Premium Wireless Headphones",
    description: "Noise-canceling, 30-hour battery.",
    price: 79.99,
    original_price: 129.99,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=70",
    rating: 4.8,
  },
  {
    id: "demo-2",
    name: "Portable Bluetooth Speaker",
    description: "Rich bass, waterproof design.",
    price: 49.99,
    original_price: 79.99,
    category: "Audio",
    image_url: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=70",
    rating: 4.6,
  },
  {
    id: "demo-3",
    name: "Modern Desk Lamp LED",
    description: "Eye-care, adjustable brightness.",
    price: 39.99,
    original_price: 69.99,
    category: "Home",
    image_url: "https://images.unsplash.com/photo-1565636192335-14a8df713be0?auto=format&fit=crop&w=900&q=70",
    rating: 4.7,
  },
  {
    id: "demo-4",
    name: "Smart Digital Pen",
    description: "Cloud-synced notes and sketches.",
    price: 22.99,
    original_price: 39.99,
    category: "Stationery",
    image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=70",
    rating: 4.5,
  },
  {
    id: "demo-5",
    name: "Sustainable Eco Backpack",
    description: "Durable, weather-resistant fabric.",
    price: 64.99,
    original_price: 129.99,
    category: "Lifestyle",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=70",
    rating: 4.9,
  },
  {
    id: "demo-6",
    name: "Ultra-Thin Wireless Mouse",
    description: "Precision tracking, long battery.",
    price: 27.99,
    original_price: 49.99,
    category: "Electronics",
    image_url: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=70",
    rating: 4.4,
  },
];

const params = new URLSearchParams(window.location.search);
const requestedId = params.get("id") || "demo-1";

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
    image_url: product.image_url || detailProducts[0].image_url,
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
    return products.length ? products : detailProducts;
  } catch (error) {
    console.warn("Local backend unavailable, displaying demo product details.", error);
    return detailProducts;
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
  renderProduct(product);
  bindActions(product);
}

initProductDetail();
