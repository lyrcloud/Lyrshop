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
const saleEventInput = document.getElementById("product-sale-event");
const statusInput = document.getElementById("product-status");
const productFilterSearch = document.getElementById("product-filter-search");
const productFilterStatus = document.getElementById("product-filter-status");
const productFilterCategory = document.getElementById("product-filter-category");
const productFilterCount = document.getElementById("product-filter-count");
const productShowMore = document.getElementById("product-show-more");
const categoryInput = document.getElementById("product-category");
const subcategoryInput = document.getElementById("product-subcategory");
const imageInput = document.getElementById("product-image");
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
  // Opening a draft defaults to publishing it; the photo check in submitProduct still applies.
  statusInput.value = "published";
  categoryInput.value = product.category || "";
  updateSubcategoryOptions();
  subcategoryInput.value = product.subcategory || "";
  imageInput.value = product.image_url || "";
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

function cancelProductEdit() {
  form.reset();
  productEditId.value = "";
  productSubmit.textContent = "List Product";
  productCancel.hidden = true;
  document.getElementById("product-form-title").textContent = "List a new product";
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
      · Tax ${formatMoney(order.tax_total)} · <strong>Total ${formatMoney(order.total)}</strong>
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
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
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

async function uploadImage(blob, filename) {
  if (!UPLOAD_CONTENT_TYPES.includes(blob.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (blob.size > UPLOAD_MAX_BYTES) {
    throw new Error("Images must be 10 MB or smaller.");
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
  document.querySelectorAll(".image-picker").forEach((picker) => {
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
        if (target === imageInput) fillFromPhoto({ overwrite: false });
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
priceInput.addEventListener("input", renderPreview);
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

initAdminPage();
