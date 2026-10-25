const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://localhost:5000"
  : "";
const CATEGORIES_KEY = "lyrshopCategories";

const defaultCategories = LYRSHOP_DEFAULT_CATEGORIES;

const form = document.getElementById("product-form");
const message = document.getElementById("message");
const previewCard = document.getElementById("product-preview");
const currentProducts = document.getElementById("current-products");
const nameInput = document.getElementById("product-name");
const descriptionInput = document.getElementById("product-description");
const priceInput = document.getElementById("product-price");
const brandInput = document.getElementById("product-brand");
const brandOptions = document.getElementById("brand-options");
const comparePriceInput = document.getElementById("product-compare-price");
const discountInput = document.getElementById("product-discount");
const saleEventInput = document.getElementById("product-sale-event");
const conditionInput = document.getElementById("product-condition");
const conditionHint = document.getElementById("product-condition-hint");
const conditionNoteField = document.getElementById("product-condition-note-field");
const conditionNoteInput = document.getElementById("product-condition-note");
const auctionFields = document.getElementById("auction-fields");
const auctionStart = document.getElementById("auction-start");
const auctionReserve = document.getElementById("auction-reserve");
const auctionBuyNow = document.getElementById("auction-buy-now");
const auctionDays = document.getElementById("auction-days");
const auctionStatus = document.getElementById("auction-status");
const offerFields = document.getElementById("offer-fields");
const offerEnabled = document.getElementById("offer-enabled");
const offerThresholds = document.getElementById("offer-thresholds");
const offerAutoAccept = document.getElementById("offer-auto-accept");
const offerAutoDecline = document.getElementById("offer-auto-decline");
const countryInput = document.getElementById("product-country");
const cityInput = document.getElementById("product-city");
const regionalPricingInput = document.getElementById("product-regional-pricing");
const warehouseInput = document.getElementById("product-warehouse");
const statusInput = document.getElementById("product-status");
const productFilterSearch = document.getElementById("product-filter-search");
const productFilterStatus = document.getElementById("product-filter-status");
const productFilterCategory = document.getElementById("product-filter-category");
const productFilterCount = document.getElementById("product-filter-count");
const productShowMore = document.getElementById("product-show-more");
const categoryInput = document.getElementById("product-category");
const subcategoryInput = document.getElementById("product-subcategory");
// Hidden: always the gallery's cover photo, which cards, the preview and AI listing read.
const imageInput = document.getElementById("product-image");
const productMediaList = document.getElementById("product-media");
const productMediaPicker = document.getElementById("product-media-picker");
const productMediaUrl = document.getElementById("product-media-url");
const productEditId = document.getElementById("product-edit-id");
const productSubmit = document.getElementById("product-submit");
const productCancel = document.getElementById("product-cancel");
const priceHint = document.getElementById("product-price-hint");
const aiFillButton = document.getElementById("ai-fill");
const aiStatus = document.getElementById("ai-status");
const productOptionsPanel = document.getElementById("product-options");
const productOptionGroups = document.getElementById("product-option-groups");
const measurementRows = document.getElementById("measurement-rows");
const attributeForm = document.getElementById("attribute-form");
const attributeEditId = document.getElementById("attribute-edit-id");
const attributeName = document.getElementById("attribute-name");
const attributeType = document.getElementById("attribute-type");
const attributeValues = document.getElementById("attribute-values");
const attributeCategories = document.getElementById("attribute-categories");
const attributeSubmit = document.getElementById("attribute-submit");
const attributeCancel = document.getElementById("attribute-cancel");
const attributeMessage = document.getElementById("attribute-message");
const attributeTableBody = document.getElementById("attribute-table-body");

const orderForm = document.getElementById("order-form");
const orderEditId = document.getElementById("order-edit-id");
const orderSummary = document.getElementById("order-summary");
const orderPaymentStatus = document.getElementById("order-payment-status");
const orderFulfillmentStatus = document.getElementById("order-fulfillment-status");
const orderCarrier = document.getElementById("order-carrier");
const orderTracking = document.getElementById("order-tracking");
const orderNote = document.getElementById("order-note");
const orderSubmit = document.getElementById("order-submit");
const orderCancel = document.getElementById("order-cancel");
const orderHistory = document.getElementById("order-history");
const orderMessage = document.getElementById("order-message");
const orderTableBody = document.getElementById("order-table-body");
const orderFilterSearch = document.getElementById("order-filter-search");
const orderFilterPayment = document.getElementById("order-filter-payment");
const orderFilterFulfillment = document.getElementById("order-filter-fulfillment");
const orderFilterCount = document.getElementById("order-filter-count");

const userForm = document.getElementById("user-form");
const userEditIndex = document.getElementById("user-edit-index");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userPassword = document.getElementById("user-password");
const userSubmit = document.getElementById("user-submit");
const userCancel = document.getElementById("user-cancel");
const userRole = document.getElementById("user-role");
const userMessage = document.getElementById("user-message");
const userTableBody = document.getElementById("user-table-body");

const categoryForm = document.getElementById("category-form");
const categoryEditIndex = document.getElementById("category-edit-index");
const categoryName = document.getElementById("category-name");
const categoryLabel = document.getElementById("category-label");
const categoryImage = document.getElementById("category-image");
const categorySubcategories = document.getElementById("category-subcategories");
const categorySubmit = document.getElementById("category-submit");
const categoryCancel = document.getElementById("category-cancel");
const categoryMessage = document.getElementById("category-message");
const categoryList = document.getElementById("category-list");
const categoryOptions = document.getElementById("category-options");
const subcategoryOptions = document.getElementById("subcategory-options");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// CloudFront answers API 403/404s with index.html and a 200, so only a JSON body counts as success.
function isApiSuccess(res) {
  return res.ok && (res.headers.get("Content-Type") || "").includes("application/json");
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    console.warn(`Stored ${key} data is invalid.`, error);
    return fallback;
  }
}

// Accounts live on the server; admins load them through the /auth/users API (see auth.js authApi).
let adminUsers = [];

function readSession() {
  return getCurrentUser();
}

// Product changes are checked against the signed-in account on the server, so send its session token.
function sessionHeaders() {
  const token = getCurrentUser()?.token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function requireUser() {
  const session = readSession();
  if (!session) {
    localStorage.setItem("lyrshopAuthReturnTo", "admin.html");
    window.location.href = "auth.html";
    return null;
  }
  return session;
}

function readCategories() {
  if (!localStorage.getItem(CATEGORIES_KEY)) return defaultCategories;
  return readJson(CATEGORIES_KEY, []).map(normalizeCategory);
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.map(normalizeCategory)));
  // Saved lists are already current; stop categories.js from re-adding defaults the admin removed.
  localStorage.setItem(LYRSHOP_CATEGORIES_VERSION_KEY, String(LYRSHOP_CATEGORIES_VERSION));
}

function normalizeCategory(category) {
  const fallback = defaultCategories.find((item) => item.name === category.name) || {};
  return {
    ...category,
    label: category.label || category.name,
    image_url: category.image_url || fallback.image_url || defaultCategories[0].image_url,
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.filter(Boolean)
      : (fallback.subcategories || []),
  };
}

function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("is-error", isError);
}

function renderCategoryOptions() {
  const categories = readCategories();
  categoryOptions.innerHTML = categories
    .map((cat) => `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.label)}</option>`)
    .join("");
}

function updateSubcategoryOptions() {
  const selectedName = categoryInput.value.trim();
  const category = readCategories().find(
    (cat) => cat.name.toLowerCase() === selectedName.toLowerCase() || cat.label.toLowerCase() === selectedName.toLowerCase()
  );
  subcategoryOptions.innerHTML = (category?.subcategories || [])
    .map((sub) => `<option value="${escapeHtml(sub)}">${escapeHtml(sub)}</option>`)
    .join("");
}

function renderPreview() {
  const preview = {
    name: nameInput.value || "Product name",
    description: descriptionInput.value || "Add a description to show here.",
    brand: brandInput.value.trim(),
    image_url: imageInput.value || "logo.svg",
  };

  previewCard.innerHTML = `
    <div class="card">
      <img class="product-image" src="${escapeHtml(preview.image_url)}" alt="${escapeHtml(preview.name)}" />
      <div class="card-body">
        <div>
          ${preview.brand ? `<small class="product-brand">${escapeHtml(preview.brand)}</small>` : ""}
          <h3>${escapeHtml(preview.name)}</h3>
          <p>${escapeHtml(preview.description)}</p>
        </div>
      </div>
    </div>
  `;
}

// Mirrors auth_core: a regional admin manages the listings of their countries; other staff manage every listing.
function adminScope(session = readSession()) {
  return session?.role === "admin" && session.admin_countries?.length ? session.admin_countries : null;
}

function productCountries(product) {
  return [product.location?.country || "US", ...(product.markets || [])];
}

function canEditProduct(product, session) {
  const scope = adminScope(session);
  return (isStaffRole(session.role) && (!scope || productCountries(product).some((country) => scope.includes(country))))
    || Boolean(product.seller_email && product.seller_email.toLowerCase() === String(session.email || "").toLowerCase());
}

const ADMIN_PRODUCT_PAGE_SIZE = 48;
let adminProducts = [];
let adminProductLimit = ADMIN_PRODUCT_PAGE_SIZE;

// Regional admins see only the listings they manage; everyone else sees what the server sent.
function managedProducts() {
  const session = readSession();
  return adminScope(session) ? adminProducts.filter((product) => canEditProduct(product, session)) : adminProducts;
}

function getVisibleAdminProducts() {
  const query = productFilterSearch.value.trim().toLowerCase();
  const status = productFilterStatus.value;
  const category = productFilterCategory.value;
  return managedProducts().filter((product) => {
    if (status && (product.status || "published") !== status) return false;
    if (category && product.category !== category) return false;
    if (!query) return true;
    return [product.name, product.brand, product.subcategory, product.description]
      .some((field) => String(field || "").toLowerCase().includes(query));
  });
}

function renderProducts(session) {
  currentProducts.innerHTML = "";
  const managed = managedProducts();
  const draftCount = managed.filter((product) => product.status === "draft").length;
  const visible = getVisibleAdminProducts();
  productFilterCount.textContent = `${visible.length} of ${managed.length} listings · ${draftCount} drafts`;

  if (!visible.length) {
    currentProducts.innerHTML = managed.length
      ? "<p>No listings match these filters.</p>"
      : "<p>No products yet. Use the form above to add your first listing.</p>";
    productShowMore.hidden = true;
    return;
  }

  visible.slice(0, adminProductLimit).forEach((product) => {
    const card = document.createElement("div");
    const imageUrl = product.image_url || "logo.svg";
    const editable = canEditProduct(product, session);
    const isDraft = product.status === "draft";
    card.className = isDraft ? "card draft-card" : "card";
    card.innerHTML = `
      <img class="product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" />
      <div class="card-body">
        <div>
          ${isDraft ? `<span class="draft-badge">Draft · hidden from store</span>` : ""}
          ${sellingBadge(product)}
          ${product.brand ? `<small class="product-brand">${escapeHtml(product.brand)}</small>` : ""}
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "No description.")}</p>
          ${isDraft && product.draft_notes ? `<p class="draft-notes">${escapeHtml(product.draft_notes)}</p>` : ""}
          ${product.seller_name ? `<small>by ${escapeHtml(product.seller_name)}</small>` : ""}
        </div>
      </div>
      <div class="card-footer">
        <span class="meta-pill">${escapeHtml(product.sale_event || product.subcategory || product.category || "")}</span>
        <span class="price">
          ${Number(product.compare_at_price) > Number(product.price) ? `<s class="was-price">$${Number(product.compare_at_price).toFixed(2)}</s>` : ""}
          $${Number(product.price).toFixed(2)}
        </span>
      </div>
      ${editable ? `
      <div class="table-actions" style="padding:0.5rem 1rem 1rem">
        <button class="button button-secondary" type="button" data-product-action="edit" data-product-id="${escapeHtml(product.id)}">${isDraft ? "Edit & publish" : "Edit"}</button>
        <button class="button danger-button" type="button" data-product-action="delete" data-product-id="${escapeHtml(product.id)}">Delete</button>
        ${!isDraft && product.format !== "auction" && product.source !== "affiliate"
          ? `<button class="button button-secondary" type="button" data-product-action="watchers" data-product-id="${escapeHtml(product.id)}">Offer to watchers</button>` : ""}
      </div>` : ""}
    `;
    currentProducts.appendChild(card);
  });
  const remaining = visible.length - adminProductLimit;
  productShowMore.hidden = remaining <= 0;
  productShowMore.textContent = `Show ${Math.min(remaining, ADMIN_PRODUCT_PAGE_SIZE)} more`;
}

