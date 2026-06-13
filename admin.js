const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://localhost:5000"
  : "";
const USERS_KEY = "lyrshopUsers";
const SESSION_KEY = "lyrshopSession";
const CATEGORIES_KEY = "lyrshopCategories";
const ADMIN_EMAIL = "lyrclouds@gmail.com";

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
const imageInput = document.getElementById("product-image");
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  return {
    ...user,
    role: getRoleForEmail(user.email),
  };
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

function requireAdmin() {
  const session = readSession();
  if (!session || session.role !== "admin") {
    window.location.href = "auth.html";
    return false;
  }
  saveSession(session);
  return true;
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
  userCount.textContent = readUsers().length;
  categoryCount.textContent = readCategories().length;
}

function renderCategoryOptions() {
  categoryOptions.innerHTML = readCategories()
    .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.label)}</option>`)
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

function renderProducts(products) {
  currentProducts.innerHTML = "";
  updateStats(products.length);

  if (!products.length) {
    currentProducts.innerHTML = "<p>No products available yet.</p>";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    const imageUrl = product.image_url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80";
    card.className = "card";
    card.innerHTML = `
      <img class="product-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" />
      <div class="card-body">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || "No description.")}</p>
        </div>
      </div>
      <div class="card-footer">
        <span class="meta-pill">${escapeHtml(product.category || "Demo")}</span>
        <span class="price">$${Number(product.price).toFixed(2)}</span>
      </div>
    `;
    currentProducts.appendChild(card);
  });
}

async function loadCurrentProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const json = await response.json();
    renderProducts(json.products || []);
  } catch (error) {
    currentProducts.innerHTML = "<p>Unable to load current products from the local backend.</p>";
    updateStats(0);
  }
}

async function submitProduct(event) {
  event.preventDefault();

  const product = {
    name: nameInput.value,
    description: descriptionInput.value,
    price: parseFloat(priceInput.value),
    category: categoryInput.value,
    image_url: imageInput.value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    if (response.ok) {
      showMessage(message, "Product created successfully.");
      form.reset();
      renderPreview();
      loadCurrentProducts();
      return;
    }

    const error = await response.json();
    showMessage(message, `Error: ${error.message || "Unable to create product."}`, true);
  } catch (error) {
    showMessage(message, "Unable to create product because the local backend is not running.", true);
  }
}

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
        <td>${escapeHtml(user.email)}</td>
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
  const duplicateIndex = users.findIndex((user, index) => user.email.toLowerCase() === email && index !== editIndex);

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
    if (session && session.email && previousEmail && session.email.toLowerCase() === previousEmail.toLowerCase()) {
      saveSession({
        name: nextUser.name,
        email: nextUser.email,
        provider: nextUser.provider,
      });
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
  if (session && session.email && session.email.toLowerCase() === user.email.toLowerCase()) {
    localStorage.removeItem(SESSION_KEY);
  }
  resetUserForm();
  renderUsers();
  showMessage(userMessage, "User deleted.");
}

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
  const duplicateIndex = categories.findIndex((category, index) => category.name.toLowerCase() === name.toLowerCase() && index !== editIndex);

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
      .map((subcategory) => subcategory.trim())
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

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach((section) => section.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`admin-${tab.dataset.adminSection}-section`).classList.add("active");
    });
  });
}

form.addEventListener("submit", submitProduct);
nameInput.addEventListener("input", renderPreview);
descriptionInput.addEventListener("input", renderPreview);
priceInput.addEventListener("input", renderPreview);
categoryInput.addEventListener("input", renderPreview);
imageInput.addEventListener("input", renderPreview);
userForm.addEventListener("submit", saveUser);
userCancel.addEventListener("click", resetUserForm);
userTableBody.addEventListener("click", handleUserTableClick);
categoryForm.addEventListener("submit", saveCategory);
categoryCancel.addEventListener("click", resetCategoryForm);
categoryList.addEventListener("click", handleCategoryClick);

if (requireAdmin()) {
  initTabs();
  renderPreview();
  renderUsers();
  renderCategories();
  loadCurrentProducts();
}
