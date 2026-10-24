const DETAIL_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";
// The whole catalog comes back in one reply (about 300 listings); a cold API start can take several seconds.
const DETAIL_REQUEST_TIMEOUT_MS = 12000;
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

// query: "view=cards" for the similar items and search, or "ids=<id>" for this page's listing in full.
async function fetchProducts(query) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DETAIL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(shopperProductsUrl(DETAIL_API_BASE_URL, undefined, query), { signal: controller.signal });
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
    ["Item location", escapeHtml(itemLocationLabel(product)) + (product.nearby_label ? ` <small>(${escapeHtml(product.nearby_label.toLowerCase())})</small>` : "")],
    ["Returns", "30 days"],
  ];

  document.getElementById("specifics-grid").innerHTML = specifics
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

// ── Options (color, size, ...) ─────────────────────────────────────────────────
// Buyers pick one value of each option the seller offers; the choice travels with the cart line into the order.

const chosenOptions = {};
// For a split color-size option (see splitOption): the option's name -> { color, size } picked so far.
const chosenParts = {};
// Picker groups still waiting for a choice after the shopper tried to buy, as "option|part" keys.
const missingGroups = new Set();
// Above this many colors the color picker is a dropdown rather than a wall of buttons.
const COLOR_MENU_AFTER = 10;

function variantLabel(product) {
  return (product.options || []).map((option) => `${option.name}: ${chosenOptions[option.name]}`).join(" · ");
}

// Supplier listings often fold color and size into one option ("Brown-XL", "Watermelon Red-2xl"). Shoppers get a
// Color picker and a Size picker instead; the pair maps back to the listing's own value, which the cart and order keep.
// Returns null when the option isn't color-size pairs.
const splitCache = new WeakMap();
function splitOption(option) {
  if (splitCache.has(option)) return splitCache.get(option);
  const colors = new Map(); // lowercased color -> the first spelling seen
  const sizes = [];
  const packs = [];
  const entries = [];
  let split = (option.values || []).length > 1 && !/^size/i.test(option.name) ? {} : null;
  for (const value of split ? option.values : []) {
    const variant = LyrSizing.variantParts(value);
    if (!variant) { split = null; break; }
    const { color, size, pack } = variant;
    const key = color.toLowerCase();
    if (!colors.has(key)) colors.set(key, color);
    if (!sizes.includes(size)) sizes.push(size);
    if (pack && !packs.includes(pack)) packs.push(pack);
    entries.push({ value, key, size, pack });
  }
  if (split) {
    const hasPack = packs.length > 0;
    if (hasPack && entries.some((entry) => !entry.pack)) packs.unshift("Standard");
    const values = new Map();
    for (const entry of entries) {
      const pack = entry.pack || (hasPack ? "Standard" : "");
      values.set(`${entry.key}|${entry.size}|${pack}`, entry.value);
    }
    split = {
      colors: [...colors.values()],
      sizes: LyrSizing.sortedValues({ name: "Size", values: sizes }),
      packs,
      value: (parts) => values.get(`${String(parts.color).toLowerCase()}|${parts.size}|${parts.pack || (hasPack ? "Standard" : "")}`),
      has: (parts) => entries.some((entry) =>
        (!parts.color || entry.key === String(parts.color).toLowerCase())
        && (!parts.size || entry.size === parts.size)
        && (!parts.pack || entry.pack === parts.pack || (!entry.pack && parts.pack === "Standard"))),
    };
  }
  splitCache.set(option, split);
  return split;
}

function optionGroup(option, part, label, chosen, chosenAlt, body) {
  const key = `${option.name}|${part}`;
  return `
      <div class="detail-option${missingGroups.has(key) ? " is-missing" : ""}" data-option-group="${escapeHtml(key)}">
        <p class="detail-option-label">${escapeHtml(label)}: <strong data-chosen>${chosen ? escapeHtml(chosen + (chosenAlt ? ` (${chosenAlt})` : "")) : "Select"}</strong></p>
        ${body}
      </div>`;
}