function renderProductFilterCategories() {
  const selected = productFilterCategory.value;
  productFilterCategory.innerHTML = `<option value="">All categories</option>${readCategories()
    .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.label)}</option>`).join("")}`;
  productFilterCategory.value = selected;
}

async function loadCurrentProducts(session) {
  const url = isStaffRole(session.role)
    ? `${API_BASE_URL}/products?include_drafts=1`
    : `${API_BASE_URL}/products?include_drafts=1&seller=${encodeURIComponent(session.email)}`;
  try {
    // The token lets staff see each listing's CJ link and cost, which shoppers don't get.
    const res = await fetch(url, { headers: sessionHeaders() });
    const json = await res.json();
    adminProducts = json.products || [];
    renderProductFilterCategories();
    renderProducts(session);
    renderBrandOptions(adminProducts);
    if (isStaffRole(session.role)) renderCjImported();
  } catch {
    currentProducts.innerHTML = "<p>Unable to load products. Make sure the backend is running.</p>";
  }
}

function renderBrandOptions(products) {
  const brands = [...new Set([...products.map((product) => (product.brand || "").trim()), ...directoryBrandNames].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  brandOptions.innerHTML = brands.map((brand) => `<option value="${escapeHtml(brand)}"></option>`).join("");
}

// ── Condition and selling format ─────────────────────────────────────────────
const CONDITION_HINTS = {
  new: "Brand-new, unused, unopened, in its original packaging.",
  open_box: "New and unused; the packaging may be opened or missing.",
  new_defects: "New and unused, with defects such as scuffs or damaged packaging.",
  certified_refurbished: "Restored to like-new by the manufacturer or an approved vendor.",
  excellent_refurbished: "Works and looks like new; professionally restored.",
  very_good_refurbished: "Works like new with minimal wear; professionally restored.",
  good_refurbished: "Works like new with moderate wear; professionally restored.",
  seller_refurbished: "Restored to working order by you or a third party.",
  used_excellent: "Used, with little sign of wear. Works fully.",
  used_good: "Used, with some signs of wear. Works fully.",
  used_fair: "Used, with heavy wear. Works fully.",
  for_parts: "Doesn't fully work. Sold as is, for parts or repair.",
};

function sellingFormat() {
  return form.querySelector('input[name="product-format"]:checked')?.value || "fixed";
}

function syncSellingFields() {
  const auction = sellingFormat() === "auction";
  conditionHint.textContent = CONDITION_HINTS[conditionInput.value] || "";
  // eBay asks for a condition description on anything that isn't brand new.
  conditionNoteField.hidden = conditionInput.value === "new";
  auctionFields.hidden = !auction;
  offerFields.hidden = auction;
  offerThresholds.hidden = auction || !offerEnabled.checked;
  auctionStart.required = auction;
  priceInput.required = !auction;
  // Auctions have one price from their own terms; fixed-price extras don't apply.
  for (const field of [priceInput.closest("label"), comparePriceInput.closest("label"), discountInput.closest("label"),
    document.querySelector(".wholesale-tiers")]) {
    if (field) field.hidden = auction;
  }
}

function setSellingFields(product) {
  conditionInput.value = product?.condition || "new";
  conditionNoteInput.value = product?.condition_note || "";
  const auction = product?.format === "auction" ? product.auction || {} : null;
  form.querySelector(`input[name="product-format"][value="${auction ? "auction" : "fixed"}"]`).checked = true;
  auctionStart.value = auction?.start_price ?? "";
  auctionReserve.value = auction?.reserve_price ?? "";
  auctionBuyNow.value = auction?.listed_buy_now_price ?? auction?.buy_now_price ?? "";
  auctionDays.value = String(auction?.days || 7);
  const bids = Number(auction?.bid_count || 0);
  const ended = auction && ["sold", "unsold"].includes(auction.status);
  auctionStatus.hidden = !auction;
  auctionStatus.textContent = !auction ? "" : ended
    ? `This auction ${auction.status === "sold" ? `sold for $${Number(auction.final_price || 0).toFixed(2)}` : "ended without a sale"}. Saving relists it with a new clock.`
    : bids ? `${bids} bid${bids === 1 ? "" : "s"} so far, current bid $${Number(auction.current_price).toFixed(2)}. Prices and duration are locked until it ends.`
      : `Live, no bids yet. Ends ${new Date(Number(auction.ends_at) * 1000).toLocaleString()}.`;
  for (const input of [auctionStart, auctionReserve, auctionBuyNow, auctionDays]) input.disabled = Boolean(bids && !ended);
  const offers = product?.best_offer || {};
  offerEnabled.checked = Boolean(offers.enabled);
  offerAutoAccept.value = offers.auto_accept ?? "";
  offerAutoDecline.value = offers.auto_decline ?? "";
  syncSellingFields();
}

function collectSellingFields() {
  const fields = { condition: conditionInput.value, condition_note: conditionNoteField.hidden ? "" : conditionNoteInput.value.trim() };
  if (sellingFormat() === "auction") {
    Object.assign(fields, {
      format: "auction",
      auction: { start_price: auctionStart.value, reserve_price: auctionReserve.value, buy_now_price: auctionBuyNow.value, days: Number(auctionDays.value) },
    });
    fields.price = parseFloat(auctionBuyNow.value) || parseFloat(auctionStart.value);
  } else {
    Object.assign(fields, {
      format: "fixed",
      best_offer: { enabled: offerEnabled.checked, auto_accept: offerAutoAccept.value, auto_decline: offerAutoDecline.value },
    });
  }
  return fields;
}

function sellingBadge(product) {
  const auction = product.format === "auction" ? product.auction : null;
  if (auction) {
    const label = auction.status === "live" ? `Auction · ${Number(auction.bid_count || 0)} bids · $${Number(auction.current_price || 0).toFixed(2)}`
      : auction.status === "sold" ? `Auction sold · $${Number(auction.final_price || 0).toFixed(2)}` : "Auction ended · unsold";
    return `<span class="meta-pill selling-pill">${escapeHtml(label)}</span>`;
  }
  return product.best_offer?.enabled ? `<span class="meta-pill selling-pill">Accepts offers</span>` : "";
}

function startEditProduct(product) {
  productEditId.value = product.id;
  nameInput.value = product.name || "";
  descriptionInput.value = product.description || "";
  priceInput.value = product.price || "";
  brandInput.value = product.brand || "";
  comparePriceInput.value = product.compare_at_price || "";
  saleEventInput.value = product.sale_event || "";
  // Listings from before item locations were all listed from the US.
  countryInput.value = product.location?.country || "US";
  cityInput.value = product.location?.city || "";
  setWarehouseValue(product.warehouse || "");
  regionalPricingInput.checked = Boolean(product.regional_pricing);
  syncDiscountFromPrices();
  // Opening a draft defaults to publishing it; the photo check in submitProduct still applies.
  statusInput.value = "published";
  categoryInput.value = product.category || "";
  updateSubcategoryOptions();
  subcategoryInput.value = product.subcategory || "";
  setProductMedia(product);
  setWholesaleTiers(product.wholesale_tiers);
  setProductOptions(product);
  setSellingFields(product);
  resetAiAssist();
  productSubmit.textContent = "Update product";
  productCancel.hidden = false;
  document.getElementById("product-form-title").textContent = "Edit product";
  renderPreview();
  form.scrollIntoView({ behavior: "smooth" });
}

// ── Attributes and product options ─────────────────────────────────────────────
// Attributes (Color, Size, ...) live on the server so every seller shares them. A product stores its own copy of the
// values it is offered in, so editing or deleting an attribute never changes existing listings.

const ATTRIBUTE_TYPE_LABELS = { color: "Color swatches", size: "Size buttons", text: "Buttons" };
let allAttributes = [];
// Option name -> Set of ticked values for the product being edited, kept across category changes.
let optionSelections = new Map();

function splitList(text) {
  return String(text || "").split(",").map((value) => value.trim()).filter(Boolean);
}

function swatchStyle(value) {
  const color = String(value).toLowerCase().replace(/\s+/g, "");
  return window.CSS?.supports?.("color", color) ? `background:${color}` : "";
}

function canEditAttribute(attribute) {
  const session = readSession();
  return session?.role === "superadmin" || attribute.owner === session?.account;
}

function attributeAppliesTo(attribute, category) {
  const name = String(category || "").trim().toLowerCase();
  return !attribute.categories?.length || attribute.categories.some((item) => item.toLowerCase() === name);
}

async function loadAttributes() {
  try {
    const res = await fetch(`${API_BASE_URL}/attributes`);
    const json = await res.json();
    if (!isApiSuccess(res)) throw new Error(json.message || "Could not load attributes.");
    allAttributes = json.attributes || [];
  } catch (error) {
    showMessage(attributeMessage, error.message || "Could not load attributes.", true);
  }
  renderAttributes();
  renderProductOptions();
}

function renderAttributes() {
  if (!allAttributes.length) {
    attributeTableBody.innerHTML = `<tr><td colspan="6">No attributes yet. Create the first one above.</td></tr>`;
    return;
  }
  const session = readSession();
  attributeTableBody.innerHTML = allAttributes.map((attribute) => {
    const editable = canEditAttribute(attribute);
    const values = attribute.values.map((value) => attribute.type === "color"
      ? `<span class="value-chip"><span class="swatch" style="${swatchStyle(value)}"></span>${escapeHtml(value)}</span>`
      : `<span class="value-chip">${escapeHtml(value)}</span>`).join("");
    return `
      <tr>
        <td><strong>${escapeHtml(attribute.name)}</strong></td>
        <td>${escapeHtml(ATTRIBUTE_TYPE_LABELS[attribute.type] || "Buttons")}</td>
        <td><div class="value-chips">${values}</div></td>
        <td>${escapeHtml(attribute.categories?.length ? attribute.categories.join(", ") : "All categories")}</td>
        <td>${attribute.owner === session?.account ? "You" : escapeHtml(attribute.owner || "—")}</td>
        <td>
          <div class="table-actions">
            ${editable ? `
              <button class="button button-secondary" type="button" data-attribute-action="edit" data-attribute-id="${escapeHtml(attribute.id)}">Edit</button>
              <button class="button danger-button" type="button" data-attribute-action="delete" data-attribute-id="${escapeHtml(attribute.id)}">Delete</button>`
              : `<small>View only</small>`}
          </div>
        </td>
      </tr>`;
  }).join("");
}

function resetAttributeForm() {
  attributeForm.reset();
  attributeEditId.value = "";
  attributeSubmit.textContent = "Create attribute";
  attributeCancel.hidden = true;
  document.getElementById("attribute-form-title").textContent = "Attributes";
}

async function saveAttribute(event) {
  event.preventDefault();
  const editId = attributeEditId.value;
  const body = {
    name: attributeName.value.trim(),
    type: attributeType.value,
    values: splitList(attributeValues.value),
    categories: splitList(attributeCategories.value),
  };
  attributeSubmit.disabled = true;
  try {
    const { attribute } = await authApi(editId ? `/attributes/${encodeURIComponent(editId)}` : "/attributes", {
      method: editId ? "PUT" : "POST",
      body,
    });
    allAttributes = [...allAttributes.filter((item) => item.id !== attribute.id), attribute]
      .sort((a, b) => a.name.localeCompare(b.name));
    renderAttributes();
    renderProductOptions();
    resetAttributeForm();
    showMessage(attributeMessage, `${attribute.name} ${editId ? "updated" : "created"}.`);
  } catch (error) {
    showMessage(attributeMessage, error.message, true);
  } finally {
    attributeSubmit.disabled = false;
  }
}

async function handleAttributeTableClick(event) {
  const button = event.target.closest("[data-attribute-action]");
  if (!button) return;
  const attribute = allAttributes.find((item) => item.id === button.dataset.attributeId);
  if (!attribute) return;
  if (button.dataset.attributeAction === "edit") {
    attributeEditId.value = attribute.id;
    attributeName.value = attribute.name;
    attributeType.value = attribute.type || "text";
    attributeValues.value = attribute.values.join(", ");
    attributeCategories.value = (attribute.categories || []).join(", ");
    attributeSubmit.textContent = "Update attribute";
    attributeCancel.hidden = false;
    document.getElementById("attribute-form-title").textContent = `Edit ${attribute.name}`;
    showMessage(attributeMessage, "");
    attributeForm.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (!confirm(`Delete the ${attribute.name} attribute? Products already listed with it keep their options.`)) return;
  try {
    await authApi(`/attributes/${encodeURIComponent(attribute.id)}`, { method: "DELETE" });
    allAttributes = allAttributes.filter((item) => item.id !== attribute.id);
    if (attributeEditId.value === attribute.id) resetAttributeForm();
    renderAttributes();
    renderProductOptions();
    showMessage(attributeMessage, `${attribute.name} deleted.`);
  } catch (error) {
    showMessage(attributeMessage, error.message, true);
  }
}

// The option groups to show: attributes for the chosen category, plus any option the product already has.
function visibleOptionGroups() {
  const groups = allAttributes
    .filter((attribute) => attributeAppliesTo(attribute, categoryInput.value))
    .map((attribute) => ({ name: attribute.name, type: attribute.type, values: [...attribute.values] }));
  optionSelections.forEach((selected, name) => {
    const group = groups.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (group) {
      selected.forEach((value) => { if (!group.values.includes(value)) group.values.push(value); });
    } else if (selected.size) {
      const attribute = allAttributes.find((item) => item.name.toLowerCase() === name.toLowerCase());
      groups.push({ name, type: attribute?.type || "text", values: [...selected] });
    }
  });
  return groups;
}

function renderProductOptions() {
  const groups = visibleOptionGroups();
  productOptionsPanel.hidden = !groups.length && !measurementRows.children.length;
  productOptionGroups.innerHTML = groups.map((group) => {
    const selected = optionSelections.get(group.name) || new Set();
    const chips = group.values.map((value) => `
      <label class="option-chip">
        <input type="checkbox" data-option-name="${escapeHtml(group.name)}" value="${escapeHtml(value)}" ${selected.has(value) ? "checked" : ""} />
        ${group.type === "color" ? `<span class="swatch" style="${swatchStyle(value)}"></span>` : ""}
        <span>${escapeHtml(value)}</span>
      </label>`).join("");
    return `
      <div class="option-group">
        <div class="option-group-header">
          <strong>${escapeHtml(group.name)}</strong>
          <button type="button" class="link-button" data-option-all="${escapeHtml(group.name)}">Select all</button>
          <button type="button" class="link-button" data-option-none="${escapeHtml(group.name)}">Clear</button>
        </div>
        <div class="option-chips">${chips}</div>
      </div>`;
  }).join("");
}

function handleOptionChange(event) {
  const box = event.target.closest("[data-option-name]");
  if (!box) return;
  const name = box.dataset.optionName;
  const selected = optionSelections.get(name) || new Set();
  if (box.checked) selected.add(box.value);
  else selected.delete(box.value);
  optionSelections.set(name, selected);
}

function handleOptionClick(event) {
  const all = event.target.closest("[data-option-all]");
  const none = event.target.closest("[data-option-none]");
  const name = all?.dataset.optionAll ?? none?.dataset.optionNone;
  if (name === undefined) return;
  const boxes = [...productOptionGroups.querySelectorAll("[data-option-name]")].filter((box) => box.dataset.optionName === name);
  optionSelections.set(name, new Set(all ? boxes.map((box) => box.value) : []));
  renderProductOptions();
}

// The product's options in the order the attribute lists them: [{ name, type, values }].
function collectProductOptions() {
  return visibleOptionGroups()
    .map((group) => {
      const selected = optionSelections.get(group.name) || new Set();
      return { name: group.name, type: group.type, values: group.values.filter((value) => selected.has(value)) };
    })
    .filter((option) => option.values.length);
}

function addMeasurementRow(label = "", value = "") {
  const row = document.createElement("div");
  row.className = "measurement-row";
  row.innerHTML = `
    <input type="text" class="measurement-label" maxlength="60" placeholder="Measurement" aria-label="Measurement name" />
    <input type="text" class="measurement-value" maxlength="60" placeholder="e.g. 40 in / 102 cm" aria-label="Measurement value" />
    <button type="button" class="link-button" data-remove-measurement aria-label="Remove measurement">Remove</button>`;
  row.querySelector(".measurement-label").value = label;
  row.querySelector(".measurement-value").value = value;
  measurementRows.appendChild(row);
  return row;
}

function collectMeasurements() {
  return [...measurementRows.querySelectorAll(".measurement-row")]
    .map((row) => ({ label: row.querySelector(".measurement-label").value.trim(), value: row.querySelector(".measurement-value").value.trim() }))
    .filter((row) => row.label && row.value);
}

// ── Wholesale tiers ────────────────────────────────────────────────────────────
// Unit prices for approved business buyers by minimum quantity; the server checks each tier is cheaper.

const wholesaleRows = document.getElementById("wholesale-rows");
const MAX_WHOLESALE_TIERS = 5;

function addWholesaleRow(minQty = "", price = "") {
  if (wholesaleRows.children.length >= MAX_WHOLESALE_TIERS) return;
  const row = document.createElement("div");
  row.className = "wholesale-row";
  row.innerHTML = `
    <label>Min. quantity<input type="number" class="wholesale-qty" min="2" max="10000" step="1" value="${escapeHtml(minQty)}" placeholder="10" /></label>
    <label>Unit price (USD)<input type="number" class="wholesale-price" min="0.01" step="0.01" value="${escapeHtml(price)}" placeholder="0.00" /></label>
    <button type="button" class="link-button" data-remove-wholesale aria-label="Remove tier">Remove</button>`;
  wholesaleRows.appendChild(row);
  document.getElementById("wholesale-add").hidden = wholesaleRows.children.length >= MAX_WHOLESALE_TIERS;
}

function setWholesaleTiers(tiers) {
  wholesaleRows.innerHTML = "";
  (tiers || []).forEach((tier) => addWholesaleRow(tier.min_qty, tier.price));
  document.getElementById("wholesale-add").hidden = false;
}

function collectWholesaleTiers() {
  return [...wholesaleRows.querySelectorAll(".wholesale-row")]
    .map((row) => ({ min_qty: Number(row.querySelector(".wholesale-qty").value), price: Number(row.querySelector(".wholesale-price").value) }))
    .filter((tier) => tier.min_qty && tier.price);
}

document.getElementById("wholesale-add").addEventListener("click", () => {
  addWholesaleRow();
  wholesaleRows.lastElementChild?.querySelector("input").focus();
});
wholesaleRows.addEventListener("click", (event) => {
  if (!event.target.closest("[data-remove-wholesale]")) return;
  event.target.closest(".wholesale-row").remove();
  document.getElementById("wholesale-add").hidden = false;
});

function setProductOptions(product) {
  optionSelections = new Map((product?.options || []).map((option) => [option.name, new Set(option.values)]));
  measurementRows.innerHTML = "";
  (product?.measurements || []).forEach((row) => addMeasurementRow(row.label, row.value));
  renderProductOptions();
}

function handleMeasurementClick(event) {
  const preset = event.target.closest("[data-measurement]");
  if (preset) {
    const row = addMeasurementRow(preset.dataset.measurement);
    row.querySelector(preset.dataset.measurement ? ".measurement-value" : ".measurement-label").focus();
    return;
  }
  const remove = event.target.closest("[data-remove-measurement]");
  if (remove) {
    remove.closest(".measurement-row").remove();
    renderProductOptions();
  }
}

// ── AI listing ─────────────────────────────────────────────────────────────────
// Claude reads the photo and suggests the listing fields, like eBay's photo-first listing. After an upload it only
// fills empty fields; the button refills them all. The price stays the seller's call and is shown as a hint only.

const AI_STATUS_IDLE = "Upload a photo and AI fills in the name, description, brand and category.";
let aiRequest = 0;

function setAiStatus(text, tone = "") {
  aiStatus.textContent = text;
  aiStatus.dataset.tone = tone;
}

function syncAiButton() {
  aiFillButton.disabled = !imageInput.value.trim();
}

function resetAiAssist() {
  aiRequest += 1;
  priceHint.hidden = true;
  priceHint.textContent = "";
  setAiStatus(AI_STATUS_IDLE);
  syncAiButton();
}

async function fillFromPhoto({ overwrite }) {
  const imageUrl = imageInput.value.trim();
  if (!imageUrl) return;
  const request = ++aiRequest;
  aiFillButton.disabled = true;
  setAiStatus("Reading your photo…", "busy");
  try {
    const { draft } = await authApi("/products/ai-draft", {
      method: "POST",
      body: {
        image_url: imageUrl,
        // Whatever the seller already typed as a name helps pin down the exact model.
        hint: nameInput.value.trim(),
        categories: readCategories().map((category) => ({ name: category.name, subcategories: category.subcategories || [] })),
      },
    });
    // A newer photo or a reset form has taken over since this request started.
    if (request !== aiRequest) return;

    const fill = (input, value) => {
      if (value && (overwrite || !input.value.trim())) input.value = value;
    };
    fill(nameInput, draft.name);
    fill(brandInput, draft.brand);
    fill(descriptionInput, draft.description);
    if (overwrite || !categoryInput.value.trim()) {
      categoryInput.value = draft.category;
      subcategoryInput.value = draft.subcategory;
    } else {
      fill(subcategoryInput, draft.subcategory);
    }
    updateSubcategoryOptions();
    renderPreview();

    if (draft.price_high > 0) {
      const range = draft.price_low === draft.price_high
        ? formatMoney(draft.price_low)
        : `${formatMoney(draft.price_low)}–${formatMoney(draft.price_high)}`;
      priceHint.textContent = `AI estimate: similar items sell for about ${range}.`;
      priceHint.hidden = false;
    }
    setAiStatus(draft.confidence === "low"
      ? "Filled from your photo, but the AI wasn't sure what this is. Please check every field."
      : "Filled from your photo. Check the details before listing.", draft.confidence === "low" ? "warn" : "done");
  } catch (error) {
    if (request !== aiRequest) return;
    if (error.status === 401) {
      setAiStatus("Please sign in again to use AI listing.", "error");
    } else {
      setAiStatus(error.message || "AI couldn't read the photo. Fill in the details yourself.", "error");
    }
  } finally {
    if (request === aiRequest) syncAiButton();
  }
}

// ── Discount ───────────────────────────────────────────────────────────────────
// Only price and the "was" price are saved; the % off field is a calculator kept in step with them.

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function syncDiscountFromPrices() {
  const price = parseFloat(priceInput.value);
  const was = parseFloat(comparePriceInput.value);
  discountInput.value = price > 0 && was > price ? String(Math.round(((was - price) / was) * 100)) : "";
}

function applyDiscount() {
  const percent = parseFloat(discountInput.value);
  let was = parseFloat(comparePriceInput.value);
  if (discountInput.value === "") {
    // Clearing the discount puts the item back at its was price.
    if (was > 0) {
      priceInput.value = was.toFixed(2);
      comparePriceInput.value = "";
    }
    renderPreview();
    return;
  }
  if (!(percent > 0 && percent < 100)) return;
  if (!(was > 0)) {
    was = parseFloat(priceInput.value);
    if (!(was > 0)) return;
    comparePriceInput.value = was.toFixed(2);
  }
  priceInput.value = roundMoney(was * (1 - percent / 100)).toFixed(2);
  renderPreview();
}

// New listings default to the country the seller is browsing from.
function resetItemLocation() {
  countryInput.value = LyrLocale.country() || "US";
  if (!countryInput.value) countryInput.value = "US";
}

function cancelProductEdit() {
  form.reset();
  resetItemLocation();
  productEditId.value = "";
  productSubmit.textContent = "List Product";
  productCancel.hidden = true;
  document.getElementById("product-form-title").textContent = "List a new product";
  setProductMedia(null);
  setWholesaleTiers([]);
  setProductOptions(null);
  setSellingFields(null);
  resetAiAssist();
  renderPreview();
  showMessage(message, "");
}

async function submitProduct(event) {
  event.preventDefault();
  const session = readSession();
  if (!session) return;

  const editId = productEditId.value;
  const selling = collectSellingFields();
  if (selling.format === "auction") {
    comparePriceInput.value = "";
    discountInput.value = "";
  }
  const comparePrice = comparePriceInput.value === "" ? "" : parseFloat(comparePriceInput.value);
  if (discountInput.value !== "" && !(parseFloat(discountInput.value) > 0 && parseFloat(discountInput.value) < 100)) {
    showMessage(message, "The discount must be between 1 and 99% off.", true);
    return;
  }
  if (comparePrice !== "" && !(comparePrice > parseFloat(priceInput.value))) {
    showMessage(message, "The was price must be higher than the price.", true);
    return;
  }
  if (statusInput.value === "published" && !imageInput.value.trim()) {
    showMessage(message, "Add a product photo before publishing, or save it as a draft.", true);
    return;
  }
  const product = {
    status: statusInput.value,
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    price: parseFloat(priceInput.value),
    compare_at_price: comparePrice,
    brand: brandInput.value.trim(),
    sale_event: saleEventInput.value.trim(),
    category: categoryInput.value.trim(),
    subcategory: subcategoryInput.value.trim(),
    image_url: imageInput.value.trim(),
    media: productMedia,
    wholesale_tiers: collectWholesaleTiers(),
    location: { country: countryInput.value, city: cityInput.value.trim() },
    warehouse: warehouseInput.value,
    regional_pricing: regionalPricingInput.checked,
    options: collectProductOptions(),
    measurements: collectMeasurements(),
    ...selling,
  };
  if (selling.format === "auction") delete product.wholesale_tiers;
  // A new listing is the signed-in seller's; editing keeps whoever it's listed under (e.g. an import stays Lyrshop's).
  if (!editId) Object.assign(product, { seller_email: session.email, seller_name: session.name });

  try {
    const url = editId ? `${API_BASE_URL}/products/${editId}` : `${API_BASE_URL}/products`;
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: sessionHeaders(),
      body: JSON.stringify(product),
    });

    if (isApiSuccess(res)) {
      const saved = (await res.clone().json().catch(() => ({}))).product || {};
      cancelProductEdit();
      showMessage(message, saved.brand_review
        ? `Saved as a draft: ${saved.brand} is a protected brand, so Lyrshop staff review it before it goes live.`
        : (editId ? "Product updated." : "Product listed successfully."));
      loadCurrentProducts(session);
      return;
    }

    const error = await res.json().catch(() => ({}));
    showMessage(message, `Error: ${error.message || "Unable to save product."}`, true);
  } catch {
    showMessage(message, "Unable to reach the backend. Make sure it is running.", true);
  }
}

async function deleteProduct(productId, session) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: sessionHeaders(),
    });

    if (isApiSuccess(res)) {
      showMessage(message, "Product deleted.");
      loadCurrentProducts(session);
      return;
    }

    const error = await res.json().catch(() => ({}));
    showMessage(message, `Error: ${error.message || "Unable to delete product."}`, true);
  } catch {
    showMessage(message, "Unable to reach the backend.", true);
  }
}

function handleProductActions(event) {
  const button = event.target.closest("[data-product-action]");
  if (!button) return;
  const session = readSession();
  if (!session) return;

  const productId = button.dataset.productId;
  if (button.dataset.productAction === "delete") {
    deleteProduct(productId, session);
    return;
  }

  if (button.dataset.productAction === "watchers") {
    offerToWatchers(adminProducts.find((p) => p.id === productId));
    return;
  }

  if (button.dataset.productAction === "edit") {
    const product = adminProducts.find((p) => p.id === productId);
    if (product) startEditProduct(product);
  }
}

// Like eBay's "Send offers to buyers": everyone signed in and watching the item gets the lower price for 48 hours.
async function offerToWatchers(product) {
  if (!product) return;
  const amount = prompt(`Offer price for everyone watching "${product.name}" (USD). It must be below $${Number(product.price).toFixed(2)}.`);
  if (!amount) return;
  const note = prompt("Message to watchers (optional)") || "";
  try {
    const res = await fetch(`${API_BASE_URL}/market/watcher-offers`, {
      method: "POST", headers: sessionHeaders(), body: JSON.stringify({ product_id: product.id, amount: Number(amount), message: note }),
    });
    const json = await res.json().catch(() => ({}));
    showMessage(message, json.message || (res.ok ? "Offer sent." : "Unable to send the offer."), !res.ok);
  } catch {
    showMessage(message, "Unable to reach the backend.", true);
  }
  message.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ── User management ────────────────────────────────────────────────────────────

function resetUserForm() {
  userForm.reset();
  userEditIndex.value = "";
  userEmail.disabled = false;
  userPassword.required = true;
  userPassword.placeholder = "At least 6 characters";
  userSubmit.textContent = "Create user";
  userRole.value = "user";
  userRole.disabled = false;
  userCountries.value = "";
  syncUserCountriesField();
  showMessage(userMessage, "");
}

const userCountries = document.getElementById("user-countries");
const userCountriesField = document.getElementById("user-countries-field");

// Only admins have countries to manage.
function syncUserCountriesField() {
  userCountriesField.hidden = !isSuperAdmin() || userRole.value !== "admin";
}

const ROLE_LABELS = { superadmin: "Super admin", admin: "Admin", user: "User" };

function isSuperAdmin() {
  return readSession()?.role === "superadmin";
}

// Mirrors the server rule: admins manage regular users; the super admin also manages admins.
function canManageUser(user) {
  if (user.role === "superadmin") return isSuperAdmin();
  return user.role === "user" || isSuperAdmin();
}

async function loadUsers() {
  try {
    adminUsers = (await authApi("/auth/users")).users || [];
    renderUsers();
  } catch (error) {
    userTableBody.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    if (error.status === 401) {
      clearCurrentUser();
      requireUser();
    }
  }
}

function renderUsers() {

  if (!adminUsers.length) {
    userTableBody.innerHTML = `<tr><td colspan="6">No users yet. Create one here or sign up from the auth page.</td></tr>`;
    return;
  }

  userTableBody.innerHTML = adminUsers
    .map((user, index) => {
      const manageable = canManageUser(user);
      const isSelf = user.account === readSession()?.account;
      const accessButton = isSuperAdmin() && user.role !== "superadmin"
        ? `<button class="button button-secondary" type="button" data-user-action="toggle-admin" data-index="${index}">${user.role === "admin" ? "Remove admin" : "Make admin"}</button>`
        : "";
      return `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email || user.phone)}</td>
        <td><span class="status-badge role-${escapeHtml(user.role)}">${escapeHtml(ROLE_LABELS[user.role] || user.role)}</span>
          ${user.role === "admin" ? `<small>${escapeHtml(user.admin_countries?.length ? user.admin_countries.join(", ") : "All countries")}</small>` : ""}</td>
        <td>${escapeHtml(user.provider || "Email")}</td>
        <td>${user.created_at ? new Date(user.created_at * 1000).toLocaleDateString() : ""}</td>
        <td>
          <div class="table-actions">
            ${manageable ? `<button class="button button-secondary" type="button" data-user-action="edit" data-index="${index}">Edit</button>` : ""}
            ${accessButton}
            ${manageable && !isSelf && user.role !== "superadmin" ? `<button class="button danger-button" type="button" data-user-action="delete" data-index="${index}">Delete</button>` : ""}
            ${manageable || accessButton ? "" : `<small>Super admin only</small>`}
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

