const AUTH_USERS_KEY = "lyrshopUsers";
const AUTH_SESSION_KEY = "lyrshopSession";
const AUTH_ORDERS_KEY = "lyrshopOrders";
const ADMIN_EMAIL = "lyrclouds@gmail.com";
// Mobile sign-up/login needs Twilio able to text any number (account upgraded from trial). Flip to true then.
const MOBILE_SIGNUP_ENABLED = false;

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

// Accounts sign up with an email or an E.164 mobile number; this is whichever one they used.
function getAccountId(user) {
  return String(user?.email || "").toLowerCase() || user?.phone || "";
}

function getAccountContact(user) {
  return user?.email || user?.phone || "";
}

function findUserByContact(users, contact) {
  return users.find((user) => (contact.kind === "phone"
    ? user.phone === contact.value
    : String(user.email || "").toLowerCase() === contact.value));
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

function getOrdersForUser(accountId) {
  const orders = JSON.parse(localStorage.getItem(AUTH_ORDERS_KEY) || "[]");
  return orders.filter((order) => order.userEmail === accountId);
}

function saveOrderForCurrentUser(order) {
  const user = getCurrentUser();
  if (!user) return;

  const orders = JSON.parse(localStorage.getItem(AUTH_ORDERS_KEY) || "[]");
  orders.unshift({
    ...order,
    id: order.id || `local-${Date.now()}`,
    userEmail: getAccountId(user),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(AUTH_ORDERS_KEY, JSON.stringify(orders));
}

function upsertUser(user) {
  const users = getUsers();
  const index = users.findIndex((storedUser) => getAccountId(storedUser) === getAccountId(user));
  if (index >= 0) {
    users[index] = { ...users[index], ...user };
  } else {
    users.push(user);
  }
  saveUsers(users);
  setCurrentUser({
    name: user.name,
    email: user.email,
    phone: user.phone,
    provider: user.provider,
    role: getRoleForEmail(user.email),
  });
}

// [ISO code, name, dial code]; US/Canada and other +1 countries share a dial code, so options are keyed by ISO.
const PHONE_COUNTRIES = [
  ["AF", "Afghanistan", "93"], ["DZ", "Algeria", "213"], ["AR", "Argentina", "54"], ["AU", "Australia", "61"],
  ["AT", "Austria", "43"], ["BH", "Bahrain", "973"], ["BD", "Bangladesh", "880"], ["BE", "Belgium", "32"],
  ["BR", "Brazil", "55"], ["CA", "Canada", "1"], ["CL", "Chile", "56"], ["CN", "China", "86"],
  ["CO", "Colombia", "57"], ["CZ", "Czechia", "420"], ["DK", "Denmark", "45"], ["DO", "Dominican Republic", "1"],
  ["EC", "Ecuador", "593"], ["EG", "Egypt", "20"], ["ET", "Ethiopia", "251"], ["FI", "Finland", "358"],
  ["FR", "France", "33"], ["DE", "Germany", "49"], ["GH", "Ghana", "233"], ["GR", "Greece", "30"],
  ["HK", "Hong Kong", "852"], ["HU", "Hungary", "36"], ["IN", "India", "91"], ["ID", "Indonesia", "62"],
  ["IQ", "Iraq", "964"], ["IE", "Ireland", "353"], ["IL", "Israel", "972"], ["IT", "Italy", "39"],
  ["JM", "Jamaica", "1"], ["JP", "Japan", "81"], ["JO", "Jordan", "962"], ["KZ", "Kazakhstan", "7"],
  ["KE", "Kenya", "254"], ["KW", "Kuwait", "965"], ["LB", "Lebanon", "961"], ["MY", "Malaysia", "60"],
  ["MX", "Mexico", "52"], ["MA", "Morocco", "212"], ["NP", "Nepal", "977"], ["NL", "Netherlands", "31"],
  ["NZ", "New Zealand", "64"], ["NG", "Nigeria", "234"], ["NO", "Norway", "47"], ["OM", "Oman", "968"],
  ["PK", "Pakistan", "92"], ["PS", "Palestine", "970"], ["PE", "Peru", "51"], ["PH", "Philippines", "63"],
  ["PL", "Poland", "48"], ["PT", "Portugal", "351"], ["PR", "Puerto Rico", "1"], ["QA", "Qatar", "974"],
  ["RO", "Romania", "40"], ["RU", "Russia", "7"], ["SA", "Saudi Arabia", "966"], ["SG", "Singapore", "65"],
  ["ZA", "South Africa", "27"], ["KR", "South Korea", "82"], ["ES", "Spain", "34"], ["LK", "Sri Lanka", "94"],
  ["SD", "Sudan", "249"], ["SE", "Sweden", "46"], ["CH", "Switzerland", "41"], ["SY", "Syria", "963"],
  ["TW", "Taiwan", "886"], ["TZ", "Tanzania", "255"], ["TH", "Thailand", "66"], ["TN", "Tunisia", "216"],
  ["TR", "Türkiye", "90"], ["UG", "Uganda", "256"], ["UA", "Ukraine", "380"], ["AE", "United Arab Emirates", "971"],
  ["GB", "United Kingdom", "44"], ["US", "United States", "1"], ["VE", "Venezuela", "58"], ["VN", "Vietnam", "84"],
  ["YE", "Yemen", "967"],
];

function countryFlag(iso) {
  return String.fromCodePoint(...[...iso].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}

function guessCountry() {
  const region = (navigator.languages || [navigator.language || ""])
    .map((tag) => tag.split("-")[1])
    .find((part) => part && PHONE_COUNTRIES.some(([iso]) => iso === part.toUpperCase()));
  return region ? region.toUpperCase() : "US";
}

function initAuthPage() {
  const form = document.getElementById("auth-form");
  if (!form) return;

  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const nameField = document.getElementById("name-field");
  const nameInput = document.getElementById("auth-name");
  const contactEmailButton = document.getElementById("contact-email");
  const contactPhoneButton = document.getElementById("contact-phone");
  const emailField = document.getElementById("email-field");
  const emailInput = document.getElementById("auth-email");
  const phoneField = document.getElementById("phone-field");
  const countrySelect = document.getElementById("auth-country");
  const phoneInput = document.getElementById("auth-phone");
  const passwordInput = document.getElementById("auth-password");
  const submitButton = document.getElementById("auth-submit");
  const googleButton = document.getElementById("google-auth");
  const message = document.getElementById("auth-message");
  const verifyDialog = document.getElementById("verify-dialog");
  const verifyMessage = document.getElementById("verify-message");
  const verifyForm = document.getElementById("verify-form");
  const verifyCopy = document.getElementById("verify-copy");
  const verifyCodeInput = document.getElementById("verify-code");
  const verifyResend = document.getElementById("verify-resend");
  const verifyBack = document.getElementById("verify-back");
  let mode = "login";
  let contactKind = "email";
  let pendingSignup = null;

  countrySelect.innerHTML = PHONE_COUNTRIES
    .map(([iso, name, dial]) => `<option value="${iso}">${countryFlag(iso)} +${dial} ${name}</option>`)
    .join("");
  countrySelect.value = guessCountry();
  if (!MOBILE_SIGNUP_ENABLED) {
    contactEmailButton.parentElement.classList.add("hidden");
    document.querySelector(".auth-terms").textContent = "New accounts are verified with a code sent to your email.";
  }

  function setContactKind(kind) {
    contactKind = kind;
    const isPhone = kind === "phone";
    contactEmailButton.classList.toggle("active", !isPhone);
    contactPhoneButton.classList.toggle("active", isPhone);
    contactEmailButton.setAttribute("aria-pressed", String(!isPhone));
    contactPhoneButton.setAttribute("aria-pressed", String(isPhone));
    emailField.classList.toggle("hidden", isPhone);
    phoneField.classList.toggle("hidden", !isPhone);
    emailInput.required = !isPhone;
    phoneInput.required = isPhone;
    message.textContent = "";
  }

  contactEmailButton.addEventListener("click", () => setContactKind("email"));
  contactPhoneButton.addEventListener("click", () => setContactKind("phone"));

  // Returns { kind, value } with value normalised (lowercase email or E.164 phone), or null if invalid.
  function readContact() {
    if (contactKind === "email") {
      const email = emailInput.value.trim().toLowerCase();
      return email ? { kind: "email", value: email } : null;
    }
    const raw = phoneInput.value.trim();
    let phone;
    if (raw.startsWith("+")) {
      phone = `+${raw.replace(/\D/g, "")}`;
    } else {
      const dial = PHONE_COUNTRIES.find(([iso]) => iso === countrySelect.value)[2];
      // Drop the national trunk prefix (the leading 0 many countries use for local dialling).
      phone = `+${dial}${raw.replace(/\D/g, "").replace(/^0+/, "")}`;
    }
    return /^\+[1-9]\d{7,14}$/.test(phone) ? { kind: "phone", value: phone } : null;
  }

  function openVerifyDialog() {
    const sentTo = getAccountContact(pendingSignup);
    verifyCopy.textContent = pendingSignup.phone
      ? `We texted a 6-digit code to ${sentTo}. It expires in 10 minutes.`
      : `We sent a 6-digit code to ${sentTo}. It expires in 10 minutes.`;
    verifyCodeInput.value = "";
    verifyMessage.textContent = "";
    verifyDialog.showModal();
    verifyCodeInput.focus();
  }

  // Covers Cancel and the Escape key alike.
  verifyDialog.addEventListener("close", () => {
    pendingSignup = null;
  });

  function verificationTarget() {
    return pendingSignup.phone ? { phone: pendingSignup.phone } : { email: pendingSignup.email };
  }

  async function sendCode() {
    await postAuthApi("/auth/verify/send", verificationTarget());
  }

  async function startVerification(signup) {
    pendingSignup = signup;
    message.textContent = "Sending verification code...";
    try {
      await sendCode();
      message.textContent = "";
      openVerifyDialog();
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
    const contact = readContact();
    if (!contact) {
      message.textContent = contactKind === "phone"
        ? "Enter a valid mobile number for the selected country."
        : "Enter a valid email address.";
      return;
    }
    const password = passwordInput.value;
    const existingUser = findUserByContact(getUsers(), contact);
    const contactLabel = contact.kind === "phone" ? "mobile number" : "email";

    if (mode === "signup") {
      if (existingUser) {
        message.textContent = `An account already exists for that ${contactLabel}.`;
        return;
      }
      submitButton.disabled = true;
      await startVerification({
        name: nameInput.value.trim() || (contact.kind === "email" ? contact.value.split("@")[0] : contact.value),
        [contact.kind]: contact.value,
        password,
        provider: contact.kind === "phone" ? "Mobile" : "Email",
        role: contact.kind === "email" ? getRoleForEmail(contact.value) : "user",
      });
      submitButton.disabled = false;
      return;
    }

    if (!existingUser || existingUser.password !== password) {
      message.textContent = contact.kind === "phone"
        ? "Mobile number or password is incorrect."
        : "Email or password is incorrect.";
      return;
    }

    setCurrentUser({
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
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
    verifyMessage.textContent = "Checking code...";
    try {
      await postAuthApi("/auth/verify/confirm", {
        ...verificationTarget(),
        code: verifyCodeInput.value.trim(),
      });
      upsertUser({ ...pendingSignup, [pendingSignup.phone ? "phoneVerified" : "emailVerified"]: true });
      window.location.href = getAuthReturnTo();
    } catch (error) {
      verifyMessage.textContent = error.message;
    } finally {
      verifyButton.disabled = false;
    }
  });

  verifyResend.addEventListener("click", async () => {
    if (!pendingSignup) return;
    verifyResend.disabled = true;
    try {
      await sendCode();
      verifyMessage.textContent = "A new code is on its way.";
    } catch (error) {
      verifyMessage.textContent = error.message;
    } finally {
      verifyResend.disabled = false;
    }
  });

  verifyBack.addEventListener("click", () => {
    verifyDialog.close();
    (contactKind === "phone" ? phoneInput : emailInput).focus();
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

    const isNewUser = !findUserByContact(getUsers(), { kind: "email", value: googleUser.email });
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