// Buttons for the values of one picker. `unavailable` values are shown but can't be picked with the other choice.
function optionButtons(option, part, label, values, chosen, product, unavailable = new Set()) {
  const shown = { name: label, values, type: part === "color" ? "color" : part === "size" ? "size" : option.type };
  const colorful = part === "color" || (!part && LyrSizing.isColorOption(option));
  const buttons = values.map((value) => {
    const swatch = colorful ? LyrSizing.swatch(LyrSizing.parts(value)[0]) || LyrSizing.swatch(value) : "";
    const alt = LyrSizing.altLabel(value, shown, product);
    const off = unavailable.has(value);
    const data = `data-option="${escapeHtml(option.name)}" data-part="${part}" data-value="${escapeHtml(value)}" aria-pressed="${chosen === value}"${off ? ' aria-disabled="true"' : ""}`;
    const title = escapeHtml(value + (off ? " (not available with your other choice)" : ""));
    if (shown.type === "color" && swatch) {
      return `<button type="button" class="option-swatch${off ? " is-unavailable" : ""}" ${data} aria-label="${title}" title="${title}"><span style="${escapeHtml(swatch)}"></span></button>`;
    }
    return `<button type="button" class="option-pill${swatch ? " has-swatch" : ""}${off ? " is-unavailable" : ""}" ${data} title="${title}">
          ${swatch ? `<span class="option-dot" style="${escapeHtml(swatch)}" aria-hidden="true"></span>` : ""}<span>${escapeHtml(value)}</span>${alt ? `<small class="option-alt">${escapeHtml(alt)}</small>` : ""}</button>`;
  }).join("");
  return `<div class="detail-option-values" role="group" aria-label="${escapeHtml(label)}">${buttons}</div>`;
}

// A collapsed dropdown for long color lists, with a swatch of the chosen color beside it.
function optionMenu(option, part, label, values, chosen, unavailable, otherLabel) {
  const swatch = chosen ? LyrSizing.swatch(chosen) : "";
  const items = values.map((value) => `<option value="${escapeHtml(value)}"${value === chosen ? " selected" : ""}>${escapeHtml(value)}${unavailable.has(value) ? ` (no ${escapeHtml(otherLabel)})` : ""}</option>`).join("");
  return `<div class="option-menu">
          <span class="option-dot" style="${escapeHtml(swatch)}" aria-hidden="true"${swatch ? "" : " hidden"}></span>
          <select data-option="${escapeHtml(option.name)}" data-part="${part}" aria-label="${escapeHtml(label)}">
            ${chosen ? "" : `<option value="" selected disabled>Choose a ${escapeHtml(label.toLowerCase())} (${values.length})</option>`}${items}
          </select>
        </div>`;
}

// Values show a color swatch when they name a color, and sizes/lengths in the shopper's own system (LyrSizing),
// e.g. "42" with "US M 8.5 · W 10.5" for a shopper in the US. Re-rendered when the shopper's country is known.
function renderOptions(product) {
  const container = document.getElementById("detail-options");
  container.innerHTML = (product.options || []).map((option) => {
    const split = splitOption(option);
    if (!split) {
      const chosen = chosenOptions[option.name];
      const values = LyrSizing.sortedValues(option);
      const body = optionButtons(option, "", option.name, values, chosen, product);
      return optionGroup(option, "", option.name, chosen, chosen ? LyrSizing.altLabel(chosen, option, product) : "", body);
    }
    const chosen = chosenParts[option.name] || {};
    const dimensions = [
      { part: "color", label: "Color", values: split.colors },
      { part: "size", label: "Size", values: split.sizes },
      ...(split.packs.length ? [{ part: "pack", label: "Pack", values: split.packs }] : []),
    ];
    return dimensions.map(({ part, label, values }) => {
      const unavailable = new Set(values.filter((value) => !split.has({ ...chosen, [part]: value })));
      const body = part === "color" && values.length > COLOR_MENU_AFTER
        ? optionMenu(option, part, label, values, chosen[part], unavailable, `size ${chosen.size || ""}`)
        : optionButtons(option, part, label, values, chosen[part], product, unavailable);
      const alt = part === "size" && chosen[part]
        ? LyrSizing.altLabel(chosen[part], { name: "Size", values }, product)
        : "";
      return optionGroup(option, part, label, chosen[part], alt, body);
    }).join("");
  }).join("");
  renderSizeHelp(product);
}

// ── Size guide ─────────────────────────────────────────────────────────────────

function renderSizeHelp(product) {
  document.getElementById("size-help").hidden = !LyrSizing.hasGuide(product);
  document.getElementById("size-note").hidden = !LyrSizing.runsSmall(product);
}

