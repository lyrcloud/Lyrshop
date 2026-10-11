const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://localhost:5000"
  : "";
const USERS_KEY = "lyrshopUsers";
const SESSION_KEY = "lyrshopSession";
const CATEGORIES_KEY = "lyrshopCategories";

const defaultCategories = [
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

const form = document.getElementById("product-form");
const message = document.getElementById("message");
const previewCard = document.getElementById("product-preview");
const currentProducts = document.getElementById("current-products");
const nameInput = document.getElementById("product-name");
const descriptionInput = document.getElementById("product-description");
const priceInput = document.getElementById("product-price");
const categoryInput = document.getElementById("product-category");
const subcategoryInput = document.getElementById("product-subcategory");
const imageInput = document.getElementById("product-image");
const productEditId = document.getElementById("product-edit-id");
const productSubmit = document.getElementById("product-submit");
const productCancel = document.getElementById("product-cancel");
const productCount = document.getElementById("admin-product-count");
const userCount = document.getElementById("admin-user-count");
const categoryCount = document.getElementById("admin-category-count");

const userForm = document.getElementById("user-form");
const userEditIndex = document.getElementById("user-edit-index");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userPassword = document.getElementById("user-password");
const userProvider = document.getElementById("user-provider");
const userSubmit = document.getElementById("user-submit");
const userCancel = document.getElementById("user-cancel");
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

function getRoleForEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
}

function withResolvedUserRole(user) {
  return { ...user, role: getRoleForEmail(user.email) };
}

function readUsers() {
  return readJson(USERS_KEY, []).map(withResolvedUserRole);
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users.map(withResolvedUserRole)));
}

function readSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  return session ? withResolvedUserRole(session) : null;
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(withResolvedUserRole(user)));
}

function requireUser() {
  const session = readSession();
  if (!session) {
    window.location.href = "auth.html";
    return null;
  }
  saveSession(session);
  return session;
}

function readCategories() {
  if (!localStorage.getItem(CATEGORIES_KEY)) return defaultCategories;
  return readJson(CATEGORIES_KEY, []).map(normalizeCategory);
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.map(normalizeCategory)));
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

function updateStats(productTotal = null) {
  if (productTotal !== null) productCount.textContent = productTotal;
  if (userCount) userCount.textContent = readUsers().length;
  categoryCount.textContent = readCategories().length;
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
    price: parseFloat(priceInput.value) || 0.0,
    category: categoryInput.value || "Demo",
    image_url: imageInput.value || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
  };

  previewCard.innerHTML = `
    <div class="card">
      <img class="product-image" src="${escapeHtml(preview.image_url)}" alt="${escapeHtml(preview.name)}" />
      <div class="card-body">
        <div>
          <h3>${escapeHtml(preview.name)}</h3>
          <p>${escapeHtml(preview.description)}</p>
        </div>
      </div>
      <div class="card-footer">
        <span class="meta-pill">${escapeHtml(preview.category)}</span>
        <span class="price">$${preview.price.toFixed(2)}</span>
      </div>
    </div>
  `;
}

function canEditProduct(product, session) {
  return session.role === "admin" || (product.seller_email && product.seller_email.toLowerCase() === session.email.toLowerCase());
}

function renderProducts(products, session) {
  currentProducts.innerHTML = "";
  updateStats(products.length);

  if (!products.length) {
    currentProducts.innerHTML = "<p>No products yet. Use the form above to add your first listing.</p>";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    const imageUrl = product.image_url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80";
    const editable = canEditProduct(product, session);
    card.className = "card";
    card.innerHTML = `
      <img class="product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" />
      <div class="card-body">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "No description.")}</p>
          ${product.seller_name ? `<small>by ${escapeHtml(product.seller_name)}</small>` : ""}
        </div>
      </div>
      <div class="card-footer">
        <span class="meta-pill">${escapeHtml(product.category || "")}</span>
        <span class="price">$${Number(product.price).toFixed(2)}</span>
      </div>
      ${editable ? `
      <div class="table-actions" style="padding:0.5rem 1rem 1rem">
        <button class="button button-secondary" type="button" data-product-action="edit" data-product-id="${escapeHtml(product.id)}">Edit</button>
        <button class="button danger-button" type="button" data-product-action="delete" data-product-id="${escapeHtml(product.id)}">Delete</button>
      </div>` : ""}
    `;
    currentProducts.appendChild(card);
  });
}