async function saveUser(event) {
  event.preventDefault();
  const editIndex = userEditIndex.value === "" ? -1 : Number(userEditIndex.value);
  const contact = userEmail.value.trim();
  const body = { name: userName.value.trim() };
  if (userPassword.value) body.password = userPassword.value;
  const editing = editIndex >= 0 ? adminUsers[editIndex] : null;
  if (isSuperAdmin() && editing?.role !== "superadmin") {
    body.role = userRole.value;
    if (userRole.value === "admin") body.admin_countries = userCountries.value;
  }
  userSubmit.disabled = true;
  try {
    let done;
    if (editIndex >= 0) {
      const account = adminUsers[editIndex].account;
      await authApi(`/auth/users/${encodeURIComponent(account)}`, { method: "PUT", body });
      done = "User updated.";
    } else {
      body[contact.startsWith("+") ? "phone" : "email"] = contact;
      await authApi("/auth/users", { method: "POST", body });
      done = "User created.";
    }
    resetUserForm();
    showMessage(userMessage, done);
    await loadUsers();
  } catch (error) {
    showMessage(userMessage, error.message, true);
  } finally {
    userSubmit.disabled = false;
  }
}

async function handleUserTableClick(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const user = adminUsers[Number(button.dataset.index)];
  if (!user) return;

  if (button.dataset.userAction === "toggle-admin") {
    const makeAdmin = user.role !== "admin";
    const contact = user.email || user.phone;
    if (!confirm(makeAdmin
      ? `Give ${contact} admin access? They will be able to manage orders, products and regular users.`
      : `Remove admin access from ${contact}?`)) return;
    try {
      await authApi(`/auth/users/${encodeURIComponent(user.account)}`, { method: "PUT", body: { role: makeAdmin ? "admin" : "user" } });
      await loadUsers();
      showMessage(userMessage, makeAdmin ? `${contact} is now an admin.` : `${contact} is no longer an admin.`);
    } catch (error) {
      showMessage(userMessage, error.message, true);
    }
    return;
  }

  if (button.dataset.userAction === "edit") {
    userEditIndex.value = button.dataset.index;
    userRole.value = user.role === "admin" ? "admin" : "user";
    userRole.disabled = user.role === "superadmin";
    userCountries.value = (user.admin_countries || []).join(", ");
    syncUserCountriesField();
    userName.value = user.name || "";
    userEmail.value = user.email || user.phone || "";
    userEmail.disabled = true;
    userPassword.value = "";
    userPassword.required = false;
    userPassword.placeholder = "Leave blank to keep the current password";
    userSubmit.textContent = "Update user";
    showMessage(userMessage, "Editing user.");
    return;
  }

  if (!confirm(`Delete ${user.email || user.phone}? They will need to sign up again.`)) return;
  try {
    await authApi(`/auth/users/${encodeURIComponent(user.account)}`, { method: "DELETE" });
    resetUserForm();
    await loadUsers();
    showMessage(userMessage, "User deleted.");
  } catch (error) {
    showMessage(userMessage, error.message, true);
  }
}

// ── Order management ───────────────────────────────────────────────────────────

let adminOrders = [];