function bindSizeGuide(product) {
  const dialog = document.getElementById("size-guide");
  const body = document.getElementById("size-guide-body");
  let unit = null; // Picked on first open, once the shopper's country is known.
  const render = () => {
    unit = unit || (LyrSizing.usesImperial() ? "in" : "cm");
    body.innerHTML = LyrSizing.guideHtml(product, unit);
    dialog.querySelectorAll("[data-unit]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.unit === unit)));
  };
  document.getElementById("size-guide-button").addEventListener("click", () => {
    render();
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  dialog.querySelector(".size-unit-toggle").addEventListener("click", (event) => {
    const button = event.target.closest("[data-unit]");
    if (!button) return;
    unit = button.dataset.unit;
    render();
  });
  document.getElementById("size-guide-close").addEventListener("click", () => dialog.close ? dialog.close() : dialog.removeAttribute("open"));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
}

function bindOptions(product) {
  const container = document.getElementById("detail-options");
  const choose = (control, value) => {
    const name = control.dataset.option;
    const part = control.dataset.part;
    if (part) {
      const split = splitOption(product.options.find((option) => option.name === name));
      const parts = { ...chosenParts[name], [part]: value };
      for (const otherPart of ["color", "size", "pack"]) {
        if (otherPart !== part && parts[otherPart] && !split.has(parts)) delete parts[otherPart];
      }
      chosenParts[name] = parts;
      const listed = parts.color && parts.size && (!split.packs.length || parts.pack) ? split.value(parts) : undefined;
      if (listed) chosenOptions[name] = listed;
      else delete chosenOptions[name];
    } else {
      chosenOptions[name] = value;
    }
    missingGroups.delete(`${name}|${part}`);
    renderOptions(product);
    const selector = control.tagName === "SELECT"
      ? `select[data-option="${CSS.escape(name)}"][data-part="${part}"]`
      : `[data-option="${CSS.escape(name)}"][data-part="${part}"][data-value="${CSS.escape(value)}"]`;
    container.querySelector(selector)?.focus();
    if (!missingGroups.size) document.getElementById("option-error").textContent = "";
  };
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-option]");
    if (button) choose(button, button.dataset.value);
  });
  container.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-option]");
    if (select) choose(select, select.value);
  });
}

// Returns true when every option has a choice; otherwise flags the missing ones.
function checkOptions(product) {
  missingGroups.clear();
  const labels = [];
  for (const option of product.options || []) {
    if (chosenOptions[option.name]) continue;
    if (!splitOption(option)) {
      missingGroups.add(`${option.name}|`);
      labels.push(option.name.toLowerCase());
      continue;
    }
    const parts = chosenParts[option.name] || {};
    const dimensions = split.packs.length ? ["color", "size", "pack"] : ["color", "size"];
    for (const part of dimensions) {
      if (parts[part]) continue;
      missingGroups.add(`${option.name}|${part}`);
      labels.push(part);
    }
  }
  renderOptions(product);
  document.getElementById("option-error").textContent = labels.length ? `Please choose ${labels.join(" and ")}.` : "";
  if (labels.length) document.querySelector(".detail-option.is-missing")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return !labels.length;
}

