const AUTH_USERS_KEY = "lyrshopUsers";
const AUTH_SESSION_KEY = "lyrshopSession";
const AUTH_ORDERS_KEY = "lyrshopOrders";
const ADMIN_EMAIL = "lyrclouds@gmail.com";
// Named apart from app.js/admin.js API_BASE_URL, which share this page scope.
const AUTH_API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
  ? "http://127.0.0.1:5000"
  : "";

async function postAuthApi(path, body) {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

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
  const tabs = document.querySelector(".auth-tabs");
  const verifyForm = document.getElementById("verify-form");
  const verifyCopy = document.getElementById("verify-copy");
  const verifyCodeInput = document.getElementById("verify-code");
  const verifyResend = document.getElementById("verify-resend");
  const verifyBack = document.getElementById("verify-back");
  let mode = "login";
  let pendingSignup = null;

  function showVerifyStep(show) {
    form.classList.toggle("hidden", show);
    tabs.classList.toggle("hidden", show);
    verifyForm.classList.toggle("hidden", !show);
    if (show) {
      verifyCopy.textContent = `We sent a 6-digit code to ${pendingSignup.email}. It expires in 10 minutes.`;
      verifyCodeInput.value = "";
      verifyCodeInput.focus();
    }
  }

  async function sendCode() {
    await postAuthApi("/auth/verify/send", { email: pendingSignup.email });
  }

  async function startVerification(signup) {
    pendingSignup = signup;
    message.textContent = "Sending verification code...";
    try {
      await sendCode();
      message.textContent = "";
      showVerifyStep(true);
    } catch (error) {
      pendingSignup = null;
      message.textContent = error.message;
    }
  }

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

  form.addEventListener("submit", async (event) => {
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
      submitButton.disabled = true;
      await startVerification({
        name: nameInput.value.trim() || email.split("@")[0],
        email,
        password,
        provider: "Email",
        role: getRoleForEmail(email),
      });
      submitButton.disabled = false;
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

  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingSignup) return;
    const verifyButton = verifyForm.querySelector('button[type="submit"]');
    verifyButton.disabled = true;
    message.textContent = "Checking code...";
    try {
      await postAuthApi("/auth/verify/confirm", {
        email: pendingSignup.email,
        code: verifyCodeInput.value.trim(),
      });
      upsertUser({ ...pendingSignup, emailVerified: true });
      window.location.href = getAuthReturnTo();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      verifyButton.disabled = false;
    }
  });

  verifyResend.addEventListener("click", async () => {
    if (!pendingSignup) return;
    verifyResend.disabled = true;
    try {
      await sendCode();
      message.textContent = "A new code is on its way.";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      verifyResend.disabled = false;
    }
  });

  verifyBack.addEventListener("click", () => {
    pendingSignup = null;
    message.textContent = "";
    showVerifyStep(false);
    emailInput.focus();
  });

  function onGoogleCredential(response) {
    let googleUser;
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const email = payload.email.toLowerCase();
      googleUser = {
        name: payload.name || email.split("@")[0],
        email,
        provider: "Google",
        role: getRoleForEmail(email),
      };
    } catch {
      message.textContent = "Google sign-in failed. Please try again.";
      return;
    }

    const isNewUser = !getUsers().some((user) => user.email.toLowerCase() === googleUser.email);
    if (isNewUser) {
      startVerification(googleUser);
      return;
    }
    upsertUser(googleUser);
    window.location.href = getAuthReturnTo();
  }

  function initGoogle() {
    if (!window.google) return;
    google.accounts.id.initialize({
      client_id: "238394195869-ohu6m0qm43k069a3r2sb3mak0r4g9obs.apps.googleusercontent.com",
      callback: onGoogleCredential,
    });
    google.accounts.id.renderButton(googleButton, {
      theme: "outline",
      size: "large",
      width: googleButton.offsetWidth || 340,
      text: "continue_with",
    });
  }

  if (window.google) {
    initGoogle();
  } else {
    window.addEventListener("load", initGoogle);
  }
}

initAuthPage();