function formatMoney(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function formatOrderDate(seconds) {
  return seconds ? new Date(seconds * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function shortOrderId(id) {
  return `#${String(id || "").slice(0, 8).toUpperCase()}`;
}

function getFulfillmentStatus(order) {
  return order.fulfillment_status || "unfulfilled";
}

function statusBadge(kind, status) {
  const value = status || "unset";
  return `<span class="status-badge status-${kind}-${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function getVisibleOrders() {
  const query = orderFilterSearch.value.trim().toLowerCase();
  const payment = orderFilterPayment.value;
  const fulfillment = orderFilterFulfillment.value;
  return adminOrders.filter((order) => {
    if (payment && order.payment_status !== payment) return false;
    if (fulfillment && getFulfillmentStatus(order) !== fulfillment) return false;
    if (!query) return true;
    return [order.id, order.user_email, order.tracking_number, ...(order.items || []).map((item) => item.name)]
      .some((field) => String(field || "").toLowerCase().includes(query));
  });
}

function renderOrders() {
  const visible = getVisibleOrders();
  orderFilterCount.textContent = `${visible.length} of ${adminOrders.length} orders`;

  if (!visible.length) {
    orderTableBody.innerHTML = `<tr><td colspan="8">${adminOrders.length ? "No orders match these filters." : "No orders yet."}</td></tr>`;
    return;
  }

  orderTableBody.innerHTML = visible
    .map((order) => {
      const items = order.items || [];
      const tracking = order.tracking_number
        ? `<small>${escapeHtml(order.shipping_carrier || "")} ${escapeHtml(order.tracking_number)}</small>`
        : "";
      return `
      <tr>
        <td><strong>${escapeHtml(shortOrderId(order.id))}</strong></td>
        <td>${escapeHtml(formatOrderDate(order.created_at))}</td>
        <td>${escapeHtml(order.user_email || "Guest")}${order.source === "api" ? `<small>API · ${escapeHtml(order.company || "partner")} · ref ${escapeHtml(order.partner_reference || "")}</small>` : ""}</td>
        <td>${escapeHtml(items.map((item) => (item.variant ? `${item.name} (${item.variant})` : item.name)).join(", ") || "—")}</td>
        <td>${formatMoney(order.total)}</td>
        <td>${statusBadge("payment", order.payment_status)}</td>
        <td>${statusBadge("shipping", getFulfillmentStatus(order))}${tracking}</td>
        <td>
          <div class="table-actions">
            <button class="button button-secondary" type="button" data-order-id="${escapeHtml(order.id)}">Manage</button>
            ${isSuperAdmin() ? `<button class="button danger-button" type="button" data-order-id="${escapeHtml(order.id)}" data-order-action="delete">Delete</button>` : ""}
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

async function loadOrders() {
  try {
    adminOrders = (await authApi("/orders")).orders || [];
    renderOrders();
  } catch (error) {
    orderTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
    if (error.status === 401) {
      clearCurrentUser();
      requireUser();
    }
  }
}

function openOrder(order) {
  orderEditId.value = order.id;
  const items = order.items || [];
  orderSummary.innerHTML = `
    <h3>Order ${escapeHtml(shortOrderId(order.id))}</h3>
    <p>${escapeHtml(order.user_email || "Guest")} · placed ${escapeHtml(formatOrderDate(order.created_at))}</p>
    <ul>${items.map((item) => `<li>${escapeHtml(item.name)}${item.variant ? ` <small>${escapeHtml(item.variant)}</small>` : ""} <span>${formatMoney(item.price)}</span></li>`).join("")}</ul>
    <p>
      Subtotal ${formatMoney(order.subtotal ?? order.total)} · Shipping ${formatMoney(order.shipping_total)}
      ${Number(order.tax_total) > 0 ? `· Tax ${formatMoney(order.tax_total)}${order.tax_place ? ` (${escapeHtml(order.tax_place)})` : ""} ` : ""}· <strong>Total ${formatMoney(order.total)}</strong>
    </p>
    <p>
      Paid with ${escapeHtml(order.payment_method || "—")} via ${escapeHtml(order.payment_gateway || "—")}
      ${order.stripe_session_id ? `· Stripe session <code>${escapeHtml(order.stripe_session_id)}</code>` : ""}
    </p>
    <p>Customer chose ${escapeHtml([order.shipping_carrier, order.shipping_service || order.shipping_method].filter(Boolean).join(" ") || "—")}
      (${escapeHtml(order.shipping_estimate || "no estimate")})</p>
  `;
  renderOrderCj(order);
  renderOrderLyrtrip(order);
  orderPaymentStatus.value = order.payment_status || "pending";
  orderFulfillmentStatus.value = getFulfillmentStatus(order);
  orderCarrier.value = order.shipping_carrier || "";
  orderTracking.value = order.tracking_number || "";
  orderNote.value = order.admin_note || "";
  orderHistory.innerHTML = (order.history || [])
    .slice()
    .reverse()
    .map((entry) => `<li><time>${escapeHtml(formatOrderDate(entry.at))}</time> ${escapeHtml(entry.change)} <small>by ${escapeHtml(entry.by)}</small></li>`)
    .join("");
  orderForm.hidden = false;
  showMessage(orderMessage, "");
  orderForm.scrollIntoView({ behavior: "smooth" });
}

function closeOrder() {
  orderForm.reset();
  orderForm.hidden = true;
  orderEditId.value = "";
}

async function saveOrder(event) {
  event.preventDefault();
  const orderId = orderEditId.value;
  if (orderFulfillmentStatus.value === "shipped" && !orderTracking.value.trim()) {
    showMessage(orderMessage, "Add a tracking number before marking the order shipped.", true);
    return;
  }
  orderSubmit.disabled = true;
  try {
    const { order } = await authApi(`/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: {
        payment_status: orderPaymentStatus.value,
        fulfillment_status: orderFulfillmentStatus.value,
        shipping_carrier: orderCarrier.value,
        tracking_number: orderTracking.value,
        admin_note: orderNote.value,
      },
    });
    adminOrders = adminOrders.map((existing) => (existing.id === order.id ? order : existing));
    renderOrders();
    closeOrder();
    showMessage(orderMessage, `Order ${shortOrderId(order.id)} saved.`);
  } catch (error) {
    showMessage(orderMessage, error.message, true);
  } finally {
    orderSubmit.disabled = false;
  }
}

async function deleteOrder(order) {
  if (!confirm(`Delete order ${shortOrderId(order.id)}? It will be removed from the order history for good.`)) return;
  try {
    await authApi(`/orders/${encodeURIComponent(order.id)}`, { method: "DELETE" });
    adminOrders = adminOrders.filter((existing) => existing.id !== order.id);
    if (orderEditId.value === order.id) closeOrder();
    renderOrders();
    showMessage(orderMessage, `Order ${shortOrderId(order.id)} deleted.`);
  } catch (error) {
    showMessage(orderMessage, error.message, true);
  }
}

function handleOrderTableClick(event) {
  const button = event.target.closest("[data-order-id]");
  if (!button) return;
  const order = adminOrders.find((item) => item.id === button.dataset.orderId);
  if (!order) return;
  if (button.dataset.orderAction === "delete") deleteOrder(order);
  else openOrder(order);
}

// ── CJ Dropshipping ────────────────────────────────────────────────────────────

const cjLookupForm = document.getElementById("cj-lookup-form");
const cjPidInput = document.getElementById("cj-pid");
const cjLookupSubmit = document.getElementById("cj-lookup-submit");
const cjMessage = document.getElementById("cj-message");
const cjProductPanel = document.getElementById("cj-product");
const orderCjPanel = document.getElementById("order-cj");
const CJ_FROM_COUNTRIES = ["CN", "US", "MX", "CA", "GB", "DE", "FR", "AU", "ES", "JP"];
let cjProduct = null;

// Accepts a bare product ID or a cjdropshipping.com product link (".../name-p-<pid>.html").
function parseCjPid(text) {
  const value = text.trim();
  const match = value.match(/-p-([A-Za-z0-9-]+)\.html/);
  return match ? match[1] : value;
}

function countrySelect(id, selected, codes) {
  const options = codes
    ? codes.map((code) => ({ code, name: code }))
    : LyrLocale.countryOptions();
  return `<select id="${id}">${options.map(({ code, name }) =>
    `<option value="${code}"${code === selected ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select>`;
}

// The labels the cart gives each choice, e.g. "Color: Red · Size: M"; one blank label for a product without options.
function lyrshopVariantLabels(product) {
  return (product.options || []).reduce((labels, option) => labels.flatMap((label) =>
    option.values.map((value) => [label, `${option.name}: ${value}`].filter(Boolean).join(" · "))), [""]);
}

function cjStockText(rows) {
  return (rows || []).map((row) => `${row.country} ${Number(row.total).toLocaleString()}`).join(" · ") || "—";
}

function renderCjProduct() {
  const { product, inventory } = cjProduct;
  const variantOptions = product.variants.map((variant) =>
    `<option value="${escapeHtml(variant.vid)}">${escapeHtml(variant.label || variant.sku)} · ${formatMoney(variant.price)}</option>`).join("");
  const linkable = adminProducts.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  cjProductPanel.innerHTML = `
    <div class="cj-product-head">
      ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : ""}
      <div>
        <h3>${escapeHtml(product.name || "CJ product")}</h3>
        <p>SKU ${escapeHtml(product.sku || "—")} · cost ${escapeHtml(product.sell_price || "—")} USD · ${Number(inventory.total).toLocaleString()} in stock</p>
        <p><code>${escapeHtml(product.pid)}</code></p>
      </div>
    </div>
    <h4>Variants</h4>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Variant</th><th>SKU</th><th>Cost</th><th>Weight</th><th>Stock by country</th></tr></thead>
        <tbody>${product.variants.map((variant) => `<tr>
          <td>${escapeHtml(variant.label || "—")}</td>
          <td><code>${escapeHtml(variant.sku || "")}</code></td>
          <td>${formatMoney(variant.price)}</td>
          <td>${variant.weight_g ? `${Math.round(variant.weight_g)} g` : "—"}</td>
          <td>${escapeHtml(cjStockText(inventory.variants[variant.vid]))}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <h4>Warehouses</h4>
    <ul class="cj-warehouses">${inventory.warehouses.map((warehouse) => `<li>
      <strong>${escapeHtml(warehouse.area || warehouse.country)}</strong> ${Number(warehouse.total).toLocaleString()}
      (CJ ${Number(warehouse.cj).toLocaleString()}, factory ${Number(warehouse.factory).toLocaleString()})
      ${warehouse.sub_warehouses.length ? `<small>${warehouse.sub_warehouses.length} sub-warehouse${warehouse.sub_warehouses.length === 1 ? "" : "s"}:
        ${warehouse.sub_warehouses.map((sub) => `${Number(sub.inventory + sub.factory_inventory).toLocaleString()}`).join(", ")}</small>` : ""}
    </li>`).join("") || "<li>No stock listed.</li>"}</ul>

    <h4>Link to a Lyrshop listing</h4>
    <p class="cj-hint">Orders for the linked listing can then be sent to CJ. Pick which CJ variant ships for each of its options.</p>
    <label>Lyrshop listing
      <select id="cj-link-product">
        <option value="">Choose a listing…</option>
        ${linkable.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.cj ? " (linked)" : ""}</option>`).join("")}
      </select>
    </label>
    <div id="cj-link-rows" class="cj-link-rows"></div>
    <button type="button" id="cj-link-save" class="button button-primary" hidden>Save link</button>

    <h4>Shipping quote</h4>
    <div class="cj-quote">
      <label>Variant <select id="cj-quote-variant">${variantOptions}</select></label>
      <label>Quantity <input type="number" id="cj-quote-qty" min="1" value="1" /></label>
      <label>Ship from ${countrySelect("cj-quote-from", "CN", CJ_FROM_COUNTRIES)}</label>
      <label>Ship to ${countrySelect("cj-quote-to", "US")}</label>
      <button type="button" id="cj-quote-submit" class="button button-secondary">Get rates</button>
    </div>
    <div id="cj-quote-results"></div>
  `;
  cjProductPanel.hidden = false;
}

function renderCjLinkRows() {
  const rows = document.getElementById("cj-link-rows");
  const saveButton = document.getElementById("cj-link-save");
  const listing = adminProducts.find((item) => item.id === document.getElementById("cj-link-product").value);
  saveButton.hidden = !listing;
  if (!listing) {
    rows.innerHTML = "";
    return;
  }
  const current = listing.cj?.pid === cjProduct.product.pid || !listing.cj?.pid ? listing.cj || {} : {};
  rows.innerHTML = lyrshopVariantLabels(listing).map((label) => {
    const chosen = (label ? current.variants?.[label] : null) || current.vid || "";
    return `<label>${escapeHtml(label || "Ships as")}
      <select data-cj-label="${escapeHtml(label)}">
        <option value="">Not linked</option>
        ${cjProduct.product.variants.map((variant) => `<option value="${escapeHtml(variant.vid)}"${variant.vid === chosen ? " selected" : ""}>
          ${escapeHtml(variant.label || variant.sku)}</option>`).join("")}
      </select>
    </label>`;
  }).join("");
  if (listing.cj?.pid && listing.cj.pid !== cjProduct.product.pid) {
    rows.insertAdjacentHTML("afterbegin", `<p class="cj-hint">This listing is linked to another CJ product; saving replaces that link.</p>`);
  }
}

async function saveCjLink() {
  const listing = adminProducts.find((item) => item.id === document.getElementById("cj-link-product").value);
  if (!listing) return;
  const link = { pid: cjProduct.product.pid, variants: {} };
  // Keep the ship-from warehouse when relinking the same CJ product (imports set it).
  if (listing.cj?.from && listing.cj.pid === link.pid) link.from = listing.cj.from;
  document.querySelectorAll("#cj-link-rows [data-cj-label]").forEach((select) => {
    if (!select.value) return;
    if (select.dataset.cjLabel) link.variants[select.dataset.cjLabel] = select.value;
    else link.vid = select.value;
  });
  if (!link.vid && !Object.keys(link.variants).length) {
    showMessage(cjMessage, "Pick at least one CJ variant to link.", true);
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(listing.id)}`, {
      method: "PUT",
      headers: sessionHeaders(),
      body: JSON.stringify({ cj: link }),
    });
    const json = await res.json().catch(() => ({}));
    if (!isApiSuccess(res)) throw new Error(json.message || "Couldn't save the link.");
    listing.cj = json.product?.cj || link;
    showMessage(cjMessage, `${listing.name} is linked to CJ.`);
    renderCjLinkRows();
  } catch (error) {
    showMessage(cjMessage, error.message, true);
  }
}

async function quoteCjShipping() {
  const results = document.getElementById("cj-quote-results");
  results.innerHTML = "<p>Getting rates…</p>";
  try {
    const { options } = await authApi("/cj/freight", {
      method: "POST",
      body: {
        from_country: document.getElementById("cj-quote-from").value,
        to_country: document.getElementById("cj-quote-to").value,
        items: [{ vid: document.getElementById("cj-quote-variant").value, quantity: Number(document.getElementById("cj-quote-qty").value) || 1 }],
      },
    });
    results.innerHTML = options.length
      ? `<table class="admin-table"><thead><tr><th>Method</th><th>Cost</th><th>Days</th></tr></thead><tbody>
          ${options.map((option) => `<tr><td>${escapeHtml(option.name)}</td><td>${formatMoney(option.total ?? option.price)}</td><td>${escapeHtml(option.days || "—")}</td></tr>`).join("")}
        </tbody></table>`
      : "<p>CJ has no shipping method for that route.</p>";
  } catch (error) {
    results.innerHTML = `<p class="admin-message is-error">${escapeHtml(error.message)}</p>`;
  }
}

async function lookupCjProduct(event) {
  event.preventDefault();
  const pid = parseCjPid(cjPidInput.value);
  if (!pid) return;
  cjLookupSubmit.disabled = true;
  showMessage(cjMessage, "Looking up…");
  try {
    cjProduct = await authApi(`/cj/products/${encodeURIComponent(pid)}`);
    renderCjProduct();
    showMessage(cjMessage, "");
  } catch (error) {
    cjProductPanel.hidden = true;
    showMessage(cjMessage, error.message, true);
  } finally {
    cjLookupSubmit.disabled = false;
  }
}

function initCjPanel() {
  cjLookupForm.addEventListener("submit", lookupCjProduct);
  cjProductPanel.addEventListener("change", (event) => {
    if (event.target.id === "cj-link-product") renderCjLinkRows();
  });
  cjProductPanel.addEventListener("click", (event) => {
    if (event.target.id === "cj-link-save") saveCjLink();
    if (event.target.id === "cj-quote-submit") quoteCjShipping();
  });
  orderCjPanel.addEventListener("click", handleOrderCjClick);
  cjImportForm.addEventListener("submit", saveCjImportSettings);
  cjImportCountries.addEventListener("input", showCjImportCountryNames);
  cjImportRun.addEventListener("click", runCjImport);
  [cjImportedSearch, cjImportedCountry, cjImportedStatus].forEach((input) => input.addEventListener("input", () => {
    cjImportedLimit = CJ_IMPORTED_PAGE_SIZE;
    renderCjImported();
  }));
  cjImportedMore.addEventListener("click", () => {
    cjImportedLimit += CJ_IMPORTED_PAGE_SIZE;
    renderCjImported();
  });
  cjImportedBody.addEventListener("click", handleCjImportedClick);
  loadCjImports();
  if (isSuperAdmin()) initAffiliatePanel();
}

// ── Brand and retailer (affiliate) imports from Rakuten and Impact ──

const affiliateSection = document.getElementById("affiliate-import");
const affiliateForm = document.getElementById("affiliate-settings");
const affiliateKeywords = document.getElementById("affiliate-keywords");
const affiliatePerKeyword = document.getElementById("affiliate-per-keyword");
const affiliateAdvertisers = document.getElementById("affiliate-advertisers");
const affiliateImpactCampaigns = document.getElementById("affiliate-impact-campaigns");
const affiliateNewStatus = document.getElementById("affiliate-new-status");
const affiliatePublishPerDay = document.getElementById("affiliate-publish-per-day");
const affiliateEnabled = document.getElementById("affiliate-enabled");
const affiliateRun = document.getElementById("affiliate-run");
const affiliateRunning = document.getElementById("affiliate-running");
const affiliateMessage = document.getElementById("affiliate-message");
let affiliateState = null;
let affiliatePoll = null;

function initAffiliatePanel() {
  affiliateSection.hidden = false;
  affiliateForm.addEventListener("submit", saveAffiliateSettings);
  affiliateNewStatus.addEventListener("change", () => {
    affiliatePublishPerDay.disabled = affiliateNewStatus.value !== "draft";
  });
  affiliateRun.addEventListener("click", runAffiliateImport);
  loadAffiliateImports();
}

async function loadAffiliateImports() {
  try {
    const wasRunning = affiliateState?.running;
    affiliateState = await authApi("/affiliate/import");
    renderAffiliateState();
    if (wasRunning && !affiliateState.running) {
      showMessage(affiliateMessage, `Import finished: ${affiliateState.last_run?.imported ?? 0} new brand listings.`);
      loadCurrentProducts(readSession());
    }
  } catch (error) {
    showMessage(affiliateMessage, error.message, true);
  }
  clearTimeout(affiliatePoll);
  if (affiliateState?.running) affiliatePoll = setTimeout(loadAffiliateImports, CJ_IMPORT_POLL_MS);
}

function renderAffiliateState() {
  const { settings, partners, last_run: lastRun, running, connected, networks = [] } = affiliateState;
  affiliateKeywords.value = (settings.keywords || []).join(", ");
  affiliatePerKeyword.value = settings.per_keyword;
  affiliateAdvertisers.value = (settings.advertisers || []).join(", ");
  affiliateImpactCampaigns.value = (settings.impact_campaigns || []).join(", ");
  affiliateNewStatus.value = settings.new_status || "draft";
  affiliatePublishPerDay.value = settings.publish_per_day ?? 10;
  affiliatePublishPerDay.disabled = affiliateNewStatus.value !== "draft";
  affiliateEnabled.checked = settings.enabled;
  const brandListings = adminProducts.filter((product) => product.source === "affiliate");
  const listed = brandListings.filter((product) => (product.status || "published") === "published").length;
  const queued = brandListings.filter((product) => product.status === "draft" && product.affiliate?.queued).length;
  const approved = { rakuten: "Rakuten brands", impact: "Impact retailers" };
  const where = { rakuten: "the Rakuten publisher dashboard", impact: "the Impact partner dashboard (Brands → Marketplace)" };
  const brands = partners
    ? Object.entries(partners).map(([network, list]) => (list.length
      ? `${approved[network] || network}: ${list.map((p) => `${escapeHtml(p.name)} (${escapeHtml(String(p.mid))})`).join(", ")}.`
      : `No ${(approved[network] || network).toLowerCase()} approved Lyrshop yet; apply in ${where[network] || network}.`)).join(" ")
    : "Approved brands and retailers show here after the first import.";
  document.getElementById("affiliate-status").innerHTML = connected
    ? `<strong>Connected to ${networks.map(escapeHtml).join(" and ")}.</strong> ${brands} ${listed} affiliate listing${listed === 1 ? "" : "s"} live, ${queued} draft${queued === 1 ? "" : "s"} waiting to publish.`
    : "<strong>Not connected.</strong> Add your Rakuten credentials to the <code>lyrshop/rakuten</code> secret (deploy with <code>RakutenSecret=lyrshop/rakuten</code>) and/or your Impact account SID and auth token to <code>lyrshop/impact</code> (deploy with <code>ImpactSecret=lyrshop/impact</code>).";
  affiliateRun.disabled = running || !connected;
  affiliateRunning.textContent = running ? "Importing… this page updates when it's done." : "";
  document.getElementById("affiliate-last").innerHTML = affiliateRunSummary(lastRun);
}

function affiliateRunSummary(run) {
  if (!run?.started_at) return "<p class=\"cj-hint\">No brand import has run yet.</p>";
  const who = run.by === "schedule" ? "daily schedule" : run.by;
  const rows = (run.keywords || []).map((row) => `<li>
    <strong>${escapeHtml(row.keyword)}</strong>${row.network ? ` (${escapeHtml(row.network)})` : ""}: ${row.imported} new · ${row.refreshed} refreshed · ${row.found} found
    ${row.errors?.length ? `<br /><small class="is-error">${row.errors.slice(0, 2).map(escapeHtml).join(" · ")}</small>` : ""}
  </li>`).join("");
  const errors = run.errors?.length ? `<p class="is-error">${run.errors.map(escapeHtml).join(" · ")}</p>` : "";
  const hidden = run.hidden ? ` · ${run.hidden} hidden (not in the seller's feed for 7 days)` : "";
  const published = run.published ? ` · ${run.published} draft${run.published === 1 ? "" : "s"} published, ${run.queued ?? 0} still waiting` : "";
  return `<p>Last import ${escapeHtml(formatOrderDate(run.started_at))} by ${escapeHtml(who)} · ${run.imported ?? 0} new · ${run.refreshed ?? 0} refreshed${hidden}${published}</p>${errors}<ul>${rows}</ul>`;
}

async function saveAffiliateSettings(event) {
  event.preventDefault();
  try {
    affiliateState = await authApi("/affiliate/import", {
      method: "PUT",
      body: {
        keywords: affiliateKeywords.value,
        per_keyword: Number(affiliatePerKeyword.value),
        advertisers: affiliateAdvertisers.value,
        impact_campaigns: affiliateImpactCampaigns.value,
        new_status: affiliateNewStatus.value,
        publish_per_day: Number(affiliatePublishPerDay.value),
        enabled: affiliateEnabled.checked,
      },
    });
    renderAffiliateState();
    showMessage(affiliateMessage, "Affiliate import settings saved.");
  } catch (error) {
    showMessage(affiliateMessage, error.message, true);
  }
}

async function runAffiliateImport() {
  affiliateRun.disabled = true;
  try {
    const { message } = await authApi("/affiliate/import/run", { method: "POST" });
    showMessage(affiliateMessage, message);
    affiliateState = { ...affiliateState, running: true };
    renderAffiliateState();
    clearTimeout(affiliatePoll);
    affiliatePoll = setTimeout(loadAffiliateImports, CJ_IMPORT_POLL_MS);
  } catch (error) {
    affiliateRun.disabled = false;
    showMessage(affiliateMessage, error.message, true);
  }
}

// ── CJ automatic imports ──

const cjImportForm = document.getElementById("cj-import-settings");
const cjImportCountries = document.getElementById("cj-import-countries");
const cjImportCountryNames = document.getElementById("cj-import-country-names");
const cjImportPerCountry = document.getElementById("cj-import-per-country");
const cjImportKeywords = document.getElementById("cj-import-keywords");
const cjImportPerKeyword = document.getElementById("cj-import-per-keyword");
const cjImportMarkup = document.getElementById("cj-import-markup");
const cjImportEnabled = document.getElementById("cj-import-enabled");
const cjImportRun = document.getElementById("cj-import-run");
const cjImportRunning = document.getElementById("cj-import-running");
const cjImportMessage = document.getElementById("cj-import-message");
const cjImportLast = document.getElementById("cj-import-last");
const cjImportedSearch = document.getElementById("cj-imported-search");
const cjImportedCountry = document.getElementById("cj-imported-country");
const cjImportedStatus = document.getElementById("cj-imported-status");
const cjImportedCount = document.getElementById("cj-imported-count");
const cjImportedBody = document.getElementById("cj-imported-body");
const cjImportedMore = document.getElementById("cj-imported-more");
const CJ_IMPORTED_PAGE_SIZE = 50;
const CJ_IMPORT_POLL_MS = 15000;
let cjImportedLimit = CJ_IMPORTED_PAGE_SIZE;
let cjImportState = null;
let cjImportPoll = null;

function countryList(codes) {
  return (codes || []).map((code) => LyrLocale.countryName(code)).join(", ");
}

function showCjImportCountryNames() {
  const codes = cjImportCountries.value.toUpperCase().split(/[\s,]+/).filter(Boolean);
  cjImportCountryNames.textContent = codes.length ? countryList(codes) : "Two-letter codes, separated by commas.";
}

async function loadCjImports() {
  try {
    const wasRunning = cjImportState?.running;
    cjImportState = await authApi("/cj/import");
    renderCjImportState();
    if (wasRunning && !cjImportState.running) {
      showMessage(cjImportMessage, `Import finished: ${cjImportState.last_run?.imported ?? 0} new listings.`);
      loadCurrentProducts(readSession());
    }
  } catch (error) {
    showMessage(cjImportMessage, error.message, true);
  }
  clearTimeout(cjImportPoll);
  if (cjImportState?.running) cjImportPoll = setTimeout(loadCjImports, CJ_IMPORT_POLL_MS);
}

function cjRunSummary(run) {
  if (!run?.started_at) return "<p class=\"cj-hint\">No import has run yet.</p>";
  const who = run.by === "schedule" ? "daily schedule" : run.by;
  const rows = (run.countries || []).map((row) => `<li>
    <strong>${escapeHtml(LyrLocale.countryName(row.country))}</strong>: ${row.imported} new
    ${row.imported ? `(${row.local} ship from there, ${row.imported - row.local} from abroad)` : ""}
    ${row.markets_added ? ` · ${row.markets_added} existing listing${row.markets_added === 1 ? "" : "s"} added` : ""}
    ${row.no_route ? ` · ${row.no_route} skipped (CJ doesn't ship there, or shipping costs more than the item)` : ""}
    ${Object.keys(row.keywords || {}).length ? `<br /><small>Keywords: ${Object.entries(row.keywords).map(([word, count]) => `${escapeHtml(word)} ${count}`).join(" · ")}</small>` : ""}
    ${row.errors?.length ? `<br /><small class="is-error">${row.errors.slice(0, 3).map(escapeHtml).join(" · ")}${row.errors.length > 3 ? ` · ${row.errors.length - 3} more` : ""}</small>` : ""}
  </li>`).join("");
  const quotes = run.quotes_added ? ` · shipping prices added to ${run.quotes_added} earlier listing${run.quotes_added === 1 ? "" : "s"}` : "";
  return `<p>Last import ${escapeHtml(formatOrderDate(run.started_at))} by ${escapeHtml(who)} · ${run.imported ?? 0} new listings${quotes}</p><ul>${rows}</ul>`;
}

function renderCjImportState() {
  const { settings, last_run: lastRun, running, can_edit: canEdit, scope } = cjImportState;
  cjImportCountries.value = settings.countries.join(", ");
  cjImportPerCountry.value = settings.per_country;
  cjImportKeywords.value = (settings.keywords || []).join(", ");
  cjImportPerKeyword.value = settings.per_keyword;
  cjImportMarkup.value = settings.markup;
  cjImportEnabled.checked = settings.enabled;
  cjImportForm.querySelectorAll("input, textarea, button").forEach((input) => { input.disabled = !canEdit; });
  document.getElementById("cj-import-save").hidden = !canEdit;
  showCjImportCountryNames();
  if (scope) {
    document.getElementById("cj-import-intro").textContent =
      `You manage ${countryList(scope)}. Import now adds CJ's trending products and keyword matches for your countries; only the super admin changes the daily settings.`;
  }
  cjImportRun.disabled = running;
  cjImportRunning.textContent = running ? "Importing… this page updates when it's done." : "";
  cjImportLast.innerHTML = cjRunSummary(lastRun);
  const countries = scope || [...new Set([...settings.countries,
    ...adminProducts.filter((product) => product.source === "cj").flatMap((product) => product.markets || [])])];
  const selected = cjImportedCountry.value;
  cjImportedCountry.innerHTML = `<option value="">${scope ? "All my countries" : "All countries"}</option>${countries
    .map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(LyrLocale.countryName(code))}</option>`).join("")}`;
  cjImportedCountry.value = countries.includes(selected) ? selected : "";
}

async function saveCjImportSettings(event) {
  event.preventDefault();
  try {
    cjImportState = await authApi("/cj/import", {
      method: "PUT",
      body: {
        countries: cjImportCountries.value,
        per_country: Number(cjImportPerCountry.value),
        keywords: cjImportKeywords.value,
        per_keyword: Number(cjImportPerKeyword.value),
        markup: Number(cjImportMarkup.value),
        enabled: cjImportEnabled.checked,
      },
    });
    renderCjImportState();
    showMessage(cjImportMessage, "Import settings saved.");
  } catch (error) {
    showMessage(cjImportMessage, error.message, true);
  }
}

async function runCjImport() {
  cjImportRun.disabled = true;
  try {
    const { message: started } = await authApi("/cj/import/run", { method: "POST" });
    showMessage(cjImportMessage, started);
    cjImportState = { ...cjImportState, running: true };
    renderCjImportState();
    clearTimeout(cjImportPoll);
    cjImportPoll = setTimeout(loadCjImports, CJ_IMPORT_POLL_MS);
  } catch (error) {
    cjImportRun.disabled = false;
    showMessage(cjImportMessage, error.message, true);
  }
}

function visibleCjImports() {
  const session = readSession();
  const query = cjImportedSearch.value.trim().toLowerCase();
  const country = cjImportedCountry.value;
  const status = cjImportedStatus.value;
  return adminProducts
    .filter((product) => product.source === "cj" && canEditProduct(product, session))
    .filter((product) => !country || productCountries(product).includes(country))
    .filter((product) => !status || (product.status || "published") === status)
    .filter((product) => !query || String(product.name).toLowerCase().includes(query))
    .sort((a, b) => (b.cj_imported_at || 0) - (a.cj_imported_at || 0));
}

function renderCjImported() {
  const rows = visibleCjImports();
  cjImportedCount.textContent = `${rows.length} imported`;
  cjImportedBody.innerHTML = rows.slice(0, cjImportedLimit).map((product) => {
    const published = (product.status || "published") === "published";
    const shipsFrom = product.location?.country || "CN";
    return `<tr>
      <td><img class="cj-imported-thumb" src="${escapeHtml(product.image_url || "logo.svg")}" alt="" loading="lazy" /></td>
      <td><strong>${escapeHtml(product.name)}</strong><br />
        <small>Ships from ${escapeHtml(LyrLocale.countryName(shipsFrom))} · CJ <code>${escapeHtml(product.cj?.pid || "")}</code></small></td>
      <td>${escapeHtml(countryList(product.markets))}</td>
      <td>${formatMoney(product.price)}${product.cj_cost ? `<br /><small>cost ${formatMoney(product.cj_cost)}</small>` : ""}</td>
      <td>${published ? "Published" : "Unpublished"}</td>
      <td><div class="table-actions">
        <button type="button" class="button button-secondary" data-cj-import-action="${published ? "unpublish" : "publish"}" data-product-id="${escapeHtml(product.id)}">${published ? "Unpublish" : "Publish"}</button>
        <button type="button" class="button button-secondary" data-cj-import-action="edit" data-product-id="${escapeHtml(product.id)}">Edit</button>
        <button type="button" class="button danger-button" data-cj-import-action="delete" data-product-id="${escapeHtml(product.id)}">Delete</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6">${adminProducts.some((product) => product.source === "cj")
    ? "No imported products match these filters." : "Nothing imported yet. Use Import now, or wait for the daily import."}</td></tr>`;
  cjImportedMore.hidden = rows.length <= cjImportedLimit;
}

async function handleCjImportedClick(event) {
  const button = event.target.closest("[data-cj-import-action]");
  if (!button) return;
  const product = adminProducts.find((item) => item.id === button.dataset.productId);
  if (!product) return;
  const action = button.dataset.cjImportAction;
  if (action === "edit") {
    document.querySelector("[data-admin-section='products']").click();
    startEditProduct(product);
    return;
  }
  if (action === "delete") {
    // Deleted imports aren't imported again.
    await deleteProduct(product.id, readSession());
    return;
  }
  button.disabled = true;
  try {
    const status = action === "publish" ? "published" : "draft";
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      headers: sessionHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!isApiSuccess(res)) throw new Error(json.message || "Couldn't change the listing.");
    product.status = status;
    renderCjImported();
    renderProducts(readSession());
    showMessage(cjImportMessage, `${product.name} is ${status === "published" ? "published" : "hidden from the store"}.`);
  } catch (error) {
    button.disabled = false;
    showMessage(cjImportMessage, error.message, true);
  }
}

// ── CJ on an order ──

const CJ_ADDRESS_FIELDS = [
  ["name", "Name"], ["address", "Address"], ["address2", "Address line 2"], ["city", "City"],
  ["province", "State / province"], ["zip", "ZIP / postal code"], ["country_code", "Country code"], ["phone", "Phone"],
];

function cjVariantFor(item) {
  const link = adminProducts.find((product) => product.id === item.id)?.cj;
  return link && ((link.variants || {})[item.variant || ""] || link.vid);
}

function formatAddress(address) {
  if (!address) return "";
  return [address.name, address.address, address.address2,
    [address.city, address.province, address.zip].filter(Boolean).join(", "), address.country_code, address.phone]
    .filter(Boolean).map(escapeHtml).join("<br />");
}

function renderOrderCj(order) {
  const address = order.shipping_address;
  const addressBlock = address ? `<p class="cj-address"><strong>Ship to</strong><br />${formatAddress(address)}</p>` : "";
  if (order.cj_order_id) {
    orderCjPanel.innerHTML = `${addressBlock}
      <p><strong>CJ Dropshipping</strong> · order <code>${escapeHtml(order.cj_order_id)}</code> · ${escapeHtml(order.cj_status || "status unknown")}
      ${order.cj_logistic_name ? ` · ${escapeHtml(order.cj_logistic_name)}` : ""}</p>
      <p class="cj-hint">Pay for it in your CJ dashboard so CJ ships it. Syncing copies CJ's status and tracking number here.</p>
      <button type="button" class="button button-secondary" data-cj-action="sync">Sync from CJ</button>`;
    return;
  }
  const units = order.items || [];
  const unlinked = [...new Set(units.filter((item) => !cjVariantFor(item)).map((item) => item.name))];
  const linkedCount = units.length - units.filter((item) => !cjVariantFor(item)).length;
  if (!linkedCount) {
    orderCjPanel.innerHTML = addressBlock;
    return;
  }
  if (!["paid", "invoiced"].includes(order.payment_status)) {
    orderCjPanel.innerHTML = `${addressBlock}<p class="cj-hint">CJ: this order can be sent for fulfillment once it's paid.</p>`;
    return;
  }
  // Imported listings remember the CJ warehouse they ship from.
  const shipsFrom = units.map((item) => adminProducts.find((product) => product.id === item.id)?.cj?.from).find(Boolean) || "CN";
  if (unlinked.length) {
    orderCjPanel.innerHTML = `${addressBlock}<p class="cj-hint">CJ: link ${unlinked.map(escapeHtml).join(", ")} in the CJ Dropshipping tab before sending this order.</p>`;
    return;
  }
  orderCjPanel.innerHTML = `${addressBlock}
    <fieldset class="cj-send">
      <legend>Send to CJ Dropshipping</legend>
      ${address ? "" : `<p class="cj-hint">No address was saved from checkout. Enter where it ships:</p>
        <div class="cj-address-fields">${CJ_ADDRESS_FIELDS.map(([field, label]) =>
          `<label>${label}<input type="text" data-cj-address="${field}" value="${escapeHtml(field === "country_code" ? order.shipping_country || "" : field === "zip" ? order.shipping_zip || "" : "")}" /></label>`).join("")}</div>`}
      <label>Ship from ${countrySelect("order-cj-from", shipsFrom, [...new Set([shipsFrom, ...CJ_FROM_COUNTRIES])])}</label>
      <button type="button" class="button button-secondary" data-cj-action="rates">Get CJ shipping methods</button>
      <label>Shipping method <select id="order-cj-method" disabled><option value="">Get methods first</option></select></label>
      <button type="button" class="button button-primary" data-cj-action="send" disabled>Send to CJ</button>
      <p class="cj-hint">This creates the order in CJ without paying for it. You pay in the CJ dashboard.</p>
    </fieldset>`;
}

function readCjAddress() {
  const fields = orderCjPanel.querySelectorAll("[data-cj-address]");
  if (!fields.length) return undefined;
  return Object.fromEntries([...fields].map((input) => [input.dataset.cjAddress, input.value.trim()]));
}

async function handleOrderCjClick(event) {
  const button = event.target.closest("[data-cj-action]");
  if (!button) return;
  const order = adminOrders.find((item) => item.id === orderEditId.value);
  if (!order) return;
  const action = button.dataset.cjAction;
  button.disabled = true;
  try {
    if (action === "rates") {
      const quantities = {};
      (order.items || []).forEach((item) => {
        const vid = cjVariantFor(item);
        quantities[vid] = (quantities[vid] || 0) + 1;
      });
      const toCountry = readCjAddress()?.country_code || order.shipping_address?.country_code || order.shipping_country;
      const { options } = await authApi("/cj/freight", {
        method: "POST",
        body: {
          from_country: document.getElementById("order-cj-from").value,
          to_country: toCountry,
          zip: order.shipping_address?.zip || order.shipping_zip || "",
          items: Object.entries(quantities).map(([vid, quantity]) => ({ vid, quantity })),
        },
      });
      const select = document.getElementById("order-cj-method");
      select.innerHTML = options.length
        ? options.map((option) => `<option value="${escapeHtml(option.name)}">${escapeHtml(option.name)} · ${formatMoney(option.total ?? option.price)} · ${escapeHtml(option.days || "?")} days</option>`).join("")
        : `<option value="">No CJ method ships there</option>`;
      // Preselect the method the shopper was charged for, when the listing was imported with a CJ quote.
      const quoted = (order.items || []).map((item) => adminProducts.find((product) => product.id === item.id)?.cj_shipping?.[toCountry]?.method)
        .find(Boolean);
      if (quoted && options.some((option) => option.name === quoted)) select.value = quoted;
      select.disabled = !options.length;
      orderCjPanel.querySelector("[data-cj-action='send']").disabled = !options.length;
      return;
    }
    if (action === "send" && !confirm(`Create order ${shortOrderId(order.id)} in CJ? You'll still need to pay for it in CJ before it ships.`)) return;
    const path = `/orders/${encodeURIComponent(order.id)}/cj${action === "sync" ? "/sync" : ""}`;
    const body = action === "sync" ? {} : {
      logistic_name: document.getElementById("order-cj-method").value,
      from_country: document.getElementById("order-cj-from").value,
      address: readCjAddress(),
    };
    const { order: updated } = await authApi(path, { method: "POST", body });
    adminOrders = adminOrders.map((existing) => (existing.id === updated.id ? updated : existing));
    renderOrders();
    openOrder(updated);
    showMessage(orderMessage, action === "sync" ? "Synced from CJ." : `Sent to CJ as ${updated.cj_order_id}. Pay for it in CJ to ship.`);
  } catch (error) {
    showMessage(orderMessage, error.message, true);
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

// ── Shipping through Lyrtrip: labels and same-day couriers per order ──

const orderLyrtripPanel = document.getElementById("order-lyrtrip");
const LYRTRIP_LABEL_STATUS = {
  confirmed: "Label bought", processing: "Buying the label…", needs_review: "Payment went through; Lyrtrip is checking the label",
  label_failed: "Label failed",
};
let lyrtripRates = [];
let lyrtripShipFrom = "";

function lyrtripLabelBlock(label, from) {
  if (!label) return "";
  const docs = (label.documents || []).map((doc) => `<a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.category || "document")}</a>`).join(" · ");
  if (label.manual) {
    return `<p><strong>Shipped by hand</strong>${from ? ` (from ${escapeHtml(from)})` : ""} · ${escapeHtml(label.courier || "")} ${escapeHtml(label.tracking_number || "")}</p>`;
  }
  return `<p><strong>Lyrtrip label</strong>${from ? ` (from ${escapeHtml(from)})` : ""} · ${escapeHtml(LYRTRIP_LABEL_STATUS[label.status] || label.status || "")}
    ${label.courier ? ` · ${escapeHtml(label.courier)}` : ""}${label.price != null ? ` · ${formatMoney(label.price)}` : ""}
    ${label.delivery_state ? ` · ${escapeHtml(String(label.delivery_state).replaceAll("_", " "))}` : ""}</p>
    ${docs ? `<p>${docs}</p>` : ""}${label.error ? `<p class="is-error">${escapeHtml(label.error)}</p>` : ""}`;
}

function lyrtripCourierBlock(courier) {
  if (!courier) return "";
  const who = courier.courier?.name ? ` · ${escapeHtml(courier.courier.name)}${courier.courier.vehicle ? ` (${escapeHtml(courier.courier.vehicle)})` : ""}` : "";
  return `<p><strong>Same-day courier</strong>${courier.provider ? ` (${escapeHtml(courier.provider)})` : ""} · ${escapeHtml(courier.status || "")}${courier.step ? ` (${escapeHtml(String(courier.step).replaceAll("_", " "))})` : ""}
    ${courier.price != null ? ` · ${escapeHtml(courier.currency || "USD")} ${Number(courier.price).toFixed(2)}` : ""}${who}
    ${courier.tracking_url ? ` · <a href="${escapeHtml(courier.tracking_url)}" target="_blank" rel="noopener">Live tracking</a>` : ""}</p>
    ${courier.error ? `<p class="is-error">${escapeHtml(courier.error)}</p>` : ""}`;
}

function renderOrderLyrtrip(order) {
  lyrtripRates = [];
  lyrtripShipFrom = "";
  const label = order.lyrtrip_label;
  const courier = order.lyrtrip_courier;
  const extraLabels = Object.entries(order.lyrtrip_labels || {}).map(([from, extra]) => lyrtripLabelBlock(extra, from)).join("");
  const status = `${lyrtripLabelBlock(label, label?.ship_from)}${extraLabels}${lyrtripCourierBlock(courier)}`;
  const sync = label || courier ? `<button type="button" class="button button-secondary" data-lyrtrip-action="sync">Refresh tracking</button>` : "";
  if (order.cj_order_id || (order.kind || "order") !== "order") {
    orderLyrtripPanel.innerHTML = status;
    return;
  }
  if (!["paid", "invoiced"].includes(order.payment_status)) {
    orderLyrtripPanel.innerHTML = `${status}<p class="cj-hint">Lyrtrip shipping: a label or courier can be booked once the order is paid.</p>`;
    return;
  }
  if (!order.shipping_address?.address) {
    orderLyrtripPanel.innerHTML = `${status}<p class="cj-hint">Lyrtrip shipping needs the buyer's address, which Stripe Checkout saves on paid orders.</p>${sync}`;
    return;
  }
  const hasCourier = ["active", "delivered", "processing"].includes(courier?.status);
  // The label form stays after a label: orders with items in several warehouses get one per parcel (the server refuses a
  // second label for a parcel, and the parcel picker marks labelled ones).
  orderLyrtripPanel.innerHTML = `${status}
    <fieldset class="cj-send">
      <legend>Ship with Lyrtrip</legend>
      <div class="cj-address-fields">
        <label>Weight (kg)<input type="number" id="lyrtrip-weight" min="0.01" max="70" step="0.01" placeholder="from the listings" /></label>
        <label>Length (cm)<input type="number" id="lyrtrip-length" min="1" max="200" step="0.5" placeholder="default box" /></label>
        <label>Width (cm)<input type="number" id="lyrtrip-width" min="1" max="200" step="0.5" /></label>
        <label>Height (cm)<input type="number" id="lyrtrip-height" min="1" max="200" step="0.5" /></label>
      </div>
      <div id="lyrtrip-groups"></div>
      <button type="button" class="button button-secondary" data-lyrtrip-action="rates">Get label rates</button>
      <label>Courier <select id="lyrtrip-rate" disabled><option value="">Get rates first</option></select></label>
      <button type="button" class="button button-primary" data-lyrtrip-action="label" disabled>Buy label</button>
      ${hasCourier ? "" : `
      <p class="cj-hint">Or, for a buyer nearby, a same-day courier from the parcel's ship-from address:</p>
      <label>Drop-off notes<input type="text" id="lyrtrip-dropoff-notes" maxlength="280" placeholder="Leave with the doorman" /></label>
      <button type="button" class="button button-secondary" data-lyrtrip-action="courier-quote">Quote couriers</button>
      <label>Courier <select id="lyrtrip-courier-choice" disabled><option value="">Quote first</option></select></label>
      <button type="button" class="button button-primary" data-lyrtrip-action="courier-book" disabled>Book courier</button>
      <span id="lyrtrip-courier-quote" class="cj-hint"></span>`}
      ${sync}
      <p class="cj-hint">Labels are billed to Lyrshop's Lyrtrip account; couriers to whichever account you book. Buying a label or booking a courier marks the order shipped.</p>
    </fieldset>`;
}

function readLyrtripParcel() {
  const value = (id) => Number(document.getElementById(id)?.value) || undefined;
  const parcel = { weight_kg: value("lyrtrip-weight"), length_cm: value("lyrtrip-length"), width_cm: value("lyrtrip-width"), height_cm: value("lyrtrip-height") };
  return Object.values(parcel).some(Boolean) ? parcel : undefined;
}

async function handleOrderLyrtripClick(event) {
  const button = event.target.closest("[data-lyrtrip-action]");
  if (!button) return;
  const order = adminOrders.find((item) => item.id === orderEditId.value);
  if (!order) return;
  const action = button.dataset.lyrtripAction;
  const base = `/orders/${encodeURIComponent(order.id)}/lyrtrip`;
  button.disabled = true;
  try {
    if (action === "rates") {
      const reply = await authApi(`${base}/rates`, { method: "POST", body: { parcel: readLyrtripParcel(), ship_from: lyrtripShipFrom } });
      lyrtripRates = reply.rates || [];
      renderLyrtripGroups(reply);
      const select = document.getElementById("lyrtrip-rate");
      select.innerHTML = lyrtripRates.length
        ? lyrtripRates.map((rate) => `<option value="${escapeHtml(rate.id)}">${escapeHtml(rate.courier)} · ${formatMoney(rate.price)} · ${rate.minDays ?? "?"}-${rate.maxDays ?? "?"} days</option>`).join("")
        : `<option value="">${escapeHtml(reply.error || "No courier ships this parcel")}</option>`;
      if (reply.chosen && lyrtripRates.some((rate) => rate.id === reply.chosen)) select.value = reply.chosen;
      select.disabled = !lyrtripRates.length;
      orderLyrtripPanel.querySelector("[data-lyrtrip-action='label']").disabled = !lyrtripRates.length;
      if (!document.getElementById("lyrtrip-weight").value) document.getElementById("lyrtrip-weight").placeholder = `${reply.parcel?.weightKg} kg`;
      showMessage(orderMessage, `The buyer paid ${formatMoney(order.shipping_total)} for shipping.`);
      return;
    }
    if (action === "courier-quote") {
      // Lyrtrip's courier account and Lyrshop's own DoorDash / Uber Direct accounts, cheapest first.
      const { quotes = [], error } = await authApi(`${base}/courier/quote`, { method: "POST", body: { dropoff_notes: document.getElementById("lyrtrip-dropoff-notes").value, ship_from: lyrtripShipFrom } });
      const choice = document.getElementById("lyrtrip-courier-choice");
      choice.innerHTML = quotes.length
        ? quotes.map((quote, index) => `<option value="${index}">${escapeHtml(quote.provider)} · ${escapeHtml(quote.currency)} ${Number(quote.price).toFixed(2)}${
          quote.totalMinutes != null ? ` · delivered in about ${quote.totalMinutes} min` : ""}</option>`).join("")
        : `<option value="">${escapeHtml(error || "No courier can do this trip")}</option>`;
      choice.disabled = !quotes.length;
      choice.quotes = quotes;
      document.getElementById("lyrtrip-courier-quote").textContent = quotes.length && error ? error : "";
      orderLyrtripPanel.querySelector("[data-lyrtrip-action='courier-book']").disabled = !quotes.length;
      return;
    }
    let body = {};
    if (action === "label") {
      const rate = lyrtripRates.find((item) => item.id === document.getElementById("lyrtrip-rate").value);
      if (!rate || !confirm(`Buy a ${rate.courier} label for ${formatMoney(rate.price)}? It's billed to Lyrshop's Lyrtrip account.`)) return;
      body = { rate_id: rate.id, max_price: rate.price, parcel: readLyrtripParcel(), ship_from: lyrtripShipFrom };
    }
    if (action === "manual") {
      body = {
        ship_from: lyrtripShipFrom, carrier: document.getElementById("lyrtrip-manual-carrier").value,
        tracking_number: document.getElementById("lyrtrip-manual-number").value, tracking_url: document.getElementById("lyrtrip-manual-url").value,
      };
    }
    if (action === "courier-book") {
      const choice = document.getElementById("lyrtrip-courier-choice");
      const quote = choice.quotes?.[Number(choice.value)];
      if (!quote) return;
      // A little room for the fee moving between the quote and the booking; the server refuses anything above it.
      const maxPrice = Math.ceil(quote.price * 1.05 * 100) / 100;
      const account = quote.provider === "Lyrtrip" ? "Lyrshop's Lyrtrip account" : `Lyrshop's ${quote.provider} account`;
      if (!confirm(`Book a ${quote.provider} courier for up to ${quote.currency} ${maxPrice.toFixed(2)}? It's billed to ${account}.`)) return;
      body = { provider: quote.provider, max_price: maxPrice, dropoff_notes: document.getElementById("lyrtrip-dropoff-notes").value, ship_from: lyrtripShipFrom };
    }
    const path = { label: `${base}/label`, manual: `${base}/manual`, "courier-book": `${base}/courier/book`, sync: `${base}/sync` }[action];
    const { order: updated } = await authApi(path, { method: "POST", body });
    adminOrders = adminOrders.map((existing) => (existing.id === updated.id ? updated : existing));
    renderOrders();
    openOrder(updated);
    const done = {
      label: updated.lyrtrip_label?.status === "confirmed" ? `Label bought. Tracking ${updated.tracking_number}.` : LYRTRIP_LABEL_STATUS[updated.lyrtrip_label?.status] || "Label requested.",
      "courier-book": updated.lyrtrip_courier?.status === "active" ? `${updated.lyrtrip_courier.provider || "Courier"} booked.` : "Booking the courier… refresh tracking in a minute.",
      sync: "Tracking refreshed.",
      manual: "Parcel recorded as shipped.",
    };
    showMessage(orderMessage, done[action]);
  } catch (error) {
    showMessage(orderMessage, error.message, true);
    if (action === "label" || action === "courier-book") loadOrders();
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

// After the first rates call: which parcel (ship-from place) the form is for, and the local post / EMS estimates when
// no Lyrtrip courier takes it.
function renderLyrtripGroups(reply) {
  const box = document.getElementById("lyrtrip-groups");
  if (!box) return;
  lyrtripShipFrom = reply.ship_from || "";
  const groups = reply.groups || [];
  const picker = groups.length > 1
    ? `<label>Parcel <select id="lyrtrip-ship-from">${groups.map((group) => `<option value="${escapeHtml(group.id)}"${group.id === lyrtripShipFrom ? " selected" : ""}>From ${escapeHtml(group.label)}: ${escapeHtml(group.items.join(", "))}${group.lyrtrip_label?.status === "confirmed" ? " (labelled)" : ""}</option>`).join("")}</select></label>`
    : groups.length ? `<p class="cj-hint">Ships from ${escapeHtml(groups[0].label)}.</p>` : "";
  const local = (reply.local_post || []).length
    ? `<p class="cj-hint">No Lyrtrip courier for this parcel. Local post estimates: ${reply.local_post.map((rate) => `${escapeHtml(rate.service)} ${formatMoney(rate.amount)} (${escapeHtml(rate.estimate)})`).join(" · ")}. Ship it at the post office and record it below.</p>`
    : "";
  const chosen = groups.find((group) => group.id === lyrtripShipFrom);
  const recorded = chosen?.lyrtrip_label?.manual ? chosen.lyrtrip_label : null;
  // A parcel shipped by hand (local post, EMS, any courier) gets its own tracking number on the order.
  const manual = chosen?.lyrtrip_label?.status === "confirmed" && !recorded ? "" : `
      <div class="cj-address-fields">
        <label>Shipped by hand with<input type="text" id="lyrtrip-manual-carrier" maxlength="60" placeholder="${escapeHtml(reply.local_post?.[0]?.carrier || "Posta Kenya, EMS…")}" value="${escapeHtml(recorded?.courier || "")}" /></label>
        <label>Tracking number<input type="text" id="lyrtrip-manual-number" maxlength="60" value="${escapeHtml(recorded?.tracking_number || "")}" /></label>
        <label>Tracking link (optional)<input type="url" id="lyrtrip-manual-url" maxlength="300" placeholder="https://" /></label>
      </div>
      <button type="button" class="button button-secondary" data-lyrtrip-action="manual">${recorded ? "Correct tracking" : "Record parcel as shipped"}</button>`;
  box.innerHTML = picker + local + manual;
}

orderLyrtripPanel.addEventListener("click", handleOrderLyrtripClick);
orderLyrtripPanel.addEventListener("change", (event) => {
  if (event.target.id !== "lyrtrip-ship-from") return;
  lyrtripShipFrom = event.target.value;
  orderLyrtripPanel.querySelector("[data-lyrtrip-action='rates']")?.click();
});

// ── Shipping (Lyrtrip) settings and statement, super admin ──

const lyrtripSettingsForm = document.getElementById("lyrtrip-settings");
const lyrtripMessage = document.getElementById("lyrtrip-message");
const LYRTRIP_ORIGIN_FIELDS = ["name", "company", "phone", "email", "line1", "line2", "city", "state", "postal_code", "country"];
const LYRTRIP_BOX_SIDES = ["length_cm", "width_cm", "height_cm"];

const LYRTRIP_WAREHOUSE_FIELDS = [
  ["label", "Name", "text", 60], ["line1", "Street", "text", 35], ["line2", "Apt, suite", "text", 35], ["city", "City", "text", 35],
  ["state", "State / province", "text", 35], ["postal_code", "Postal code", "text", 12], ["name", "Contact name", "text", 50],
  ["phone", "Phone", "tel", 30], ["email", "Email", "email", 80], ["pickup_notes", "Courier pickup notes", "text", 280],
];

function warehouseRow(warehouse = {}) {
  const row = document.createElement("div");
  row.className = "cj-address-fields lyrtrip-warehouse";
  row.dataset.id = warehouse.id || "";
  row.innerHTML = `${LYRTRIP_WAREHOUSE_FIELDS.map(([field, label, type, max]) => `<label>${label}<input type="${type}" data-field="${field}" maxlength="${max}" value="${escapeHtml(warehouse[field] || "")}" /></label>`).join("")}
    <label>Country<select data-field="country">${LyrLocale.countryOptions().map(({ code, name }) => `<option value="${code}"${code === (warehouse.country || "US") ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>
    <button type="button" class="button button-secondary" data-warehouse-remove>Remove</button>`;
  return row;
}

function renderWarehouses(warehouses) {
  const list = document.getElementById("lyrtrip-warehouses");
  list.replaceChildren(...(warehouses || []).map(warehouseRow));
}

function collectWarehouses() {
  return [...document.querySelectorAll("#lyrtrip-warehouses .lyrtrip-warehouse")].map((row) => ({
    id: row.dataset.id,
    ...Object.fromEntries([...row.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value])),
  }));
}

function setWarehouseValue(value) {
  if (value && ![...warehouseInput.options].some((option) => option.value === value)) {
    warehouseInput.add(new Option(value, value));
  }
  warehouseInput.value = value;
}

function fillWarehouseOptions(settings) {
  const current = warehouseInput.value;
  const places = [{ id: "main", label: "Main warehouse", ...settings.origin }, ...(settings.warehouses || [])];
  warehouseInput.replaceChildren(warehouseInput.options[0],
    ...places.map((place) => new Option(`${place.label} (${[place.city, place.country].filter(Boolean).join(", ")})`, place.id)));
  setWarehouseValue(current);
}

// Admins pick a listing's warehouse; the list comes from the Lyrtrip settings.
async function loadWarehouseOptions() {
  try {
    fillWarehouseOptions((await authApi("/lyrtrip/settings")).settings);
  } catch {
    // Without the settings the listing ships from the warehouse nearest the item.
  }
}

function renderLyrtripSettings({ settings, connected }) {
  renderWarehouses(settings.warehouses);
  fillWarehouseOptions(settings);
  LYRTRIP_ORIGIN_FIELDS.forEach((field) => { document.getElementById(`lyrtrip-origin-${field}`).value = settings.origin[field] || ""; });
  LYRTRIP_BOX_SIDES.forEach((side) => { document.getElementById(`lyrtrip-box-${side}`).value = settings.box[side]; });
  document.getElementById("lyrtrip-pickup-notes").value = settings.pickup_notes || "";
  document.getElementById("lyrtrip-live-rates").checked = !!settings.live_rates;
  document.getElementById("lyrtrip-margin").value = settings.margin_pct ?? 0;
  document.getElementById("lyrtrip-status").innerHTML = connected
    ? "<strong>Connected to Lyrtrip.</strong> Labels and couriers can be booked from each paid order."
    : "<strong>Not connected.</strong> Put Lyrtrip's partner API url and key in the <code>lyrshop/lyrtrip</code> secret and deploy with <code>LyrtripSecret=lyrshop/lyrtrip</code>.";
}

async function loadLyrtripSettings() {
  const select = document.getElementById("lyrtrip-origin-country");
  select.innerHTML = LyrLocale.countryOptions().map(({ code, name }) => `<option value="${code}">${escapeHtml(name)}</option>`).join("");
  document.getElementById("lyrtrip-month").value = new Date().toISOString().slice(0, 7);
  try {
    renderLyrtripSettings(await authApi("/lyrtrip/settings"));
  } catch (error) {
    showMessage(lyrtripMessage, error.message, true);
  }
}

async function saveLyrtripSettings(event) {
  event.preventDefault();
  try {
    renderLyrtripSettings(await authApi("/lyrtrip/settings", {
      method: "PUT",
      body: {
        origin: Object.fromEntries(LYRTRIP_ORIGIN_FIELDS.map((field) => [field, document.getElementById(`lyrtrip-origin-${field}`).value])),
        box: Object.fromEntries(LYRTRIP_BOX_SIDES.map((side) => [side, Number(document.getElementById(`lyrtrip-box-${side}`).value)])),
        pickup_notes: document.getElementById("lyrtrip-pickup-notes").value,
        warehouses: collectWarehouses(),
        live_rates: document.getElementById("lyrtrip-live-rates").checked,
        margin_pct: Number(document.getElementById("lyrtrip-margin").value) || 0,
      },
    }));
    showMessage(lyrtripMessage, "Shipping settings saved.");
  } catch (error) {
    showMessage(lyrtripMessage, error.message, true);
  }
}

async function loadLyrtripStatement() {
  const panel = document.getElementById("lyrtrip-statement");
  const month = document.getElementById("lyrtrip-month").value;
  panel.innerHTML = "<p class=\"cj-hint\">Loading…</p>";
  try {
    const { totals = {}, entries = [], truncated } = await authApi(`/lyrtrip/statement${month ? `?month=${encodeURIComponent(month)}` : ""}`);
    const sums = Object.entries(totals).map(([currency, t]) => `<strong>${escapeHtml(currency)} ${Number(t.amount).toFixed(2)}</strong> owed for ${t.count} label${t.count === 1 ? "" : "s"}/courier${t.count === 1 ? "" : "s"}`).join(" · ");
    panel.innerHTML = entries.length
      ? `<p>${sums}${truncated ? " (first 500 shown)" : ""}</p>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>What</th><th>Order</th><th>Amount</th></tr></thead><tbody>
        ${entries.map((entry) => `<tr><td>${escapeHtml(String(entry.createdAt).slice(0, 10))}</td><td>${escapeHtml(entry.description || entry.kind)}</td>
          <td>${escapeHtml(shortOrderId(entry.reference))}</td><td>${escapeHtml(entry.currency)} ${Number(entry.amount).toFixed(2)}</td></tr>`).join("")}
        </tbody></table></div>`
      : "<p class=\"cj-hint\">Nothing shipped through Lyrtrip this month.</p>";
  } catch (error) {
    panel.innerHTML = `<p class="is-error">${escapeHtml(error.message)}</p>`;
  }
}

lyrtripSettingsForm.addEventListener("submit", saveLyrtripSettings);
document.getElementById("lyrtrip-warehouse-add").addEventListener("click", () => {
  document.getElementById("lyrtrip-warehouses").append(warehouseRow());
});
document.getElementById("lyrtrip-warehouses").addEventListener("click", (event) => {
  if (event.target.closest("[data-warehouse-remove]")) event.target.closest(".lyrtrip-warehouse").remove();
});
document.getElementById("lyrtrip-statement-load").addEventListener("click", loadLyrtripStatement);

// ── Category management ────────────────────────────────────────────────────────

function resetCategoryForm() {
  categoryForm.reset();
  categoryEditIndex.value = "";
  categorySubmit.textContent = "Create category";
  showMessage(categoryMessage, "");
}

function renderCategories() {
  const categories = readCategories();
  renderCategoryOptions();

  if (!categories.length) {
    categoryList.innerHTML = "<p>No categories yet. Create one to use it in the product form.</p>";
    return;
  }

  categoryList.innerHTML = categories
    .map((category, index) => `
      <article class="category-admin-card">
        <img src="${escapeHtml(category.image_url || defaultCategories[0].image_url)}" alt="${escapeHtml(category.label)}" />
        <div>
          <strong>${escapeHtml(category.label)}</strong>
          <span>${escapeHtml(category.name)}</span>
          <small>${escapeHtml((category.subcategories || []).join(", ") || "No subcategories")}</small>
        </div>
        <div class="table-actions">
          <button class="button button-secondary" type="button" data-category-action="edit" data-index="${index}">Edit</button>
          <button class="button danger-button" type="button" data-category-action="delete" data-index="${index}">Delete</button>
        </div>
      </article>
    `)
    .join("");
}

function saveCategory(event) {
  event.preventDefault();
  const categories = readCategories();
  const editIndex = categoryEditIndex.value === "" ? -1 : Number(categoryEditIndex.value);
  const name = categoryName.value.trim();
  const duplicateIndex = categories.findIndex((cat, index) => cat.name.toLowerCase() === name.toLowerCase() && index !== editIndex);

  if (duplicateIndex >= 0) {
    showMessage(categoryMessage, "A category with that name already exists.", true);
    return;
  }

  const nextCategory = {
    name,
    label: categoryLabel.value.trim() || name,
    image_url: categoryImage.value.trim() || defaultCategories[0].image_url,
    subcategories: categorySubcategories.value
      .split(",")
      .map((sub) => sub.trim())
      .filter(Boolean),
  };

  if (editIndex >= 0) {
    // Keep fields the form doesn't edit, such as whether the category has a home-page tile.
    categories[editIndex] = { ...categories[editIndex], ...nextCategory };
    showMessage(categoryMessage, "Category updated.");
  } else {
    categories.push(nextCategory);
    showMessage(categoryMessage, "Category created.");
  }

  saveCategories(categories);
  resetCategoryForm();
  renderCategories();
}

function handleCategoryClick(event) {
  const button = event.target.closest("[data-category-action]");
  if (!button) return;

  const categories = readCategories();
  const index = Number(button.dataset.index);
  const category = categories[index];
  if (!category) return;

  if (button.dataset.categoryAction === "edit") {
    categoryEditIndex.value = index;
    categoryName.value = category.name || "";
    categoryLabel.value = category.label || "";
    categoryImage.value = category.image_url || "";
    categorySubcategories.value = (category.subcategories || []).join(", ");
    categorySubmit.textContent = "Update category";
    showMessage(categoryMessage, "Editing category.");
    return;
  }

  categories.splice(index, 1);
  saveCategories(categories);
  resetCategoryForm();
  renderCategories();
  showMessage(categoryMessage, "Category deleted.");
}

// ── Sales calendar (super admin) ──────────────────────────────────────────────────
// Events live on the server (/calendar). The server works out each event's sale window and adds the discounts to
// listings as they are read, so this tab only edits the calendar.

const calendarForm = document.getElementById("calendar-form");
const calendarEditId = document.getElementById("calendar-edit-id");
const calendarKind = document.getElementById("calendar-kind");
const calendarMonth = document.getElementById("calendar-month");
const calendarWeekday = document.getElementById("calendar-weekday");
const calendarSubmit = document.getElementById("calendar-submit");
const calendarMessage = document.getElementById("calendar-message-box");
const calendarSummary = document.getElementById("calendar-summary");
const calendarTableBody = document.getElementById("calendar-table-body");
const calendarField = (name) => document.getElementById(`calendar-${name}`);

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Monday first, matching Python's date.weekday() on the server.
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK_NAMES = { 1: "First", 2: "Second", 3: "Third", 4: "Fourth", "-1": "Last" };
const CALENDAR_PHASES = {
  live: ["Live now", "is-live"],
  early: ["Early deals", "is-early"],
  upcoming: ["Scheduled", ""],
  off: ["Turned off", "is-off"],
  past: ["Ended", "is-off"],
};
let calendarEvents = [];

calendarMonth.innerHTML = MONTH_NAMES.map((name, index) => `<option value="${index + 1}">${name}</option>`).join("");
calendarWeekday.innerHTML = WEEKDAY_NAMES.map((name, index) => `<option value="${index}">${name}</option>`).join("");

// "Oct 31, 2026" for a calendar date like "2026-10-31" (calendar days are UTC).
function calendarDate(isoDate, withYear = true) {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined,
    { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

function describeRule(rule) {
  if (rule.kind === "once") return `Once, ${calendarDate(rule.date)}`;
  const month = MONTH_NAMES[rule.month - 1];
  if (rule.kind === "yearly") return `Every ${month} ${rule.day}`;
  const offset = Number(rule.offset_days) || 0;
  const shift = offset ? ` ${offset > 0 ? "+" : "−"} ${Math.abs(offset)} ${Math.abs(offset) === 1 ? "day" : "days"}` : "";
  return `${WEEK_NAMES[rule.week]} ${WEEKDAY_NAMES[rule.weekday]} of ${month}${shift}`;
}

function renderCalendar(data) {
  calendarEvents = data.events || [];
  const { active, upcoming } = data;
  if (active) {
    calendarSummary.innerHTML = `<strong>${active.phase === "live" ? "Live now" : "Early deals running"}: ${escapeHtml(active.name)}</strong>
      · discounts up to ${active.max_discount}% until ${escapeHtml(calendarDate(active.closes))}. The home page banner and first slide show this event.`;
  } else {
    calendarSummary.innerHTML = upcoming
      ? `No sale running today. <strong>Next: ${escapeHtml(upcoming.name)}</strong> on ${escapeHtml(calendarDate(upcoming.date))}; early deals start ${escapeHtml(calendarDate(upcoming.opens))}.`
      : "No sale running today and none scheduled.";
  }
  calendarSummary.dataset.tone = active ? "live" : "";

  calendarTableBody.innerHTML = calendarEvents.map((event) => {
    const [label, tone] = CALENDAR_PHASES[event.phase] || CALENDAR_PHASES.upcoming;
    const dealsWindow = event.opens
      ? (event.opens === event.closes ? calendarDate(event.opens, false) : `${calendarDate(event.opens, false)} – ${calendarDate(event.closes, false)}`)
      : "—";
    return `
      <tr>
        <td><span class="calendar-swatch" style="background: ${escapeHtml(event.tone)}"></span><strong>${escapeHtml(event.name)}</strong></td>
        <td>${escapeHtml(describeRule(event.rule))}</td>
        <td>${escapeHtml(calendarDate(event.date))}</td>
        <td>${escapeHtml(dealsWindow)}</td>
        <td>${Number(event.max_discount)}%</td>
        <td><span class="calendar-phase ${tone}">${label}</span></td>
        <td class="table-actions">
          <button class="button button-secondary" type="button" data-calendar-action="edit" data-id="${escapeHtml(event.id)}">Edit</button>
          <button class="button button-secondary" type="button" data-calendar-action="toggle" data-id="${escapeHtml(event.id)}">${event.enabled === false ? "Turn on" : "Turn off"}</button>
          <button class="button danger-button" type="button" data-calendar-action="delete" data-id="${escapeHtml(event.id)}">Delete</button>
        </td>
      </tr>`;
  }).join("") || '<tr><td colspan="7">No events yet. Add one above.</td></tr>';
}

async function loadCalendar() {
  try {
    renderCalendar(await authApi("/calendar"));
  } catch (error) {
    showMessage(calendarMessage, error.message || "Could not load the sales calendar.", true);
  }
}

function syncCalendarKind() {
  calendarForm.querySelectorAll("[data-calendar-kinds]").forEach((field) => {
    field.hidden = !field.dataset.calendarKinds.split(" ").includes(calendarKind.value);
  });
}

function resetCalendarForm() {
  calendarForm.reset();
  calendarEditId.value = "";
  calendarSubmit.textContent = "Add event";
  syncCalendarKind();
}

function editCalendarEvent(event) {
  const rule = event.rule || {};
  calendarEditId.value = event.id;
  calendarField("name").value = event.name || "";
  calendarKind.value = rule.kind || "yearly";
  calendarMonth.value = String(rule.month || 1);
  calendarField("day").value = rule.day || 1;
  calendarField("week").value = String(rule.week || 1);
  calendarWeekday.value = String(rule.weekday ?? 0);
  calendarField("offset").value = rule.offset_days || 0;
  calendarField("date").value = rule.date || "";
  calendarField("lead").value = event.lead_days ?? 7;
  calendarField("duration").value = event.duration_days ?? 1;
  calendarField("max").value = event.max_discount ?? 45;
  calendarField("headline").value = event.headline || "";
  calendarField("message").value = event.message || "";
  calendarField("image").value = event.image_url || "";
  calendarField("tone").value = event.tone || "#fde2e1";
  calendarField("enabled").checked = event.enabled !== false;
  calendarSubmit.textContent = "Save event";
  syncCalendarKind();
  showMessage(calendarMessage, "");
  calendarForm.scrollIntoView({ behavior: "smooth" });
}

function readCalendarForm() {
  const kind = calendarKind.value;
  const month = Number(calendarMonth.value);
  const rule = kind === "once"
    ? { kind, date: calendarField("date").value }
    : kind === "yearly"
      ? { kind, month, day: Number(calendarField("day").value) }
      : { kind, month, week: Number(calendarField("week").value), weekday: Number(calendarWeekday.value), offset_days: Number(calendarField("offset").value) || 0 };
  return {
    name: calendarField("name").value.trim(),
    rule,
    lead_days: Number(calendarField("lead").value),
    duration_days: Number(calendarField("duration").value),
    max_discount: Number(calendarField("max").value),
    headline: calendarField("headline").value.trim(),
    message: calendarField("message").value.trim(),
    image_url: calendarField("image").value.trim(),
    tone: calendarField("tone").value,
    enabled: calendarField("enabled").checked,
  };
}

// Saving sends every field, so an event read back from the server can be re-sent as it is.
function eventBody(event) {
  const { name, rule, lead_days, duration_days, max_discount, headline, message, image_url, tone, enabled } = event;
  return { name, rule, lead_days, duration_days, max_discount, headline, message, image_url, tone, enabled };
}

async function saveCalendarEvent(event) {
  event.preventDefault();
  const editId = calendarEditId.value;
  try {
    const data = await authApi(editId ? `/calendar/${encodeURIComponent(editId)}` : "/calendar", {
      method: editId ? "PUT" : "POST",
      body: readCalendarForm(),
    });
    renderCalendar(data);
    resetCalendarForm();
    showMessage(calendarMessage, editId ? "Event saved." : "Event added.");
  } catch (error) {
    showMessage(calendarMessage, error.message || "Could not save the event.", true);
  }
}

async function handleCalendarTableClick(event) {
  const button = event.target.closest("[data-calendar-action]");
  if (!button) return;
  const calendarEvent = calendarEvents.find((item) => item.id === button.dataset.id);
  if (!calendarEvent) return;
  const action = button.dataset.calendarAction;
  if (action === "edit") {
    editCalendarEvent(calendarEvent);
    return;
  }
  if (action === "delete" && !confirm(`Delete ${calendarEvent.name} from the sales calendar?`)) return;
  try {
    const path = `/calendar/${encodeURIComponent(calendarEvent.id)}`;
    const data = action === "delete"
      ? await authApi(path, { method: "DELETE" })
      : await authApi(path, { method: "PUT", body: { ...eventBody(calendarEvent), enabled: calendarEvent.enabled === false } });
    renderCalendar(data);
    showMessage(calendarMessage, action === "delete" ? `${calendarEvent.name} deleted.` : `${calendarEvent.name} turned ${calendarEvent.enabled === false ? "on" : "off"}.`);
  } catch (error) {
    showMessage(calendarMessage, error.message || "Could not update the event.", true);
  }
}

calendarKind.addEventListener("change", syncCalendarKind);
calendarForm.addEventListener("submit", saveCalendarEvent);
document.getElementById("calendar-cancel").addEventListener("click", () => { resetCalendarForm(); showMessage(calendarMessage, ""); });
calendarTableBody.addEventListener("click", handleCalendarTableClick);
syncCalendarKind();

// ── Coupons (super admin) ──────────────────────────────────────────────────────────

const couponForm = document.getElementById("coupon-admin-form");
const couponEditCode = document.getElementById("coupon-edit-code");
const couponTypeInput = document.getElementById("coupon-type");
const couponSubmit = document.getElementById("coupon-submit");
const couponMessage = document.getElementById("coupon-message");
const couponTableBody = document.getElementById("coupon-table-body");
const couponField = (name) => document.getElementById(`coupon-${name}`);
let adminCoupons = [];

function describeCoupon(coupon) {
  return coupon.type === "percent" ? `${Number(coupon.value)}% off` : `${formatMoney(coupon.value)} off`;
}

function couponState(coupon) {
  const today = new Date().toISOString().slice(0, 10);
  if (!coupon.active) return ["Off", "is-off"];
  if (coupon.expires && coupon.expires < today) return ["Expired", "is-off"];
  if (coupon.max_uses && coupon.uses >= coupon.max_uses) return ["Used up", "is-off"];
  return ["Active", "is-live"];
}

function renderCoupons() {
  couponTableBody.innerHTML = adminCoupons.map((coupon) => {
    const [label, tone] = couponState(coupon);
    const rules = [
      Number(coupon.min_subtotal) > 0 && `Min ${formatMoney(coupon.min_subtotal)}`,
      coupon.once_per_customer && "Once per customer",
      coupon.expires && `Until ${coupon.expires}`,
    ].filter(Boolean).join(" · ") || "No limits";
    return `
      <tr>
        <td><strong>${escapeHtml(coupon.code)}</strong>${coupon.description ? `<br /><small>${escapeHtml(coupon.description)}</small>` : ""}</td>
        <td>${escapeHtml(describeCoupon(coupon))}</td>
        <td>${escapeHtml(rules)}</td>
        <td>${Number(coupon.uses || 0)}${coupon.max_uses ? ` / ${Number(coupon.max_uses)}` : ""}</td>
        <td><span class="calendar-phase ${tone}">${label}</span></td>
        <td class="table-actions">
          <button class="button button-secondary" type="button" data-coupon-action="edit" data-code="${escapeHtml(coupon.code)}">Edit</button>
          <button class="button button-secondary" type="button" data-coupon-action="toggle" data-code="${escapeHtml(coupon.code)}">${coupon.active ? "Turn off" : "Turn on"}</button>
          <button class="button danger-button" type="button" data-coupon-action="delete" data-code="${escapeHtml(coupon.code)}">Delete</button>
        </td>
      </tr>`;
  }).join("") || '<tr><td colspan="6">No coupons yet. Create one above.</td></tr>';
}

// ── Reward rates (super admin) ─────────────────────────────────────────────────

const rewardForm = document.getElementById("reward-rates-form");
const rewardMessage = document.getElementById("reward-message");
let rewardDefaults = null;

function fillRewardRates(rates) {
  document.getElementById("reward-spent").value = rates.points_per_dollar_spent;
  document.getElementById("reward-sold").value = rates.points_per_dollar_sold;
  document.getElementById("reward-affiliate").value = Math.round(rates.affiliate_rate * 1000) / 10;
  document.getElementById("reward-per-dollar").value = rates.points_per_dollar;
}

async function loadRewardRates() {
  try {
    const reply = await authApi("/rewards/settings");
    rewardDefaults = reply.defaults;
    fillRewardRates(reply.rates);
  } catch (error) {
    showMessage(rewardMessage, error.message || "Could not load reward rates.", true);
  }
}

rewardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    points_per_dollar_spent: Number(document.getElementById("reward-spent").value),
    points_per_dollar_sold: Number(document.getElementById("reward-sold").value),
    affiliate_rate: Number(document.getElementById("reward-affiliate").value) / 100,
    points_per_dollar: Number(document.getElementById("reward-per-dollar").value),
  };
  try {
    fillRewardRates((await authApi("/rewards/settings", { method: "PUT", body })).rates);
    showMessage(rewardMessage, "Reward rates saved. They apply to orders placed from now on.");
  } catch (error) {
    showMessage(rewardMessage, error.message || "Could not save reward rates.", true);
  }
});
document.getElementById("reward-defaults").addEventListener("click", () => {
  if (rewardDefaults) fillRewardRates(rewardDefaults);
  showMessage(rewardMessage, "Defaults filled in. Save to use them.");
});

async function loadCoupons() {
  try {
    adminCoupons = (await authApi("/coupons")).coupons || [];
    renderCoupons();
  } catch (error) {
    showMessage(couponMessage, error.message || "Could not load coupons.", true);
  }
}

function syncCouponType() {
  const percent = couponTypeInput.value === "percent";
  document.getElementById("coupon-value-label").textContent = percent ? "Percent off (1–90)" : "Amount off ($)";
  couponField("value").max = percent ? "90" : "1000";
}

function resetCouponForm() {
  couponForm.reset();
  couponEditCode.value = "";
  couponField("code").disabled = false;
  couponSubmit.textContent = "Create coupon";
  syncCouponType();
}

function couponBody(source) {
  return {
    code: source.code,
    type: source.type,
    value: Number(source.value),
    min_subtotal: Number(source.min_subtotal) || 0,
    max_uses: Number(source.max_uses) || 0,
    expires: source.expires || "",
    description: source.description || "",
    once_per_customer: Boolean(source.once_per_customer),
    active: source.active !== false,
  };
}

async function saveCoupon(event) {
  event.preventDefault();
  const editCode = couponEditCode.value;
  const body = couponBody({
    code: couponField("code").value.trim().toUpperCase(),
    type: couponTypeInput.value,
    value: couponField("value").value,
    min_subtotal: couponField("min").value,
    max_uses: couponField("max-uses").value,
    expires: couponField("expires").value,
    description: couponField("description").value.trim(),
    once_per_customer: couponField("once").checked,
    active: couponField("active").checked,
  });
  try {
    await authApi(editCode ? `/coupons/${encodeURIComponent(editCode)}` : "/coupons", { method: editCode ? "PUT" : "POST", body });
    resetCouponForm();
    showMessage(couponMessage, editCode ? `${editCode} saved.` : `${body.code} created.`);
    loadCoupons();
  } catch (error) {
    showMessage(couponMessage, error.message || "Could not save the coupon.", true);
  }
}

async function handleCouponTableClick(event) {
  const button = event.target.closest("[data-coupon-action]");
  if (!button) return;
  const coupon = adminCoupons.find((item) => item.code === button.dataset.code);
  if (!coupon) return;
  const action = button.dataset.couponAction;
  if (action === "edit") {
    couponEditCode.value = coupon.code;
    couponField("code").value = coupon.code;
    couponField("code").disabled = true;
    couponTypeInput.value = coupon.type;
    couponField("value").value = coupon.value;
    couponField("min").value = Number(coupon.min_subtotal) || "";
    couponField("max-uses").value = coupon.max_uses || 0;
    couponField("expires").value = coupon.expires || "";
    couponField("description").value = coupon.description || "";
    couponField("once").checked = Boolean(coupon.once_per_customer);
    couponField("active").checked = coupon.active !== false;
    couponSubmit.textContent = "Save coupon";
    syncCouponType();
    couponForm.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "delete" && !confirm(`Delete coupon ${coupon.code}? Shoppers won't be able to use it any more.`)) return;
  try {
    const path = `/coupons/${encodeURIComponent(coupon.code)}`;
    if (action === "delete") await authApi(path, { method: "DELETE" });
    else await authApi(path, { method: "PUT", body: couponBody({ ...coupon, active: !coupon.active }) });
    showMessage(couponMessage, action === "delete" ? `${coupon.code} deleted.` : `${coupon.code} turned ${coupon.active ? "off" : "on"}.`);
    loadCoupons();
  } catch (error) {
    showMessage(couponMessage, error.message || "Could not update the coupon.", true);
  }
}

couponTypeInput.addEventListener("change", syncCouponType);
couponForm.addEventListener("submit", saveCoupon);
document.getElementById("coupon-cancel").addEventListener("click", () => { resetCouponForm(); showMessage(couponMessage, ""); });
couponTableBody.addEventListener("click", handleCouponTableClick);
syncCouponType();

// ── Business accounts (super admin) ───────────────────────────────────────────────

const businessList = document.getElementById("business-list");
const businessFilter = document.getElementById("business-filter");
const businessMessage = document.getElementById("business-message");
const BUSINESS_STATUS_LABELS = { pending: ["Waiting for review", "is-early"], approved: ["Approved", "is-live"], rejected: ["Rejected", "is-off"] };
let businessApplications = [];

function renderBusinessApplications() {
  const pending = businessApplications.filter((app) => app.business.status === "pending").length;
  const badge = document.getElementById("business-pending-count");
  badge.textContent = pending;
  badge.hidden = !pending;
  const shown = businessApplications.filter((app) => !businessFilter.value || app.business.status === businessFilter.value);
  businessList.innerHTML = shown.map((app) => {
    const info = app.business;
    const [label, tone] = BUSINESS_STATUS_LABELS[info.status] || [info.status, ""];
    return `
      <article class="business-card" data-account="${escapeHtml(app.account)}">
        <header>
          <div>
            <h3>${escapeHtml(info.company)}</h3>
            <p>${escapeHtml(app.name)} · ${escapeHtml(app.email || app.account)}</p>
          </div>
          <span class="calendar-phase ${tone}">${label}${info.status === "approved" && info.tax_exempt ? " · tax-exempt" : ""}</span>
        </header>
        <dl class="business-facts">
          <div><dt>Tax ID</dt><dd>${escapeHtml(info.tax_id)}</dd></div>
          <div><dt>Country</dt><dd>${escapeHtml(info.country)}</dd></div>
          <div><dt>Address</dt><dd>${escapeHtml(info.address)}</dd></div>
          ${info.phone ? `<div><dt>Phone</dt><dd>${escapeHtml(info.phone)}</dd></div>` : ""}
          ${info.industry ? `<div><dt>Industry</dt><dd>${escapeHtml(info.industry)}</dd></div>` : ""}
          ${info.website ? `<div><dt>Website</dt><dd><a href="${escapeHtml(info.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(info.website)}</a></dd></div>` : ""}
          <div><dt>Applied</dt><dd>${escapeHtml(new Date(Number(info.applied_at) * 1000).toLocaleDateString())}${info.wants_tax_exempt ? " · asks for tax exemption" : ""}</dd></div>
          ${info.status === "approved" && info.net_terms ? `<div><dt>Net terms</dt><dd>Net 30 · limit ${formatMoney(info.credit_limit)}</dd></div>` : ""}
        </dl>
        <div class="business-review">
          ${info.certificate_key ? '<button type="button" class="button button-secondary" data-business-certificate>View certificate</button>' : (info.wants_tax_exempt ? '<span class="cj-hint">No certificate uploaded yet.</span>' : "")}
          <label class="checkbox-field"><input type="checkbox" data-business-exempt ${info.tax_exempt ? "checked" : ""} /> Tax-exempt (certificate checked)</label>
          <label class="checkbox-field"><input type="checkbox" data-business-terms ${info.net_terms ? "checked" : ""} /> Net 30 invoices</label>
          <label>Credit limit ($)<input type="number" data-business-limit min="0" max="250000" step="100" value="${escapeHtml(info.credit_limit ?? 5000)}" /></label>
          <input type="text" data-business-note maxlength="300" placeholder="Note for your records (optional)" value="${escapeHtml(info.note || "")}" aria-label="Review note" />
          <button type="button" class="button button-primary" data-business-action="approved">${info.status === "approved" ? "Save" : "Approve"}</button>
          ${info.status === "rejected" ? "" : '<button type="button" class="button danger-button" data-business-action="rejected">Reject</button>'}
        </div>
      </article>`;
  }).join("") || `<p class="my-empty">${{
    pending: "No applications waiting for review.", approved: "No approved business accounts yet.",
    rejected: "No rejected applications.", "": "No business account applications yet.",
  }[businessFilter.value]}</p>`;
}

async function loadBusinessApplications() {
  try {
    businessApplications = (await authApi("/business/applications")).applications || [];
    renderBusinessApplications();
  } catch (error) {
    showMessage(businessMessage, error.message || "Could not load business accounts.", true);
  }
}

async function reviewBusiness(event) {
  const certificate = event.target.closest("[data-business-certificate]");
  if (certificate) {
    // The link is signed and lasts a few minutes, so it's fetched on each click.
    const account = certificate.closest(".business-card").dataset.account;
    const opened = window.open("", "_blank");
    if (opened) opened.opener = null;
    try {
      const { url } = await authApi(`/business/applications/${encodeURIComponent(account)}/certificate`);
      if (opened) opened.location = url;
      else window.location.href = url;
    } catch (error) {
      opened?.close();
      showMessage(businessMessage, error.message || "Could not open the certificate.", true);
    }
    return;
  }
  const button = event.target.closest("[data-business-action]");
  if (!button) return;
  const card = button.closest(".business-card");
  const status = button.dataset.businessAction;
  const company = card.querySelector("h3").textContent;
  if (status === "rejected" && !confirm(`Reject ${company}? They'll go back to retail prices.`)) return;
  button.disabled = true;
  try {
    await authApi(`/business/applications/${encodeURIComponent(card.dataset.account)}`, {
      method: "PUT",
      body: {
        status, tax_exempt: card.querySelector("[data-business-exempt]").checked, note: card.querySelector("[data-business-note]").value,
        net_terms: card.querySelector("[data-business-terms]").checked, credit_limit: Number(card.querySelector("[data-business-limit]").value) || 0,
      },
    });
    showMessage(businessMessage, status === "approved" ? `${company} is approved.` : `${company} was rejected.`);
    loadBusinessApplications();
  } catch (error) {
    showMessage(businessMessage, error.message || "Could not save the review.", true);
    button.disabled = false;
  }
}

businessFilter.addEventListener("change", renderBusinessApplications);
businessList.addEventListener("click", reviewBusiness);

// ── Business quotes (super admin) ──────────────────────────────────────────────
// Quote requests from business carts (b2b_core): a unit price per line and how long the prices hold, or a decline.

const quoteAdminList = document.getElementById("quote-admin-list");
const quoteFilter = document.getElementById("quote-filter");
const quoteAdminMessage = document.getElementById("quote-admin-message");
const QUOTE_ADMIN_STATUS = {
  requested: ["Waiting for prices", "is-early"], quoted: ["Quoted", "is-live"], ordered: ["Ordered", "is-live"],
  declined: ["Declined", "is-off"], expired: ["Expired", "is-off"], withdrawn: ["Withdrawn", "is-off"],
};
let adminQuotes = [];

function renderAdminQuotes() {
  const waiting = adminQuotes.filter((quote) => quote.status === "requested").length;
  const badge = document.getElementById("quotes-open-count");
  badge.textContent = waiting;
  badge.hidden = !waiting;
  const shown = adminQuotes.filter((quote) => !quoteFilter.value || quote.status === quoteFilter.value);
  quoteAdminList.innerHTML = shown.map((quote) => {
    const [label, tone] = QUOTE_ADMIN_STATUS[quote.status] || [quote.status, ""];
    const editable = ["requested", "quoted"].includes(quote.status);
    const rows = quote.lines.map((line, index) => `
      <tr>
        <td>${escapeHtml(line.name)}${line.variant ? `<br /><small>${escapeHtml(line.variant)}</small>` : ""}</td>
        <td>${line.quantity}</td>
        <td>${formatMoney(line.list_price)}</td>
        <td>${editable
          ? `<input type="number" min="0.01" step="0.01" max="${escapeHtml(line.list_price)}" data-quote-price="${index}" value="${escapeHtml(line.price ?? line.list_price)}" aria-label="Unit price for ${escapeHtml(line.name)}" />`
          : line.price != null ? formatMoney(line.price) : "—"}</td>
      </tr>`).join("");
    return `
      <article class="business-card" data-quote="${escapeHtml(quote.id)}">
        <header>
          <div>
            <h3>${escapeHtml(quote.company || quote.email)} · ${escapeHtml(quote.id.slice(0, 6).toUpperCase())}</h3>
            <p>${escapeHtml(quote.email)} · ${escapeHtml(new Date(Number(quote.created_at) * 1000).toLocaleDateString())}${quote.shipping_country ? ` · ships to ${escapeHtml(quote.shipping_country)}` : ""}</p>
          </div>
          <span class="calendar-phase ${tone}">${escapeHtml(label)}</span>
        </header>
        ${quote.note ? `<p class="cj-hint">${escapeHtml(quote.note)}</p>` : ""}
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Item</th><th>Qty</th><th>List</th><th>Quoted unit price</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p>List total ${formatMoney(quote.list_total)}${quote.total != null ? ` · quoted ${formatMoney(quote.total)}` : ""}${quote.valid_until && quote.status === "quoted" ? ` · valid until ${escapeHtml(new Date(Number(quote.valid_until) * 1000).toLocaleDateString())}` : ""}${quote.order_id ? ` · order ${escapeHtml(quote.order_id.slice(0, 8))}` : ""}</p>
        ${editable ? `
        <div class="business-review">
          <label>Valid for (days)<input type="number" data-quote-days min="1" max="60" value="14" /></label>
          <input type="text" data-quote-note maxlength="1000" placeholder="Message to the buyer (optional)" value="${escapeHtml(quote.reply_note || "")}" aria-label="Message to the buyer" />
          <button type="button" class="button button-primary" data-quote-action="quoted">${quote.status === "quoted" ? "Update prices" : "Send prices"}</button>
          <button type="button" class="button danger-button" data-quote-action="declined">Decline</button>
        </div>` : ""}
      </article>`;
  }).join("") || `<p class="my-empty">${quoteFilter.value === "requested" ? "No quote requests waiting." : "No quotes here."}</p>`;
}

async function loadAdminQuotes() {
  try {
    adminQuotes = (await authApi("/business/quotes?all=1")).quotes || [];
    renderAdminQuotes();
  } catch (error) {
    showMessage(quoteAdminMessage, error.message || "Could not load quotes.", true);
  }
}

quoteFilter.addEventListener("change", renderAdminQuotes);
quoteAdminList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-quote-action]");
  if (!button) return;
  const card = button.closest("[data-quote]");
  const status = button.dataset.quoteAction;
  if (status === "declined" && !confirm("Decline this quote request? The buyer is told by email.")) return;
  const body = status === "declined"
    ? { status, reply_note: card.querySelector("[data-quote-note]").value }
    : {
      prices: [...card.querySelectorAll("[data-quote-price]")].map((input) => Number(input.value)),
      valid_days: Number(card.querySelector("[data-quote-days]").value) || 14,
      reply_note: card.querySelector("[data-quote-note]").value,
    };
  button.disabled = true;
  try {
    await authApi(`/business/quotes/${encodeURIComponent(card.dataset.quote)}`, { method: "PUT", body });
    showMessage(quoteAdminMessage, status === "declined" ? "Quote declined." : "Prices sent to the buyer.");
    loadAdminQuotes();
  } catch (error) {
    showMessage(quoteAdminMessage, error.message || "Could not save the quote.", true);
    button.disabled = false;
  }
});

// ── Dropshipping partners (super admin) ────────────────────────────────────────
// Stores reselling the catalog through the partner API (dropship_core.py): review, discount, tax exemption, wallet.

const partnerList = document.getElementById("partner-list");
const partnerFilter = document.getElementById("partner-filter");
const partnersMessage = document.getElementById("partners-message");
const PARTNER_STATUS_LABELS = {
  pending: ["Waiting for review", "is-early"], approved: ["Approved", "is-live"],
  suspended: ["Suspended", "is-off"], rejected: ["Rejected", "is-off"],
};
let dropshipPartners = [];
let partnerDefaultDiscount = 25;

function renderPartners() {
  const pending = dropshipPartners.filter((row) => row.partner.status === "pending").length;
  const badge = document.getElementById("partners-pending-count");
  badge.textContent = pending;
  badge.hidden = !pending;
  const shown = dropshipPartners.filter((row) => !partnerFilter.value || row.partner.status === partnerFilter.value);
  partnerList.innerHTML = shown.map((row) => {
    const info = row.partner;
    const [label, tone] = PARTNER_STATUS_LABELS[info.status] || [info.status, ""];
    const discount = info.discount_percent ?? "";
    return `
      <article class="business-card" data-account="${escapeHtml(row.account)}">
        <header>
          <div>
            <h3>${escapeHtml(info.company)}</h3>
            <p>${escapeHtml(row.name)} · ${escapeHtml(row.email || row.account)}</p>
          </div>
          <span class="calendar-phase ${tone}">${label}${info.tax_exempt ? " · tax-exempt" : ""}</span>
        </header>
        <dl class="business-facts">
          <div><dt>Website</dt><dd><a href="${escapeHtml(info.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(info.website)}</a></dd></div>
          <div><dt>Country</dt><dd>${escapeHtml(info.country)}</dd></div>
          ${info.platform ? `<div><dt>Platform</dt><dd>${escapeHtml(info.platform)}</dd></div>` : ""}
          ${info.monthly_orders ? `<div><dt>Orders a month</dt><dd>${escapeHtml(info.monthly_orders)}</dd></div>` : ""}
          <div><dt>Applied</dt><dd>${escapeHtml(new Date(Number(info.applied_at) * 1000).toLocaleDateString())}</dd></div>
          <div><dt>Wallet</dt><dd>${formatMoney(row.wallet_balance)}</dd></div>
          <div><dt>API orders</dt><dd>${row.orders}</dd></div>
          ${info.about ? `<div class="wide"><dt>About</dt><dd>${escapeHtml(info.about)}</dd></div>` : ""}
        </dl>
        <div class="business-review">
          <label class="partner-field">Discount %<input type="number" data-partner-discount min="0" max="60" step="0.5" value="${escapeHtml(discount)}" placeholder="${escapeHtml(partnerDefaultDiscount)} (default)" /></label>
          <label class="partner-field">Wallet credit ($)<input type="number" data-partner-credit step="0.01" placeholder="e.g. 50 or -10" /></label>
          <label class="checkbox-field"><input type="checkbox" data-partner-exempt ${info.tax_exempt ? "checked" : ""} /> Tax-exempt (resale certificate checked)</label>
          <input type="text" data-partner-note maxlength="300" placeholder="Note (shown to the partner if rejected or suspended)" value="${escapeHtml(info.note || "")}" aria-label="Review note" />
          <button type="button" class="button button-primary" data-partner-action="approved">${info.status === "approved" ? "Save" : "Approve"}</button>
          ${info.status === "approved" ? '<button type="button" class="button danger-button" data-partner-action="suspended">Suspend</button>' : ""}
          ${["pending", "suspended"].includes(info.status) ? '<button type="button" class="button danger-button" data-partner-action="rejected">Reject</button>' : ""}
        </div>
      </article>`;
  }).join("") || `<p class="my-empty">${{
    pending: "No partner applications waiting for review.", approved: "No approved partners yet.",
    suspended: "No suspended partners.", rejected: "No rejected applications.", "": "No partner applications yet.",
  }[partnerFilter.value]}</p>`;
}

async function loadPartners() {
  try {
    const data = await authApi("/dropship/partners");
    dropshipPartners = data.partners || [];
    partnerDefaultDiscount = data.settings.discount_percent;
    document.getElementById("partner-default-discount").value = partnerDefaultDiscount;
    renderPartners();
  } catch (error) {
    showMessage(partnersMessage, error.message || "Could not load dropshipping partners.", true);
  }
}

async function reviewPartner(event) {
  const button = event.target.closest("[data-partner-action]");
  if (!button) return;
  const card = button.closest(".business-card");
  const status = button.dataset.partnerAction;
  const company = card.querySelector("h3").textContent;
  if (status === "suspended" && !confirm(`Suspend ${company}? Their API keys stop working until you approve them again.`)) return;
  if (status === "rejected" && !confirm(`Reject ${company}?`)) return;
  const credit = card.querySelector("[data-partner-credit]").value;
  if (credit && !confirm(`${Number(credit) < 0 ? "Take" : "Add"} ${formatMoney(Math.abs(Number(credit)))} ${Number(credit) < 0 ? "from" : "to"} ${company}'s wallet?`)) return;
  button.disabled = true;
  try {
    await authApi(`/dropship/partners/${encodeURIComponent(card.dataset.account)}`, {
      method: "PUT",
      body: {
        status,
        discount_percent: card.querySelector("[data-partner-discount]").value,
        tax_exempt: card.querySelector("[data-partner-exempt]").checked,
        note: card.querySelector("[data-partner-note]").value,
        wallet_credit: credit,
      },
    });
    showMessage(partnersMessage, { approved: `${company} is approved.`, suspended: `${company} is suspended.`, rejected: `${company} was rejected.` }[status]);
    loadPartners();
  } catch (error) {
    showMessage(partnersMessage, error.message || "Could not save the review.", true);
    button.disabled = false;
  }
}

document.getElementById("partner-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { settings } = await authApi("/dropship/settings", {
      method: "PUT", body: { discount_percent: document.getElementById("partner-default-discount").value },
    });
    partnerDefaultDiscount = settings.discount_percent;
    showMessage(partnersMessage, `Partners without their own discount now pay ${settings.discount_percent}% below retail.`);
    renderPartners();
  } catch (error) {
    showMessage(partnersMessage, error.message || "Could not save the default discount.", true);
  }
});
partnerFilter.addEventListener("change", renderPartners);
partnerList.addEventListener("click", reviewPartner);

// ── Brands (directory and brand review) ──────────────────────────────────────
// GET /brands/admin lists every brand (hidden ones too); the super admin edits them, and staff approve or reject
// drafts held because a seller listed a protected brand it isn't authorized for (GET/POST /brands/review).

const BRAND_ADMIN_PAGE = 80;
const brandAdmin = {
  list: document.getElementById("brand-admin-list"),
  count: document.getElementById("brand-admin-count"),
  more: document.getElementById("brand-admin-more"),
  search: document.getElementById("brand-admin-search"),
  kind: document.getElementById("brand-admin-kind"),
  status: document.getElementById("brand-admin-status"),
  message: document.getElementById("brand-admin-message"),
  form: document.getElementById("brand-form"),
  review: document.getElementById("brand-review-list"),
  reviewCount: document.getElementById("brand-review-count"),
  brands: [],
  sectors: [],
  shown: BRAND_ADMIN_PAGE,
  canEdit: false,
  editing: null,
};
let directoryBrandNames = [];

function brandAdminLogo(brand) {
  const initials = brand.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const src = brand.logo_url || (brand.website ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(brand.website.split("/")[0])}&sz=64` : "");
  return `<span class="brand-logo"><span class="brand-monogram">${escapeHtml(initials || "?")}</span>${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}</span>`;
}

let brandAdminRequest = 0;
async function loadBrandAdmin() {
  const request = ++brandAdminRequest;
  const params = new URLSearchParams();
  if (brandAdmin.search.value.trim()) params.set("q", brandAdmin.search.value.trim());
  if (brandAdmin.kind.value) params.set("kind", brandAdmin.kind.value);
  if (brandAdmin.status.value) params.set("status", brandAdmin.status.value);
  try {
    const data = await authApi(`/brands/admin?${params}`);
    if (request !== brandAdminRequest) return;
    brandAdmin.brands = data.brands || [];
    brandAdmin.sectors = data.sectors || [];
    brandAdmin.canEdit = Boolean(data.can_edit);
    brandAdmin.shown = BRAND_ADMIN_PAGE;
    if (!params.toString()) directoryBrandNames = brandAdmin.brands.filter((b) => b.status === "active").map((b) => b.name);
    renderBrandAdmin();
    showBrandReviewCount(data.review_count);
  } catch (error) {
    showMessage(brandAdmin.message, error.message || "Could not load the brand directory.", true);
  }
}

function showBrandReviewCount(count) {
  brandAdmin.reviewCount.textContent = count || "";
  brandAdmin.reviewCount.hidden = !count;
}

function renderBrandAdmin() {
  const total = brandAdmin.brands.length;
  brandAdmin.count.textContent = `${total} ${total === 1 ? "brand" : "brands"}${brandAdmin.canEdit ? "" : " (only the super admin can change them)"}`;
  brandAdmin.list.innerHTML = brandAdmin.brands.slice(0, brandAdmin.shown).map((brand) => {
    const where = brand.worldwide ? "Worldwide" : `${brand.markets.length} ${brand.markets.length === 1 ? "country" : "countries"}`;
    const flags = [
      brand.kinds.map((k) => (k === "retailer" ? "Store" : "Brand")).join(" & "),
      brand.tier,
      brand.sectors.map((s) => s.label).join(", "),
      brand.origin && `from ${brand.origin}`,
      where,
      brand.listings && `${brand.listings} listings`,
    ].filter(Boolean).join(" · ");
    return `
      <div class="brand-admin-row${brand.status === "hidden" ? " brand-admin-hidden" : ""}">
        ${brandAdminLogo(brand)}
        <div class="brand-admin-main">
          <strong>${escapeHtml(brand.name)}</strong>
          <small>${escapeHtml(flags)}</small>
          <span class="brand-tags">
            ${brand.status === "hidden" ? '<span class="brand-tag">Hidden</span>' : ""}
            ${brand.protected ? `<span class="brand-tag brand-tag-protected">Protected${brand.authorized_sellers.length ? ` · ${brand.authorized_sellers.length} authorized` : ""}</span>` : ""}
            ${brand.featured ? '<span class="brand-tag brand-tag-count">Featured</span>' : ""}
            ${brand.edited ? '<span class="brand-tag">Changed</span>' : ""}
            ${brand.builtin ? "" : '<span class="brand-tag">Added by you</span>'}
          </span>
        </div>
        <a class="button button-secondary" href="brands.html?b=${encodeURIComponent(brand.slug)}" target="_blank" rel="noopener">View</a>
        ${brandAdmin.canEdit ? `<button type="button" class="button button-secondary" data-brand-edit="${escapeHtml(brand.slug)}">Edit</button>` : ""}
      </div>`;
  }).join("") || '<p class="cj-hint">No brands match.</p>';
  brandAdmin.more.hidden = brandAdmin.shown >= total;
}

function renderBrandSectorPicks(selected) {
  document.getElementById("brand-sectors").innerHTML = brandAdmin.sectors.map((s) => `
    <label><input type="checkbox" value="${escapeHtml(s.key)}" ${selected.includes(s.key) ? "checked" : ""} /> ${escapeHtml(s.label)}</label>`).join("");
}

function openBrandForm(brand) {
  brandAdmin.editing = brand;
  const value = (id, v) => { document.getElementById(id).value = v ?? ""; };
  document.getElementById("brand-form-title").textContent = brand ? `Edit ${brand.name}` : "Add a brand";
  value("brand-name", brand?.name);
  document.getElementById("brand-kind-brand").checked = !brand || brand.kinds.includes("brand");
  document.getElementById("brand-kind-retailer").checked = Boolean(brand?.kinds.includes("retailer"));
  value("brand-tier", brand?.tier || "mainstream");
  value("brand-status", brand?.status || "active");
  value("brand-origin", brand?.origin);
  value("brand-website", brand?.website);
  value("brand-markets", brand ? brand.markets.join(" ") : "*");
  value("brand-aliases", brand?.aliases.join(", "));
  value("brand-description", brand?.edited || !brand?.builtin ? brand?.description : "");
  value("brand-logo-url", brand?.logo_url);
  value("brand-sellers", brand?.authorized_sellers.join("\n"));
  document.getElementById("brand-featured").checked = Boolean(brand?.featured);
  document.getElementById("brand-protected").checked = Boolean(brand?.protected);
  renderBrandSectorPicks(brand ? brand.sectors.map((s) => s.key) : []);
  const remove = document.getElementById("brand-delete");
  remove.hidden = !brand || (brand.builtin && !brand.edited);
  remove.textContent = brand?.builtin ? "Reset to catalog" : "Delete";
  brandAdmin.form.hidden = false;
  brandAdmin.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function brandFormBody() {
  const text = (id) => document.getElementById(id).value.trim();
  return {
    name: text("brand-name"),
    kinds: ["brand", "retailer"].filter((k) => document.getElementById(`brand-kind-${k}`).checked),
    tier: text("brand-tier"),
    status: text("brand-status"),
    origin: text("brand-origin").toUpperCase(),
    website: text("brand-website"),
    markets: text("brand-markets") || "*",
    aliases: text("brand-aliases"),
    sectors: [...document.querySelectorAll("#brand-sectors input:checked")].map((input) => input.value),
    description: text("brand-description"),
    logo_url: text("brand-logo-url"),
    featured: document.getElementById("brand-featured").checked,
    protected: document.getElementById("brand-protected").checked,
    authorized_sellers: text("brand-sellers"),
  };
}

brandAdmin.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editing = brandAdmin.editing;
  try {
    const data = editing
      ? await authApi(`/brands/item/${encodeURIComponent(editing.slug)}`, { method: "PUT", body: brandFormBody() })
      : await authApi("/brands/item", { method: "POST", body: brandFormBody() });
    showMessage(brandAdmin.message, `${data.brand.name} saved.`);
    brandAdmin.form.hidden = true;
    loadBrandAdmin();
  } catch (error) {
    showMessage(brandAdmin.message, error.message || "Could not save the brand.", true);
  }
});

document.getElementById("brand-delete").addEventListener("click", async () => {
  const brand = brandAdmin.editing;
  if (!brand) return;
  const question = brand.builtin ? `Undo your changes to ${brand.name} and go back to the built-in version?` : `Delete ${brand.name} from the directory?`;
  if (!confirm(question)) return;
  try {
    await authApi(`/brands/item/${encodeURIComponent(brand.slug)}`, { method: "DELETE" });
    showMessage(brandAdmin.message, brand.builtin ? `${brand.name} is back to its catalog version.` : `${brand.name} deleted.`);
    brandAdmin.form.hidden = true;
    loadBrandAdmin();
  } catch (error) {
    showMessage(brandAdmin.message, error.message || "Could not delete the brand.", true);
  }
});

document.getElementById("brand-cancel").addEventListener("click", () => { brandAdmin.form.hidden = true; });
document.getElementById("brand-add").addEventListener("click", () => openBrandForm(null));
document.getElementById("brand-logo-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showMessage(brandAdmin.message, "Uploading logo…");
    document.getElementById("brand-logo-url").value = await uploadImage(file, file.name);
    showMessage(brandAdmin.message, "Logo uploaded. Save the brand to keep it.");
  } catch (error) {
    showMessage(brandAdmin.message, error.message || "Could not upload the logo.", true);
  }
  event.target.value = "";
});
brandAdmin.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-brand-edit]");
  if (button) openBrandForm(brandAdmin.brands.find((b) => b.slug === button.dataset.brandEdit));
});
brandAdmin.more.addEventListener("click", () => {
  brandAdmin.shown += BRAND_ADMIN_PAGE;
  renderBrandAdmin();
});
brandAdmin.search.addEventListener("input", debounceBrandAdmin);
brandAdmin.kind.addEventListener("change", loadBrandAdmin);
brandAdmin.status.addEventListener("change", loadBrandAdmin);

let brandAdminTimer = null;
function debounceBrandAdmin() {
  window.clearTimeout(brandAdminTimer);
  brandAdminTimer = window.setTimeout(loadBrandAdmin, 250);
}

async function loadBrandReview() {
  try {
    const data = await authApi("/brands/review");
    const listings = data.listings || [];
    showBrandReviewCount(listings.length);
    brandAdmin.review.innerHTML = listings.length ? listings.map((row) => `
      <div class="brand-review-row" data-review-id="${escapeHtml(row.id)}">
        <img src="${escapeHtml(row.image_url || "logo.svg")}" alt="" />
        <div class="brand-admin-main">
          <strong>${escapeHtml(row.name)}</strong>
          <small>${escapeHtml(row.brand_name)} · ${escapeHtml(row.seller_name || row.seller_email || "")} · $${Number(row.price || 0).toFixed(2)}</small>
        </div>
        <a class="button button-secondary" href="product.html?id=${encodeURIComponent(row.id)}" target="_blank" rel="noopener">Preview</a>
        <button type="button" class="button button-primary" data-review="approve">Approve</button>
        <button type="button" class="button button-secondary" data-review="authorize" title="Approve and let this seller list ${escapeHtml(row.brand_name)} from now on">Approve &amp; authorize seller</button>
        <button type="button" class="button danger-button" data-review="reject">Reject</button>
      </div>`).join("") : '<p class="cj-hint">Nothing waiting for review.</p>';
  } catch (error) {
    brandAdmin.review.innerHTML = `<p class="cj-hint">${escapeHtml(error.message || "Could not load the review queue.")}</p>`;
  }
}

brandAdmin.review.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-review]");
  if (!button) return;
  const row = button.closest("[data-review-id]");
  const choice = button.dataset.review;
  let note = "";
  if (choice === "reject") {
    note = prompt("Why isn't it approved? The seller sees this note on the draft.", "We couldn't confirm this item is genuine.");
    if (note === null) return;
  }
  try {
    await authApi(`/brands/review/${encodeURIComponent(row.dataset.reviewId)}`, {
      method: "POST",
      body: { action: choice === "reject" ? "reject" : "approve", authorize: choice === "authorize", note },
    });
    showMessage(brandAdmin.message, choice === "reject" ? "Listing rejected; it stays a draft." : "Listing approved and published.");
    loadBrandReview();
  } catch (error) {
    showMessage(brandAdmin.message, error.message || "Could not update the listing.", true);
  }
});

// ── Tabs ───────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`admin-${tab.dataset.adminSection}-section`).classList.add("active");
    });
  });
  // Links in emails (e.g. a quote request) open their section: admin.html#business.
  const linked = document.querySelector(`.admin-tab[data-admin-section="${CSS.escape(window.location.hash.slice(1))}"]:not([hidden])`);
  if (linked) window.setTimeout(() => linked.click(), 0);
}

// ── Image uploads ──────────────────────────────────────────────────────────────

const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
// Same OAuth client as Google sign-in in auth.js; its JavaScript origins must include this site.
const GOOGLE_CLIENT_ID = "238394195869-vqpjl5aj6vkjldvlfdrtacq60h4lc09f.apps.googleusercontent.com";
// Google Cloud API key with the Google Picker API enabled. Drive import stays off until it is set.
const GOOGLE_PICKER_API_KEY = "";
const GOOGLE_APP_ID = "238394195869";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const scriptLoads = {};
let driveToken = null;

function loadScript(src) {
  if (!scriptLoads[src]) {
    scriptLoads[src] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        delete scriptLoads[src];
        reject(new Error(`Could not load ${src}`));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoads[src];
}

// Category images are photos only; product galleries also take videos.
async function uploadImage(blob, filename, { allowVideo = false } = {}) {
  const isVideo = allowVideo && UPLOAD_VIDEO_TYPES.includes(blob.type);
  if (!isVideo && !UPLOAD_CONTENT_TYPES.includes(blob.type)) {
    throw new Error(allowVideo
      ? `${filename}: choose a JPEG, PNG, WebP or GIF photo, or an MP4, WebM or MOV video.`
      : "Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (blob.size > (isVideo ? UPLOAD_VIDEO_MAX_BYTES : UPLOAD_MAX_BYTES)) {
    throw new Error(isVideo ? `${filename}: videos must be 100 MB or smaller.` : "Images must be 10 MB or smaller.");
  }

  const signRes = await fetch(`${API_BASE_URL}/media/upload-url`, {
    method: "POST",
    headers: sessionHeaders(),
    body: JSON.stringify({ content_type: blob.type, filename }),
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!isApiSuccess(signRes)) throw new Error(sign.message || "Could not start the upload.");

  const body = new FormData();
  Object.entries(sign.fields || {}).forEach(([key, value]) => body.append(key, value));
  body.append("file", blob, filename);
  const uploadRes = await fetch(sign.url, { method: "POST", body });
  if (!uploadRes.ok) throw new Error("Upload failed. Please try again.");

  return new URL(sign.public_url, window.location.origin).href;
}

function getDriveToken() {
  if (driveToken && driveToken.expiresAt > Date.now()) return Promise.resolve(driveToken.value);
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (res) => {
        if (res.error) {
          reject(new Error("Google Drive access was not granted."));
          return;
        }
        driveToken = { value: res.access_token, expiresAt: Date.now() + (Number(res.expires_in) - 60) * 1000 };
        resolve(res.access_token);
      },
      error_callback: () => reject(new Error("Google Drive sign-in was closed.")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function pickDriveImage() {
  await Promise.all([
    loadScript("https://accounts.google.com/gsi/client"),
    loadScript("https://apis.google.com/js/api.js"),
  ]);
  await new Promise((resolve) => gapi.load("picker", resolve));
  const token = await getDriveToken();

  const doc = await new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
      .setMimeTypes(UPLOAD_CONTENT_TYPES.join(","));
    new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_PICKER_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) resolve(data.docs[0]);
        if (data.action === google.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
  if (!doc) return null;

  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) throw new Error("Could not download the image from Google Drive.");
  const data = await fileRes.blob();
  return { blob: new Blob([data], { type: doc.mimeType }), name: doc.name };
}

function initImagePickers() {
  document.querySelectorAll(".image-picker[data-image-target]").forEach((picker) => {
    const target = document.getElementById(picker.dataset.imageTarget);
    const fileInput = picker.querySelector("input[type='file']");
    const status = picker.querySelector(".image-picker-status");
    const buttons = picker.querySelectorAll("button");

    const setStatus = (text, isError = false) => {
      status.textContent = text;
      status.classList.toggle("is-error", isError);
    };

    const run = async (getImage) => {
      buttons.forEach((button) => { button.disabled = true; });
      try {
        const image = await getImage();
        if (!image) {
          setStatus("");
          return;
        }
        setStatus("Uploading…");
        target.value = await uploadImage(image.blob, image.name);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        setStatus("Image uploaded.");
      } catch (error) {
        setStatus(error.message || "Image upload failed.", true);
      } finally {
        buttons.forEach((button) => { button.disabled = false; });
      }
    };

    picker.querySelector("[data-image-source='device']").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      if (file) run(async () => ({ blob: file, name: file.name }));
    });

    picker.querySelector("[data-image-source='drive']").addEventListener("click", () => {
      if (!GOOGLE_PICKER_API_KEY) {
        setStatus("Google Drive import isn't set up yet: a Google Picker API key is required.", true);
        return;
      }
      run(pickDriveImage);
    });
  });
}

// ── Product photos and videos ─────────────────────────────────────────────────────
// A product keeps an ordered gallery in `media`; its first photo is also saved as image_url, the cover every other
// page shows. Older products only have image_url, which opens as a one-photo gallery.

const MAX_PRODUCT_MEDIA = 12;
const VIDEO_LINK_PATTERN = /\.(mp4|webm|mov)(?:[?#]|$)/i;
let productMedia = [];

function setProductMedia(product) {
  if (Array.isArray(product?.media) && product.media.length) {
    productMedia = product.media.map((item) => ({ type: item.type === "video" ? "video" : "image", url: item.url }));
  } else {
    productMedia = product?.image_url ? [{ type: "image", url: product.image_url }] : [];
  }
  renderProductMedia();
}

function renderProductMedia() {
  const cover = productMedia.find((item) => item.type === "image");
  productMediaList.innerHTML = productMedia.map((item, index) => {
    const preview = item.type === "video"
      ? `<video src="${escapeHtml(item.url)}" muted preload="metadata"></video><span class="media-tag">&#9654; Video</span>`
      : `<img src="${escapeHtml(item.url)}" alt="" loading="lazy" />${item === cover ? '<span class="media-tag">Cover</span>' : ""}`;
    return `
      <li class="media-item">
        ${preview}
        <div class="media-actions">
          <button type="button" data-media-move="-1" data-index="${index}" aria-label="Move earlier" ${index === 0 ? "disabled" : ""}>&#8592;</button>
          <button type="button" data-media-move="1" data-index="${index}" aria-label="Move later" ${index === productMedia.length - 1 ? "disabled" : ""}>&#8594;</button>
          <button type="button" data-media-remove data-index="${index}" aria-label="Remove">&times;</button>
        </div>
      </li>`;
  }).join("");
  productMediaList.hidden = !productMedia.length;

  const coverUrl = cover?.url || "";
  if (imageInput.value !== coverUrl) {
    imageInput.value = coverUrl;
    imageInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function handleProductMediaClick(event) {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.hasAttribute("data-media-remove")) {
    productMedia.splice(index, 1);
  } else {
    const to = index + Number(button.dataset.mediaMove);
    [productMedia[index], productMedia[to]] = [productMedia[to], productMedia[index]];
  }
  renderProductMedia();
}

function initProductMediaPicker() {
  const fileInput = productMediaPicker.querySelector("input[type='file']");
  const status = productMediaPicker.querySelector(".image-picker-status");
  const buttons = productMediaPicker.querySelectorAll("button");

  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  };

  // Uploads one file at a time so a failure names the file and keeps the ones already added.
  const addFiles = async (files) => {
    const room = MAX_PRODUCT_MEDIA - productMedia.length;
    if (room <= 0) {
      setStatus(`A product can have up to ${MAX_PRODUCT_MEDIA} photos and videos.`, true);
      return;
    }
    const queue = files.slice(0, room);
    const coverBefore = imageInput.value;
    buttons.forEach((button) => { button.disabled = true; });
    let error = null;
    try {
      for (const [index, file] of queue.entries()) {
        setStatus(queue.length > 1 ? `Uploading ${index + 1} of ${queue.length}…` : "Uploading…");
        const url = await uploadImage(file.blob, file.name, { allowVideo: true });
        productMedia.push({ type: file.blob.type.startsWith("video/") ? "video" : "image", url });
        renderProductMedia();
      }
    } catch (uploadError) {
      error = uploadError;
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
    if (error) {
      setStatus(error.message || "Upload failed.", true);
    } else if (files.length > queue.length) {
      setStatus(`Added ${queue.length}; a product can have up to ${MAX_PRODUCT_MEDIA} photos and videos.`, true);
    } else {
      setStatus(queue.length > 1 ? `${queue.length} files uploaded.` : "Uploaded.");
    }
    if (imageInput.value && imageInput.value !== coverBefore) fillFromPhoto({ overwrite: false });
  };

  productMediaPicker.querySelector("[data-media-source='device']").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const files = [...fileInput.files].map((file) => ({ blob: file, name: file.name }));
    fileInput.value = "";
    if (files.length) addFiles(files);
  });

  productMediaPicker.querySelector("[data-media-source='drive']").addEventListener("click", async () => {
    if (!GOOGLE_PICKER_API_KEY) {
      setStatus("Google Drive import isn't set up yet: a Google Picker API key is required.", true);
      return;
    }
    try {
      const image = await pickDriveImage();
      if (image) addFiles([image]);
    } catch (error) {
      setStatus(error.message || "Google Drive import failed.", true);
    }
  });

  const addLink = () => {
    const url = productMediaUrl.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setStatus("Links must start with https://", true);
      return;
    }
    if (productMedia.length >= MAX_PRODUCT_MEDIA) {
      setStatus(`A product can have up to ${MAX_PRODUCT_MEDIA} photos and videos.`, true);
      return;
    }
    const coverBefore = imageInput.value;
    productMedia.push({ type: VIDEO_LINK_PATTERN.test(url) ? "video" : "image", url });
    productMediaUrl.value = "";
    setStatus("");
    renderProductMedia();
    if (imageInput.value && imageInput.value !== coverBefore) fillFromPhoto({ overwrite: false });
  };
  productMediaPicker.querySelector("[data-media-source='link']").addEventListener("click", addLink);
  productMediaUrl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addLink();
    }
  });
  productMediaList.addEventListener("click", handleProductMediaClick);
  renderProductMedia();
}