function renderMeasurements(product) {
  const rows = product.measurements || [];
  document.getElementById("detail-measurements").hidden = !rows.length;
  document.getElementById("measurement-grid").innerHTML = rows
    .map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(LyrSizing.measurementText(row.value))}</dd></div>`)
    .join("");
}

function addProductToCart(product, requested) {
  const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(requested)) || 1));
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
  const regionalNote = product.regional_factor ? `Fair price for your country (listed at ${formatPrice(product.list_price)})` : "";
  originalPrice.textContent = [wasPrice, wasPrice && product.sale_event, regionalNote, usdNote].filter(Boolean).join(" · ");
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

  renderSeller(product);
  renderWholesale(product);
  renderSpecifics(product);
  renderOptions(product);
  renderMeasurements(product);
}

// ── Gallery ─────────────────────────────────────────────────────────────────────
// Thumbnails, arrows, dots, swipes and arrow keys switch the main viewer between photos (with zoom) and videos.
// Photos also advance by themselves; the slideshow waits while the shopper hovers, focuses, zooms or plays a video,
// while the gallery is off screen or the tab is hidden, and stays off for visitors who prefer reduced motion.

const SLIDE_MS = 4500;
const SLIDE_TICK_MS = 100;
const SWIPE_MIN_PX = 40;
const gallery = { product: null, index: 0, elapsed: 0, timer: null, hovering: false, focused: false, visible: true, stopped: false };

function showMedia(product, index, { user = false } = {}) {
  const count = product.media.length;
  index = ((index % count) + count) % count;
  const item = product.media[index];
  const stage = document.getElementById("zoom-stage");
  const image = document.getElementById("detail-image");
  const video = document.getElementById("detail-video");
  const isVideo = item.type === "video";

  gallery.index = index;
  gallery.elapsed = 0;
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
    image.alt = count > 1 ? `${product.name}, photo ${index + 1} of ${count}` : product.name;
    image.classList.remove("is-entering");
    void image.offsetWidth; // Restart the fade.
    image.classList.add("is-entering");
  }
  const thumbs = document.getElementById("gallery-thumbs");
  thumbs.querySelectorAll(".gallery-thumb").forEach((thumb, i) => {
    thumb.classList.toggle("is-active", i === index);
    thumb.setAttribute("aria-pressed", String(i === index));
    // Scroll the strip itself (not the page) so the active thumbnail stays visible.
    if (i === index && thumbs.scrollWidth > thumbs.clientWidth) {
      thumbs.scrollTo({ left: thumb.offsetLeft - (thumbs.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
    }
  });
  document.querySelectorAll("#gallery-dots button").forEach((dot, i) => {
    dot.setAttribute("aria-current", String(i === index));
    dot.style.setProperty("--progress", "0");
  });
  // The full-screen viewer follows along when it is open.
  const zoomImage = document.getElementById("zoom-image");
  if (!document.getElementById("zoom-lightbox").hidden && !isVideo) zoomImage.src = item.url;
}

function slideshowPaused() {
  const video = document.getElementById("detail-video");
  return gallery.stopped || gallery.hovering || gallery.focused || !gallery.visible || document.hidden
    || !document.getElementById("zoom-lightbox").hidden || document.getElementById("size-guide").open
    || (!video.hidden && !video.paused);
}

function tickSlideshow() {
  if (slideshowPaused()) return;
  gallery.elapsed += SLIDE_TICK_MS;
  const dot = document.querySelector('#gallery-dots button[aria-current="true"]');
  dot?.style.setProperty("--progress", String(Math.min(1, gallery.elapsed / SLIDE_MS)));
  if (gallery.elapsed >= SLIDE_MS) showMedia(gallery.product, gallery.index + 1);
}

function renderGallery(product) {
  gallery.product = product;
  const count = product.media.length;
  const several = count > 1;
  const thumbs = document.getElementById("gallery-thumbs");
  thumbs.hidden = !several;
  thumbs.innerHTML = product.media.map((item, index) => `
    <button type="button" class="gallery-thumb${item.type === "video" ? " is-video" : ""}" data-media-index="${index}"
      aria-label="Show ${item.type === "video" ? "video" : "photo"} ${index + 1} of ${count}">
      ${item.type === "video"
        ? `<video src="${escapeHtml(item.url)}#t=0.1" muted preload="metadata" aria-hidden="true"></video><span class="gallery-play" aria-hidden="true">&#9654;</span>`
        : `<img src="${escapeHtml(item.url)}" alt="" loading="lazy" />`}
    </button>`).join("");
  thumbs.onclick = (event) => {
    const thumb = event.target.closest("[data-media-index]");
    if (thumb) showMedia(product, Number(thumb.dataset.mediaIndex), { user: true });
  };

  const dots = document.getElementById("gallery-dots");
  dots.hidden = !several;
  dots.innerHTML = product.media.map((item, index) =>
    `<button type="button" data-dot="${index}" aria-label="Show ${item.type === "video" ? "video" : "photo"} ${index + 1} of ${count}"><span></span></button>`).join("");
  dots.onclick = (event) => {
    const dot = event.target.closest("[data-dot]");
    if (dot) showMedia(product, Number(dot.dataset.dot), { user: true });
  };
  ["gallery-prev", "gallery-next"].forEach((id) => { document.getElementById(id).hidden = !several; });
  showMedia(product, 0);
  if (!several) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toggle = document.getElementById("gallery-autoplay");
  toggle.hidden = reducedMotion;
  if (!reducedMotion) {
    gallery.timer = window.setInterval(tickSlideshow, SLIDE_TICK_MS);
    toggle.addEventListener("click", () => {
      gallery.stopped = !gallery.stopped;
      toggle.setAttribute("aria-pressed", String(!gallery.stopped));
      toggle.textContent = gallery.stopped ? "Play slideshow" : "Pause slideshow";
    });
  }
}

function bindGalleryControls() {
  const wrap = document.getElementById("gallery-stage-wrap");
  const stage = document.getElementById("zoom-stage");
  const step = (delta) => gallery.product && showMedia(gallery.product, gallery.index + delta, { user: true });
  document.getElementById("gallery-prev").addEventListener("click", () => step(-1));
  document.getElementById("gallery-next").addEventListener("click", () => step(1));

  wrap.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") gallery.hovering = true; });
  wrap.addEventListener("pointerleave", () => { gallery.hovering = false; });
  wrap.addEventListener("focusin", (event) => { gallery.focused = event.target.matches(":focus-visible"); });
  wrap.addEventListener("focusout", () => { gallery.focused = false; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { gallery.visible = entry.isIntersecting; }).observe(wrap);
  }

  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
  // In the full-screen viewer the arrow keys move between photos.
  document.addEventListener("keydown", (event) => {
    if (document.getElementById("zoom-lightbox").hidden || !gallery.product) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    let next = gallery.index;
    for (let i = 0; i < gallery.product.media.length; i += 1) {
      next += delta;
      if (gallery.product.media[((next % gallery.product.media.length) + gallery.product.media.length) % gallery.product.media.length].type === "image") break;
    }
    showMedia(gallery.product, next, { user: true });
  });

  // Swipes on touch screens; a swipe must not also open the full-screen viewer.
  let start = null;
  let swiped = false;
  stage.addEventListener("pointerdown", (event) => {
    start = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener("pointerup", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  stage.addEventListener("click", (event) => {
    if (!swiped) return;
    swiped = false;
    event.stopImmediatePropagation();
  }, true);
}

// ── Business (B2B) pricing ──────────────────────────────────────────────────────
// Approved business accounts pay the tier price for the quantity they buy; the server applies it at checkout.

const MAX_QUANTITY = 500;

function isApprovedBusiness() {
  return getCurrentUser()?.business?.status === "approved";
}

function tierFor(product, quantity) {
  return (product.wholesale_tiers || []).filter((tier) => quantity >= Number(tier.min_qty)).pop() || null;
}

function renderWholesale(product) {
  const tiers = product.wholesale_tiers || [];
  const box = document.getElementById("wholesale-box");
  box.hidden = !tiers.length;
  if (!tiers.length) return;
  const quantity = Number(document.getElementById("quantity-select").value) || 1;
  const active = isApprovedBusiness() ? tierFor(product, quantity) : null;
  document.getElementById("wholesale-body").innerHTML = tiers.map((tier) => {
    const price = Number(tier.price);
    const unitPrice = Math.min(price, product.price);
    const saving = Math.round((1 - unitPrice / product.price) * 100);
    return `
      <tr class="${active && Number(active.min_qty) === Number(tier.min_qty) ? "is-active" : ""}">
        <td>${Number(tier.min_qty).toLocaleString()}+ units</td>
        <td>${formatPrice(unitPrice)} each</td>
        <td>${saving > 0 ? `${saving}%` : "—"}</td>
      </tr>`;
  }).join("");
  const note = document.getElementById("wholesale-note");
  const status = getCurrentUser()?.business?.status;
  if (isApprovedBusiness()) {
    note.innerHTML = active
      ? `Your business price: <strong>${formatPrice(Math.min(Number(active.price), product.price))} each</strong> for ${quantity.toLocaleString()} units.`
      : `Buy ${Number(tiers[0].min_qty).toLocaleString()} or more to get your business price.`;
  } else if (status === "pending") {
    note.textContent = "Your business account is being reviewed. These prices apply once it's approved.";
  } else {
    note.innerHTML = `For approved business accounts. <a href="${getCurrentUser() ? "dashboard.html#account" : "auth.html"}">Apply for a business account</a> to buy at these prices.`;
  }
}

