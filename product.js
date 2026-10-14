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
    ...listingPrices(product),
    rating: Number(product.rating) || 4,
    image_url: product.image_url || DETAIL_PLACEHOLDER_IMAGE_URL,
    media: productMedia(product),
  };
}

// The seller's ordered photos and videos; listings from before galleries existed show their single photo.
function productMedia(product) {
  const media = (Array.isArray(product.media) ? product.media : [])
    .filter((item) => item && item.url && (item.type === "image" || item.type === "video"));
  return media.length ? media : [{ type: "image", url: product.image_url || DETAIL_PLACEHOLDER_IMAGE_URL }];
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

// ── Options (color, size, ...) ─────────────────────────────────────────────────
// Buyers pick one value of each option the seller offers; the choice travels with the cart line into the order.

const chosenOptions = {};

function swatchStyle(value) {
  const color = String(value).toLowerCase().replace(/\s+/g, "");
  return window.CSS?.supports?.("color", color) ? `background:${color}` : "";
}

function variantLabel(product) {
  return (product.options || []).map((option) => `${option.name}: ${chosenOptions[option.name]}`).join(" · ");
}

function renderOptions(product) {
  const container = document.getElementById("detail-options");
  container.innerHTML = (product.options || []).map((option) => {
    const buttons = option.values.map((value) => option.type === "color"
      ? `<button type="button" class="option-swatch" data-option="${escapeHtml(option.name)}" data-value="${escapeHtml(value)}"
          aria-pressed="false" aria-label="${escapeHtml(value)}" title="${escapeHtml(value)}"><span style="${swatchStyle(value)}"></span></button>`
      : `<button type="button" class="option-pill" data-option="${escapeHtml(option.name)}" data-value="${escapeHtml(value)}"
          aria-pressed="false">${escapeHtml(value)}</button>`).join("");
    return `
      <div class="detail-option" data-option-group="${escapeHtml(option.name)}">
        <p class="detail-option-label">${escapeHtml(option.name)}: <strong data-chosen>Select</strong></p>
        <div class="detail-option-values" role="group" aria-label="${escapeHtml(option.name)}">${buttons}</div>
      </div>`;
  }).join("");
}

function bindOptions() {
  document.getElementById("detail-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    const group = button.closest("[data-option-group]");
    chosenOptions[button.dataset.option] = button.dataset.value;
    group.querySelectorAll("[data-option]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    group.querySelector("[data-chosen]").textContent = button.dataset.value;
    group.classList.remove("is-missing");
    if (!document.querySelector(".detail-option.is-missing")) document.getElementById("option-error").textContent = "";
  });
}

// Returns true when every option has a choice; otherwise flags the missing ones.
function checkOptions(product) {
  const missing = (product.options || []).filter((option) => !chosenOptions[option.name]);
  document.querySelectorAll("[data-option-group]").forEach((group) => {
    group.classList.toggle("is-missing", missing.some((option) => option.name === group.dataset.optionGroup));
  });
  document.getElementById("option-error").textContent = missing.length
    ? `Please choose ${missing.map((option) => option.name.toLowerCase()).join(" and ")}.`
    : "";
  if (missing.length) document.querySelector(".detail-option.is-missing")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return !missing.length;
}

function renderMeasurements(product) {
  const rows = product.measurements || [];
  document.getElementById("detail-measurements").hidden = !rows.length;
  document.getElementById("measurement-grid").innerHTML = rows
    .map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
    .join("");
}

function addProductToCart(product, quantity) {
  const cart = readCart();
  const options = Object.fromEntries((product.options || []).map((option) => [option.name, chosenOptions[option.name]]));
  const variant = variantLabel(product);
  for (let i = 0; i < quantity; i += 1) {
    cart.push({ id: product.id, name: product.name, price: product.price, ...(variant ? { options, variant } : {}) });
  }
  saveCart(cart);
}

// ── Photo zoom ─────────────────────────────────────────────────────────────────
// Hovering magnifies the photo under the pointer; clicking opens it full screen, where a click toggles a closer zoom.

const ZOOM_SCALE = 2.2;
const LIGHTBOX_ZOOM = 2.5;

function bindZoom() {
  const stage = document.getElementById("zoom-stage");
  const image = document.getElementById("detail-image");
  const lightbox = document.getElementById("zoom-lightbox");
  const viewport = document.getElementById("zoom-viewport");
  const zoomImage = document.getElementById("zoom-image");
  const closeButton = document.getElementById("zoom-close");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let returnFocus = null;

  if (!canHover) stage.querySelector(".zoom-hint").textContent = "\u{1F50D} Tap to enlarge";
  if (canHover) {
    stage.addEventListener("pointermove", (event) => {
      if (stage.classList.contains("is-video")) return;
      const box = stage.getBoundingClientRect();
      image.style.transformOrigin = `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`;
      image.style.transform = `scale(${ZOOM_SCALE})`;
      stage.classList.add("is-zooming");
    });
    stage.addEventListener("pointerleave", () => {
      image.style.transform = "";
      stage.classList.remove("is-zooming");
    });
  }

  const setLightboxZoom = (zoomed, event) => {
    viewport.classList.toggle("is-zoomed", zoomed);
    if (!zoomed) {
      zoomImage.style.width = "";
      return;
    }
    // Keep the clicked point under the pointer after enlarging.
    const box = zoomImage.getBoundingClientRect();
    const fx = event ? (event.clientX - box.left) / box.width : 0.5;
    const fy = event ? (event.clientY - box.top) / box.height : 0.5;
    zoomImage.style.width = `${box.width * LIGHTBOX_ZOOM}px`;
    const view = viewport.getBoundingClientRect();
    viewport.scrollLeft = fx * zoomImage.offsetWidth - (event ? event.clientX - view.left : view.width / 2);
    viewport.scrollTop = fy * zoomImage.offsetHeight - (event ? event.clientY - view.top : view.height / 2);
  };

  const open = () => {
    if (!image.src || stage.classList.contains("is-video")) return;
    returnFocus = document.activeElement;
    zoomImage.src = image.src;
    zoomImage.alt = image.alt;
    setLightboxZoom(false);
    lightbox.hidden = false;
    document.body.classList.add("zoom-open");
    closeButton.focus();
  };
  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove("zoom-open");
    returnFocus?.focus();
  };

  stage.addEventListener("click", open);
  stage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  zoomImage.addEventListener("click", (event) => setLightboxZoom(!viewport.classList.contains("is-zoomed"), event));
  closeButton.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) close(); });
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "Tab") {
      event.preventDefault();
      closeButton.focus();
    }
  });
}