// ── Init ───────────────────────────────────────────────────────────────────────

form.addEventListener("submit", submitProduct);
conditionInput.addEventListener("change", syncSellingFields);
offerEnabled.addEventListener("change", syncSellingFields);
form.querySelectorAll('input[name="product-format"]').forEach((input) => input.addEventListener("change", syncSellingFields));
syncSellingFields();
productCancel.addEventListener("click", cancelProductEdit);
currentProducts.addEventListener("click", handleProductActions);
productFilterSearch.addEventListener("input", () => { adminProductLimit = ADMIN_PRODUCT_PAGE_SIZE; renderProducts(readSession()); });
[productFilterStatus, productFilterCategory].forEach((select) => select.addEventListener("change", () => {
  adminProductLimit = ADMIN_PRODUCT_PAGE_SIZE;
  renderProducts(readSession());
}));
productShowMore.addEventListener("click", () => {
  adminProductLimit += ADMIN_PRODUCT_PAGE_SIZE;
  renderProducts(readSession());
});
nameInput.addEventListener("input", renderPreview);
descriptionInput.addEventListener("input", renderPreview);
priceInput.addEventListener("input", () => { syncDiscountFromPrices(); renderPreview(); });
comparePriceInput.addEventListener("input", syncDiscountFromPrices);
discountInput.addEventListener("change", applyDiscount);
[brandInput, comparePriceInput, saleEventInput].forEach((input) => input.addEventListener("input", renderPreview));
categoryInput.addEventListener("input", () => { updateSubcategoryOptions(); renderProductOptions(); renderPreview(); });
productOptionGroups.addEventListener("change", handleOptionChange);
productOptionGroups.addEventListener("click", handleOptionClick);
productOptionsPanel.addEventListener("click", handleMeasurementClick);
attributeForm.addEventListener("submit", saveAttribute);
attributeCancel.addEventListener("click", () => { resetAttributeForm(); showMessage(attributeMessage, ""); });
attributeTableBody.addEventListener("click", handleAttributeTableClick);
document.querySelectorAll("[data-open-section]").forEach((link) => link.addEventListener("click", () => {
  document.querySelector(`.admin-tab[data-admin-section="${link.dataset.openSection}"]`)?.click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}));