// The seller's loyalty tier and selling badges, earned from paid sales (GET /rewards/seller).
async function renderSeller(product) {
  if (product.seller_name) document.getElementById("seller-name").textContent = product.seller_name;
  if (!product.seller_email) return;
  try {
    const response = await fetch(`${DETAIL_API_BASE_URL}/rewards/seller?account=${encodeURIComponent(product.seller_email)}`);
    if (!response.ok || !(response.headers.get("Content-Type") || "").includes("application/json")) return;
    const seller = await response.json();
    const tier = document.getElementById("seller-tier");
    tier.textContent = `${seller.tier} seller`;
    tier.className = `tier-pill tier-${seller.tier.toLowerCase()}`;
    tier.hidden = false;
    if (seller.items_sold) {
      document.getElementById("seller-summary").textContent = `${seller.items_sold.toLocaleString()} item${seller.items_sold === 1 ? "" : "s"} sold`;
    }
    const badges = document.getElementById("seller-badges");
    badges.innerHTML = seller.badges.map((badge) => `<li title="${escapeHtml(badge.description)}">&#127941; ${escapeHtml(badge.label)}</li>`).join("");
    badges.hidden = !seller.badges.length;
  } catch (error) {
    console.warn("Seller badges unavailable.", error);
  }
}

function renderWatchButton(button, product) {
  const watched = isWatched(product.id);
  button.classList.toggle("is-watched", watched);
  button.setAttribute("aria-pressed", String(watched));
  button.innerHTML = watched ? "&#9829; On your watchlist" : "&#9825; Add to Watchlist";
}