function renderPrice(product) {
  document.getElementById("detail-price").textContent = formatPrice(product.price);
  const originalPrice = document.getElementById("detail-original-price");
  const wasPrice = product.original_price > product.price
    ? `Was ${formatPrice(product.original_price)} (${Math.round(((product.original_price - product.price) / product.original_price) * 100)}% off)`
    : "";
  const usdNote = LyrLocale.isLocalCurrency() ? `${LyrLocale.formatUsd(product.price)} USD` : "";
  originalPrice.textContent = [wasPrice, wasPrice && product.sale_event, usdNote].filter(Boolean).join(" · ");
}

function renderProduct(product) {
  document.title = `${product.name} - Lyrshop`;
  document.getElementById("breadcrumb-category").textContent = product.category;
  document.getElementById("breadcrumb-product").textContent = product.name;
  document.getElementById("detail-title").textContent = product.name;
  document.getElementById("detail-subtitle").innerHTML =
    `${ratingStars(product.rating, { label: "out of 5 seller rating" })}<span>${escapeHtml(product.rating.toFixed(1))} seller rating · ${escapeHtml(product.category)}</span>`;
  renderPrice(product);
  LyrLocale.onChange(() => renderPrice(product));
  document.getElementById("detail-description").textContent = product.description;


  renderGallery(product);

  renderSpecifics(product);
  renderOptions(product);
  renderMeasurements(product);
}

// ── Gallery ─────────────────────────────────────────────────────────────────────
// Thumbnails switch the main viewer between photos (with zoom) and videos (with player controls).

function showMedia(product, index) {
  const item = product.media[index];
  const stage = document.getElementById("zoom-stage");
  const image = document.getElementById("detail-image");
  const video = document.getElementById("detail-video");
  const isVideo = item.type === "video";

  video.pause();
  stage.classList.toggle("is-video", isVideo);
  image.hidden = isVideo;
  video.hidden = !isVideo;
  // A video plays inside the stage, so it is not a button that opens the photo viewer.
  if (isVideo) {
    stage.removeAttribute("role");
    stage.removeAttribute("tabindex");
    stage.removeAttribute("aria-label");
    video.src = item.url;
    video.setAttribute("aria-label", `${product.name} video`);
  } else {
    stage.setAttribute("role", "button");
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("aria-label", "Open full-size photo");
    video.removeAttribute("src");
    video.load();
    image.src = item.url;
    image.alt = product.media.length > 1 ? `${product.name}, photo ${index + 1}` : product.name;
  }
  document.querySelectorAll("#gallery-thumbs .gallery-thumb").forEach((thumb, i) => {
    thumb.classList.toggle("is-active", i === index);
    thumb.setAttribute("aria-pressed", String(i === index));
  });
}

function renderGallery(product) {
  const thumbs = document.getElementById("gallery-thumbs");
  thumbs.hidden = product.media.length < 2;
  thumbs.innerHTML = product.media.map((item, index) => `
    <button type="button" class="gallery-thumb${item.type === "video" ? " is-video" : ""}" data-media-index="${index}"
      aria-label="Show ${item.type === "video" ? "video" : "photo"} ${index + 1} of ${product.media.length}">
      ${item.type === "video"
        ? `<video src="${escapeHtml(item.url)}#t=0.1" muted preload="metadata" aria-hidden="true"></video><span class="gallery-play" aria-hidden="true">&#9654;</span>`
        : `<img src="${escapeHtml(item.url)}" alt="" loading="lazy" />`}
    </button>`).join("");
  thumbs.onclick = (event) => {
    const thumb = event.target.closest("[data-media-index]");
    if (thumb) showMedia(product, Number(thumb.dataset.mediaIndex));
  };
  showMedia(product, 0);
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
  bindOptions();
  cartButton.addEventListener("click", () => {
    if (!checkOptions(product)) return;
    const quantity = Number(quantitySelect.value);
    addProductToCart(product, quantity);
    cartButton.classList.add("is-added");
    cartButton.textContent = "Added \u2713";
    window.setTimeout(() => { cartButton.classList.remove("is-added"); cartButton.textContent = "Add to cart"; }, 1400);
    const variant = variantLabel(product);
    showToast(`${quantity > 1 ? `${quantity} \u00d7 ` : ""}${product.name}${variant ? ` (${variant})` : ""} added to your cart`,
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
    if (!checkOptions(product)) return;
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
  bindZoom();
  recordRecentlyViewed(product.id);
}

initProductDetail();