async function loadCurrentProducts(session) {
  const url = session.role === "admin"
    ? `${API_BASE_URL}/products`
    : `${API_BASE_URL}/products?seller=${encodeURIComponent(session.email)}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    renderProducts(json.products || [], session);
  } catch {
    currentProducts.innerHTML = "<p>Unable to load products. Make sure the backend is running.</p>";
    updateStats(0);
  }
}

function startEditProduct(product) {
  productEditId.value = product.id;
  nameInput.value = product.name || "";
  descriptionInput.value = product.description || "";
  priceInput.value = product.price || "";
  categoryInput.value = product.category || "";
  updateSubcategoryOptions();
  subcategoryInput.value = product.subcategory || "";
  imageInput.value = product.image_url || "";
  productSubmit.textContent = "Update product";
  productCancel.hidden = false;
  document.getElementById("product-form-title").textContent = "Edit product";
  renderPreview();
  form.scrollIntoView({ behavior: "smooth" });
}

function cancelProductEdit() {
  form.reset();
  productEditId.value = "";
  productSubmit.textContent = "List Product";
  productCancel.hidden = true;
  document.getElementById("product-form-title").textContent = "List a new product";
  renderPreview();
  showMessage(message, "");
}

async function submitProduct(event) {
  event.preventDefault();
  const session = readSession();
  if (!session) return;

  const editId = productEditId.value;
  const product = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    price: parseFloat(priceInput.value),
    category: categoryInput.value.trim(),
    subcategory: subcategoryInput.value.trim(),
    image_url: imageInput.value.trim(),
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
      showMessage(message, editId ? "Product updated." : "Product listed successfully.");
      cancelProductEdit();
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
    // find the product data from the rendered cards — re-fetch to get full data
    fetch(`${API_BASE_URL}/products`)
      .then((r) => r.json())
      .then((json) => {
        const product = (json.products || []).find((p) => p.id === productId);
        if (product) startEditProduct(product);
      })
      .catch(() => showMessage(message, "Unable to load product for editing.", true));
  }
}

// ── User management ────────────────────────────────────────────────────────────

function resetUserForm() {
  userForm.reset();
  userEditIndex.value = "";
  userSubmit.textContent = "Create user";
  showMessage(userMessage, "");
}

function renderUsers() {
  const users = readUsers();
  updateStats();

  if (!users.length) {
    userTableBody.innerHTML = `<tr><td colspan="5">No users yet. Create one here or sign up from the auth page.</td></tr>`;
    return;
  }

  userTableBody.innerHTML = users
    .map((user, index) => `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email || user.phone)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>${escapeHtml(user.provider || "Email")}</td>
        <td>
          <div class="table-actions">
            <button class="button button-secondary" type="button" data-user-action="edit" data-index="${index}">Edit</button>
            <button class="button danger-button" type="button" data-user-action="delete" data-index="${index}">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function saveUser(event) {
  event.preventDefault();
  const users = readUsers();
  const editIndex = userEditIndex.value === "" ? -1 : Number(userEditIndex.value);
  const email = userEmail.value.trim().toLowerCase();
  const duplicateIndex = users.findIndex((user, index) => String(user.email || "").toLowerCase() === email && index !== editIndex);

  if (duplicateIndex >= 0) {
    showMessage(userMessage, "A user with that email already exists.", true);
    return;
  }

  const nextUser = {
    name: userName.value.trim() || email.split("@")[0],
    email,
    password: userPassword.value,
    provider: userProvider.value,
    role: getRoleForEmail(email),
  };

  if (editIndex >= 0) {
    const previousEmail = users[editIndex]?.email;
    users[editIndex] = nextUser;
    const session = readSession();
    if (session?.email?.toLowerCase() === previousEmail?.toLowerCase()) {
      saveSession({ name: nextUser.name, email: nextUser.email, provider: nextUser.provider });
    }
    showMessage(userMessage, "User updated.");
  } else {
    users.push(nextUser);
    showMessage(userMessage, "User created.");
  }

  saveUsers(users);
  resetUserForm();
  renderUsers();
}

function handleUserTableClick(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const users = readUsers();
  const index = Number(button.dataset.index);
  const user = users[index];
  if (!user) return;

  if (button.dataset.userAction === "edit") {
    userEditIndex.value = index;
    userName.value = user.name || "";
    userEmail.value = user.email || "";
    userPassword.value = user.password || "";
    userProvider.value = user.provider || "Email";
    userSubmit.textContent = "Update user";
    showMessage(userMessage, "Editing user.");
    return;
  }

  users.splice(index, 1);
  saveUsers(users);
  const session = readSession();
  if (session && getAccountId(session) === getAccountId(user)) {
    localStorage.removeItem(SESSION_KEY);
  }
  resetUserForm();
  renderUsers();
  showMessage(userMessage, "User deleted.");
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
  updateStats();

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
    categories[editIndex] = nextCategory;
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
nameInput.addEventListener("input", renderPreview);
descriptionInput.addEventListener("input", renderPreview);
priceInput.addEventListener("input", renderPreview);
categoryInput.addEventListener("input", () => { updateSubcategoryOptions(); renderPreview(); });
imageInput.addEventListener("input", renderPreview);
userForm.addEventListener("submit", saveUser);
userCancel.addEventListener("click", resetUserForm);
userTableBody.addEventListener("click", handleUserTableClick);
categoryForm.addEventListener("submit", saveCategory);
categoryCancel.addEventListener("click", resetCategoryForm);
categoryList.addEventListener("click", handleCategoryClick);
initImagePickers();

const session = requireUser();
if (session) {
  const isAdmin = session.role === "admin";

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
    document.getElementById("admin-eyebrow").textContent = "Admin dashboard";
    document.getElementById("admin-title").textContent = "Manage Lyrshop";
    document.getElementById("admin-subtitle").textContent = "Manage products, users, and categories.";
  }

  initTabs();
  renderPreview();
  renderCategoryOptions();
  updateSubcategoryOptions();
  loadCurrentProducts(session);

  if (isAdmin) {
    renderUsers();
    renderCategories();
  }
}