function bindActions(product) {
  const quantitySelect = document.getElementById("quantity-select");
  // Keep the quantity a whole number the cart accepts, and show which business tier it reaches.
  quantitySelect.addEventListener("change", () => {
    quantitySelect.value = Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(quantitySelect.value) || 1)));
  });
  quantitySelect.addEventListener("input", () => renderWholesale(product));
  const cartButton = document.getElementById("detail-cart-button");
  bindOptions(product);
  cartButton.addEventListener("click", () => {
    if (!checkOptions(product)) return;
    const quantity = Number(quantitySelect.value);
    addProductToCart(product, quantity);
    beatPresence(product);
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

// ── Live shopper counts ─────────────────────────────────────────────────────────
// Real numbers only: other visitors with this page open now (heartbeats), carts holding the listing (ui.js reports
// cart changes) and units sold in the last 30 days (the server's trending count). Nothing shows when they're zero.

const PRESENCE_BEAT_MS = 30 * 1000;
let liveCounts = {};

function renderLiveSignals(product) {
  const list = document.getElementById("live-signals");
  const inMyCart = cartProductIds().includes(String(product.id));
  const viewing = Number(liveCounts.viewing) || 0;
  const carts = Number(liveCounts.in_carts) || 0;
  const sold = Number(product.trending) || 0;
  const signals = [];
  if (viewing > 0) {
    signals.push(["eye", viewing === 1 ? "1 other person is looking at this right now" : `${viewing.toLocaleString()} people are looking at this right now`]);
  }
  if (carts > 0) {
    signals.push(["cart", inMyCart
      ? (carts === 1 ? "In your cart" : `In ${carts.toLocaleString()} carts, including yours`)
      : `In ${carts.toLocaleString()} ${carts === 1 ? "cart" : "carts"}`]);
  }
  if (sold > 0) signals.push(["fire", `${sold.toLocaleString()} sold in the last 30 days`]);
  const icons = { eye: "&#128064;", cart: "&#128722;", fire: "&#128293;" };
  list.innerHTML = signals.map(([icon, text]) => `<li class="live-${icon}"><span aria-hidden="true">${icons[icon]}</span>${escapeHtml(text)}</li>`).join("");
  list.hidden = !signals.length;
}

async function beatPresence(product) {
  const visitor = visitorId();
  if (!visitor || document.hidden) return;
  try {
    const response = await fetch(`${DETAIL_API_BASE_URL}/products/${encodeURIComponent(product.id)}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor, in_cart: cartProductIds().includes(String(product.id)) }),
    });
    if (!response.ok || !(response.headers.get("Content-Type") || "").includes("application/json")) return;
    liveCounts = await response.json();
    renderLiveSignals(product);
  } catch (error) {
    console.warn("Live counts unavailable.", error);
  }
}

function startPresence(product) {
  renderLiveSignals(product);
  beatPresence(product);
  window.setInterval(() => beatPresence(product), PRESENCE_BEAT_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) beatPresence(product); });
}

// ── Delivery estimate ────────────────────────────────────────────────────────────
// The cheapest shipping quote to the shopper's country (/shipping/rates, the same quotes the cart charges) with the
// delivery dates it implies.

function addDays(date, days, businessOnly) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (!businessOnly || (weekday !== 0 && weekday !== 6)) added += 1;
  }
  return result;
}

function deliveryWindow(estimate) {
  const match = String(estimate || "").match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(business\s+)?days?/i) || String(estimate || "").match(/(\d+)()\s*(business\s+)?days?/i);
  if (!match) return "";
  const low = Number(match[1]);
  const high = Number(match[2] || match[1]);
  const business = Boolean(match[3]);
  const format = (date) => date.toLocaleDateString(navigator.language || "en-US", { month: "short", day: "numeric" });
  const from = format(addDays(new Date(), low, business));
  const to = format(addDays(new Date(), high, business));
  return from === to ? from : `${from} – ${to}`;
}

async function renderShippingEstimate(product) {
  if (product.source === "affiliate") return;  // The brand ships it; see renderAffiliate.
  const box = document.getElementById("shipping-estimate");
  const code = LyrLocale.country() || "US";
  const place = LyrLocale.countryName(code);
  try {
    const response = await fetch(`${DETAIL_API_BASE_URL}/shipping/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination_country: code, estimate: true, items: [{ id: product.id, price: product.price, quantity: 1 }] }),
    });
    if (!response.ok || !(response.headers.get("Content-Type") || "").includes("application/json")) throw new Error(`${response.status}`);
    const rates = ((await response.json()).rates || []).filter((rate) => Number.isFinite(Number(rate.amount)));
    if (!rates.length) throw new Error("No rates");
    const rate = rates.reduce((best, item) => (Number(item.amount) < Number(best.amount) ? item : best));
    const amount = Number(rate.amount);
    const cost = amount > 0 ? `${formatPrice(amount)} ${rate.service || "shipping"}` : `Free ${String(rate.service || "shipping").toLowerCase()}`;
    const dates = deliveryWindow(rate.estimate);
    box.innerHTML = `<strong>Shipping</strong>
      <span>${escapeHtml(cost)} to ${escapeHtml(place)}.
      ${dates ? `Estimated delivery <strong class="delivery-dates">${escapeHtml(dates)}</strong> (${escapeHtml(rate.estimate)}).` : escapeHtml(rate.estimate || "")}
      ${rates.length > 1 ? "Faster options at checkout." : ""}</span>`;
  } catch (error) {
    console.warn("Shipping estimate unavailable.", error);
    box.innerHTML = `<strong>Shipping</strong><span>Ships to ${escapeHtml(place)}. Your cart shows the shipping cost and delivery time.</span>`;
  }
}

