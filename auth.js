const AUTH_USERS_KEY = "lyrshopUsers";
const AUTH_SESSION_KEY = "lyrshopSession";
const AUTH_ORDERS_KEY = "lyrshopOrders";
const ADMIN_EMAIL = "lyrclouds@gmail.com";

function getRoleForEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
}

function withResolvedRole(user) {
  return {
    ...user,
    role: getRoleForEmail(user.email),
  };
}

function getUsers() {
  return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]").map(withResolvedRole);
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users.map(withResolvedRole)));
}

function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
  return user ? withResolvedRole(user) : null;
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(withResolvedRole(user)));
}

function clearCurrentUser() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function getAuthReturnTo() {
  const returnTo = localStorage.getItem("lyrshopAuthReturnTo");
  localStorage.removeItem("lyrshopAuthReturnTo");
  return returnTo || "dashboard.html";
}

function getOrdersForUser(email) {
  const orders = JSON.parse(localStorage.getItem(AUTH_ORDERS_KEY) || "[]");
  return orders.filter((order) => order.userEmail === email);
}

function saveOrderForCurrentUser(order) {
  const user = getCurrentUser();
  if (!user) return;

  const orders = JSON.parse(localStorage.getItem(AUTH_ORDERS_KEY) || "[]");
  orders.unshift({
    ...order,
    id: order.id || `local-${Date.now()}`,
    userEmail: user.email,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(AUTH_ORDERS_KEY, JSON.stringify(orders));
}

function upsertUser(user) {
  const users = getUsers();
  const index = users.findIndex((storedUser) => storedUser.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    users[index] = { ...users[index], ...user };
  } else {
    users.push(user);
  }
  saveUsers(users);
      setCurrentUser({
        name: user.name,
        email: user.email,
        provider: user.provider,
        role: getRoleForEmail(user.email),
      });
}

function initAuthPage() {
  const form = document.getElementById("auth-form");
  if (!form) return;

  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const nameField = document.getElementById("name-field");
  const nameInput = document.getElementById("auth-name");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const submitButton = document.getElementById("auth-submit");
  const googleButton = document.getElementById("google-auth");
  const message = document.getElementById("auth-message");
  let mode = "login";

  function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === "signup";
    loginTab.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);
    loginTab.setAttribute("aria-selected", String(!isSignup));
    signupTab.setAttribute("aria-selected", String(isSignup));
    nameField.classList.toggle("hidden", !isSignup);
    nameInput.required = isSignup;
    submitButton.textContent = isSignup ? "Create account" : "Login";
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    message.textContent = "";
  }

  loginTab.addEventListener("click", () => setMode("login"));
  signupTab.addEventListener("click", () => setMode("signup"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const users = getUsers();
    const existingUser = users.find((user) => user.email.toLowerCase() === email);

    if (mode === "signup") {
      if (existingUser) {
        message.textContent = "An account already exists for that email.";
        return;
      }
      upsertUser({
        name: nameInput.value.trim() || email.split("@")[0],
        email,
        password,
        provider: "Email",
        role: getRoleForEmail(email),
      });
      window.location.href = getAuthReturnTo();
      return;
    }

    if (!existingUser || existingUser.password !== password) {
      message.textContent = "Email or password is incorrect.";
      return;
    }

    setCurrentUser({
      name: existingUser.name,
      email: existingUser.email,
      provider: existingUser.provider || "Email",
      role: getRoleForEmail(existingUser.email),
    });
    window.location.href = getAuthReturnTo();
  });

  googleButton.addEventListener("click", () => {
    upsertUser({
      name: "Google User",
      email: "google.user@example.com",
      provider: "Google",
    });
    window.location.href = getAuthReturnTo();
  });
}

initAuthPage();