imageInput.addEventListener("input", () => { syncAiButton(); renderPreview(); });
aiFillButton.addEventListener("click", () => fillFromPhoto({ overwrite: true }));
orderForm.addEventListener("submit", saveOrder);
orderCancel.addEventListener("click", closeOrder);
orderTableBody.addEventListener("click", handleOrderTableClick);
orderFilterSearch.addEventListener("input", renderOrders);
[orderFilterPayment, orderFilterFulfillment].forEach((select) => select.addEventListener("change", renderOrders));
userForm.addEventListener("submit", saveUser);
userRole.addEventListener("change", syncUserCountriesField);
userCancel.addEventListener("click", resetUserForm);
userTableBody.addEventListener("click", handleUserTableClick);
categoryForm.addEventListener("submit", saveCategory);
categoryCancel.addEventListener("click", resetCategoryForm);
categoryList.addEventListener("click", handleCategoryClick);
initImagePickers();
initProductMediaPicker();

async function initAdminPage() {
  if (!requireUser()) return;
  // Pick up admin access granted or removed since this browser signed in.
  const session = await refreshCurrentUser();
  if (!session) {
    requireUser();
    return;
  }
  const isAdmin = isStaffRole(session.role);

  // Show/hide admin-only elements
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.hidden = !isAdmin;
  });

  // Update header for non-admin
  if (!isAdmin) {
    document.getElementById("admin-eyebrow").textContent = "Seller hub";
    document.getElementById("admin-title").textContent = `Welcome, ${session.name}`;
    document.getElementById("admin-subtitle").textContent = "Manage your product listings on Lyrshop.";
    document.querySelector("[data-admin-section='products']").textContent = "My Products";
  } else {
    document.getElementById("admin-eyebrow").textContent = session.role === "superadmin" ? "Super admin dashboard" : "Admin dashboard";
    document.getElementById("admin-title").textContent = "Manage Lyrshop";
    document.querySelectorAll(".superadmin-only").forEach((el) => {
      el.hidden = session.role !== "superadmin";
    });
    if (session.role !== "superadmin") {
      document.getElementById("users-intro").textContent =
        "Every Lyrshop account, newest first. Only the super admin can change admin accounts or grant admin access.";
    }
    document.getElementById("admin-subtitle").textContent = "Manage products, orders, users, and categories.";
  }

  initTabs();
  loadAttributes();
  loadWarehouseOptions();
  if (isAdmin) {
    loadBrandAdmin().then(() => renderBrandOptions(adminProducts || []));
    loadBrandReview();
  }
  if (session.role === "superadmin") {
    loadCalendar();
    loadCoupons();
    loadRewardRates();
    loadBusinessApplications();
    loadAdminQuotes();
    loadPartners();
    loadLyrtripSettings();
    document.getElementById("attributes-intro").textContent =
      "Colors, sizes and other options buyers choose from. As super admin you can edit or delete every attribute.";
  }
  renderPreview();
  renderCategoryOptions();
  updateSubcategoryOptions();
  loadCurrentProducts(session);

  if (isAdmin) {
    syncUserCountriesField();
    initCjPanel();
    loadOrders();
    loadUsers();
    renderCategories();
  }
}

countryInput.innerHTML = LyrLocale.countryOptions()
  .map(({ code, name }) => `<option value="${code}">${escapeHtml(name)}</option>`).join("");
resetItemLocation();

initAdminPage();