// ── Share, Lyrbot, similar items, mobile buy bar ───────────────────────────────────

function bindShare(product) {
  document.getElementById("share-button").addEventListener("click", async () => {
    const url = `${window.location.origin}/product.html?id=${encodeURIComponent(product.id)}`;
    try {
      // Inside the Lyrshop app the WebView has no navigator.share, so use the native share sheet.
      const nativeShare = window.Capacitor?.Plugins?.Share;
      if (nativeShare) {
        await nativeShare.share({ title: product.name, text: `${product.name} on Lyrshop`, url, dialogTitle: "Share" });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `${product.name} on Lyrshop`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Link copied. Paste it anywhere to share.");
    } catch (error) {
      if (error?.name !== "AbortError" && !/cancel/i.test(error?.message || "")) showToast("Couldn't share. Copy the address from your browser instead.", { tone: "error" });
    }
  });
}

function renderAskLyrbot(product) {
  document.body.dataset.productId = product.id;
  const hasSizes = LyrSizing.hasGuide(product) || (product.options || []).some((option) => /size/i.test(option.name));
  const place = LyrLocale.countryName(LyrLocale.country() || "US");
  const questions = [
    hasSizes && "Which size should I order?",
    `How long does delivery to ${place} take?`,
    "What is it made of?",
    "Is this a good gift?",
  ].filter(Boolean);
  const chips = document.getElementById("ask-item-chips");
  chips.innerHTML = questions.map((question) => `<button type="button" data-ask="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join("");
  chips.onclick = (event) => {
    const chip = event.target.closest("[data-ask]");
    if (chip && window.LyrBot) window.LyrBot.ask(`About "${product.name}": ${chip.dataset.ask}`);
  };
}

const SIMILAR_LIMIT = 12;

function renderSimilar(product, products) {
  const score = (item) => (item.subcategory && item.subcategory === product.subcategory ? 3 : 0)
    + (item.category === product.category ? 2 : 0)
    + (item.brand && item.brand === product.brand ? 1 : 0)
    - Math.abs(Math.log((item.price || 1) / (product.price || 1))) * 0.8;
  const similar = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .sort((a, b) => score(b) - score(a))
    .slice(0, SIMILAR_LIMIT);
  document.getElementById("similar-section").hidden = !similar.length;
  document.getElementById("similar-items").innerHTML = similar.map((item) => `
    <a class="similar-card" href="product.html?id=${encodeURIComponent(item.id)}">
      <span class="similar-image"><img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" /></span>
      <span class="similar-name">${escapeHtml(item.name)}</span>
      <strong class="similar-price">${formatPrice(item.price)}</strong>
    </a>`).join("");
}

// ── Affiliate listings ──────────────────────────────────────────────────────────
// Brand products from Rakuten (source "affiliate") are sold on the brand's own site: the buttons link there through
// the tracked affiliate link, and the cart, quantity, business pricing and Lyrshop shipping don't apply.

function affiliateLink(product, className, label) {
  const link = document.createElement("a");
  link.className = className;
  link.href = product.affiliate.url;
  link.target = "_blank";
  // "sponsored" tells search engines it's a paid link, as Google requires for affiliate links.
  link.rel = "sponsored nofollow noopener";
  link.textContent = label;
  return link;
}

function renderAffiliate(product) {
  const merchant = product.affiliate?.merchant || product.brand || "the brand's site";
  if (!product.affiliate?.url) return;
  const label = `Buy at ${merchant} \u2197`;
  document.getElementById("buy-now-button").replaceWith(affiliateLink(product, "button buy-now-button", label));
  document.getElementById("buy-bar-button").replaceWith(affiliateLink(product, "button buy-bar-button", label));
  document.getElementById("detail-cart-button").remove();
  document.getElementById("wholesale-box").hidden = true;
  document.getElementById("quantity-select").closest("div").remove();
  const seen = Number(product.affiliate.seen_at) * 1000;
  const checked = seen ? new Date(seen).toLocaleDateString(navigator.language || "en-US", { month: "short", day: "numeric" }) : "";
  document.querySelector(".shipping-box").innerHTML = `
    <div>
      <strong>Sold by</strong>
      <span>${escapeHtml(merchant)}. Shipping, returns and payment are handled on ${escapeHtml(merchant)}'s site.</span>
    </div>
    <div>
      <strong>Price</strong>
      <span>${checked ? `Checked ${escapeHtml(checked)}. ` : ""}The price on ${escapeHtml(merchant)}'s site at checkout is final.</span>
    </div>
    <p class="affiliate-disclosure">Lyrshop may earn a commission when you buy through this link, at no extra cost to you.</p>`;
}

function bindBuyBar(product) {
  const bar = document.getElementById("buy-bar");
  const actions = document.querySelector(".purchase-actions");
  document.getElementById("buy-bar-image").src = product.media.find((item) => item.type === "image")?.url || product.image_url;
  document.getElementById("buy-bar-name").textContent = product.name;
  const price = () => { document.getElementById("buy-bar-price").textContent = formatPrice(product.price); };
  price();
  LyrLocale.onChange(price);
  document.getElementById("buy-bar-button").addEventListener("click", () => document.getElementById("detail-cart-button").click());
  // Shown once the page's own buttons have scrolled up out of view (under the sticky header counts as out of view).
  // A scroll check rather than an IntersectionObserver, which misses jumps straight past the buttons.
  const header = document.querySelector(".header");
  let queued = false;
  const update = () => {
    queued = false;
    // On phones the header isn't sticky and scrolls away, so the top of the screen is the limit.
    const show = actions.getBoundingClientRect().bottom < Math.max(header?.getBoundingClientRect().bottom || 0, 0);
    if (bar.hidden === !show) return;
    bar.hidden = !show;
    document.body.classList.toggle("has-buy-bar", show);
  };
  window.addEventListener("scroll", () => {
    if (!queued) window.requestAnimationFrame(update);
    queued = true;
  }, { passive: true });
}

// Product details for search engines, so the listing can appear with its price in results worldwide.
function renderStructuredData(product) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: String(product.description || "").slice(0, 500),
    image: product.media.filter((item) => item.type === "image").map((item) => new URL(item.url, window.location.href).href).slice(0, 6),
    sku: product.id,
    category: product.category,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: `${window.location.origin}/product.html?id=${encodeURIComponent(product.id)}`,
      priceCurrency: "USD",
      price: Number(product.price).toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  document.head.append(script);
  const description = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
  description.content = `${product.name} – ${formatPrice(product.price)} on Lyrshop. Ships worldwide.`;
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
  const [products, chosen] = await Promise.all([
    fetchProducts("view=cards"),
    requestedId ? fetchProducts(`ids=${encodeURIComponent(requestedId)}`) : Promise.resolve([]),
  ]);
  bindSearch(products);
  const byId = (item) => String(item.id) === requestedId;
  const product = chosen.find(byId) || products.find(byId) || products[0];
  if (!product) {
    document.getElementById("detail-title").textContent = "Product not found.";
    return;
  }
  renderProduct(product);
  bindActions(product);
  bindZoom();
  bindGalleryControls();
  bindSizeGuide(product);
  bindShare(product);
  bindBuyBar(product);
  if (product.source === "affiliate") renderAffiliate(product);
  renderAskLyrbot(product);
  renderSimilar(product, products);
  renderShippingEstimate(product);
  renderStructuredData(product);
  startPresence(product);
  // The shopper's country arrives from /locale after the first render; sizes, shipping and prices follow it.
  LyrLocale.onChange(() => {
    renderOptions(product);
    renderMeasurements(product);
    renderAskLyrbot(product);
    renderSimilar(product, products);
    renderShippingEstimate(product);
  });
  recordRecentlyViewed(product.id);
}

initProductDetail();
