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
const countryInput = document.getElementById("product-country");
const cityInput = document.getElementById("product-city");
const regionalPricingInput = document.getElementById("product-regional-pricing");
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

function canEditProduct(product, session) {
  return isStaffRole(session.role) || (product.seller_email && product.seller_email.toLowerCase() === String(session.email || "").toLowerCase());
}

const ADMIN_PRODUCT_PAGE_SIZE = 48;
let adminProducts = [];
let adminProductLimit = ADMIN_PRODUCT_PAGE_SIZE;

function getVisibleAdminProducts() {
  const query = productFilterSearch.value.trim().toLowerCase();
  const status = productFilterStatus.value;
  const category = productFilterCategory.value;
  return adminProducts.filter((product) => {
    if (status && (product.status || "published") !== status) return false;
    if (category && product.category !== category) return false;
    if (!query) return true;
    return [product.name, product.brand, product.subcategory, product.description]
      .some((field) => String(field || "").toLowerCase().includes(query));
  });
}

function renderProducts(session) {
  currentProducts.innerHTML = "";
  const draftCount = adminProducts.filter((product) => product.status === "draft").length;
  const visible = getVisibleAdminProducts();
  productFilterCount.textContent = `${visible.length} of ${adminProducts.length} listings · ${draftCount} drafts`;

  if (!visible.length) {
    currentProducts.innerHTML = adminProducts.length
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
    const res = await fetch(url);
    const json = await res.json();
    adminProducts = json.products || [];
    renderProductFilterCategories();
    renderProducts(session);
    renderBrandOptions(adminProducts);
  } catch {
    currentProducts.innerHTML = "<p>Unable to load products. Make sure the backend is running.</p>";
  }
}

function renderBrandOptions(products) {
  const brands = [...new Set(products.map((product) => (product.brand || "").trim()).filter(Boolean))].sort();
  brandOptions.innerHTML = brands.map((brand) => `<option value="${escapeHtml(brand)}"></option>`).join("");
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
  resetAiAssist();
  renderPreview();
  showMessage(message, "");
}

async function submitProduct(event) {
  event.preventDefault();
  const session = readSession();
  if (!session) return;

  const editId = productEditId.value;
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
    regional_pricing: regionalPricingInput.checked,
    options: collectProductOptions(),
    measurements: collectMeasurements(),
    seller_email: session.email,
    seller_name: session.name,
  };

  try {
    const url = editId ? `${API_BASE_URL}/products/${editId}` : `${API_BASE_URL}/products`;
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    if (isApiSuccess(res)) {
      cancelProductEdit();
      showMessage(message, editId ? "Product updated." : "Product listed successfully.");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_email: session.email }),
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

  if (button.dataset.productAction === "edit") {
    const product = adminProducts.find((p) => p.id === productId);
    if (product) startEditProduct(product);
  }
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
  showMessage(userMessage, "");
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
        <td><span class="status-badge role-${escapeHtml(user.role)}">${escapeHtml(ROLE_LABELS[user.role] || user.role)}</span></td>
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
  if (isSuperAdmin() && editing?.role !== "superadmin") body.role = userRole.value;
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
        <td>${escapeHtml(order.user_email || "Guest")}</td>
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
        </dl>
        <div class="business-review">
          <label class="checkbox-field"><input type="checkbox" data-business-exempt ${info.tax_exempt ? "checked" : ""} /> Tax-exempt (certificate checked)</label>
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
      body: { status, tax_exempt: card.querySelector("[data-business-exempt]").checked, note: card.querySelector("[data-business-note]").value },
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
}

// ── Image uploads ──────────────────────────────────────────────────────────────

const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
// Same OAuth client as Google sign-in in auth.js; its JavaScript origins must include this site.
const GOOGLE_CLIENT_ID = "238394195869-ohu6m0qm43k069a3r2sb3mak0r4g9obs.apps.googleusercontent.com";
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
    headers: { "Content-Type": "application/json" },
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
  if (session.role === "superadmin") {
    loadCalendar();
    loadCoupons();
    loadBusinessApplications();
    document.getElementById("attributes-intro").textContent =
      "Colors, sizes and other options buyers choose from. As super admin you can edit or delete every attribute.";
  }
  renderPreview();
  renderCategoryOptions();
  updateSubcategoryOptions();
  loadCurrentProducts(session);

  if (isAdmin) {
    loadOrders();
    loadUsers();
    renderCategories();
  }
}

countryInput.innerHTML = LyrLocale.countryOptions()
  .map(({ code, name }) => `<option value="${code}">${escapeHtml(name)}</option>`).join("");
resetItemLocation();

initAdminPage();
