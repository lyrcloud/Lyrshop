// Gift card page: pick an amount and delivery, then pay on Stripe. The server keeps the card inactive until the
// payment clears, then emails the code to the recipient (or shows it under My Lyrshop › Gift cards).
const GIFT_PRESETS = [25, 50, 100, 200];
const GIFT_MIN = 5;
const GIFT_MAX = 500;
const GIFT_DRAFT_KEY = "lyrshopGiftCardDraft";

const giftForm = document.getElementById("giftcard-form");
const giftAmount = document.getElementById("giftcard-amount");
const giftEmail = document.getElementById("giftcard-email");
const giftName = document.getElementById("giftcard-name");
const giftFrom = document.getElementById("giftcard-from");
const giftMessage = document.getElementById("giftcard-message");
const giftStatus = document.getElementById("giftcard-status");
const giftSubmit = document.getElementById("giftcard-submit");
const giftPresets = document.getElementById("giftcard-presets");

function usd(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function delivery() {
  return giftForm.querySelector("input[name='delivery']:checked").value;
}

function renderGiftPreview() {
  const amount = Number(giftAmount.value) || 0;
  giftPresets.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.amount) === amount));
  });
  const toSomeone = delivery() === "email";
  document.getElementById("giftcard-recipient").hidden = !toSomeone;
  document.getElementById("preview-amount").textContent = usd(amount);
  const name = giftName.value.trim();
  document.getElementById("preview-to").textContent = toSomeone && name ? `For ${name}` : "Gift card";
  const message = document.getElementById("preview-message");
  message.hidden = !(toSomeone && giftMessage.value.trim());
  message.textContent = `“${giftMessage.value.trim()}”${giftFrom.value.trim() ? ` — ${giftFrom.value.trim()}` : ""}`;
  giftSubmit.textContent = `Buy ${usd(amount)} gift card`;
}

function setGiftStatus(text, isError = false) {
  giftStatus.textContent = text;
  giftStatus.classList.toggle("is-error", isError);
}

async function buyGiftCard(event) {
  event.preventDefault();
  const amount = Number(giftAmount.value);
  if (!(amount >= GIFT_MIN && amount <= GIFT_MAX) || !Number.isInteger(amount)) {
    setGiftStatus(`Choose a whole-dollar amount from ${usd(GIFT_MIN)} to ${usd(GIFT_MAX)}.`, true);
    giftAmount.focus();
    return;
  }
  const toSomeone = delivery() === "email";
  if (toSomeone && !giftEmail.checkValidity()) {
    setGiftStatus("Enter the recipient's email address.", true);
    giftEmail.focus();
    return;
  }
  if (toSomeone && !giftEmail.value.trim()) {
    setGiftStatus("Enter the recipient's email, or choose Keep it for me.", true);
    giftEmail.focus();
    return;
  }
  const body = {
    amount,
    recipient_email: toSomeone ? giftEmail.value.trim() : "",
    recipient_name: toSomeone ? giftName.value.trim() : "",
    sender_name: giftFrom.value.trim(),
    message: toSomeone ? giftMessage.value.trim() : "",
    success_url: `${window.location.origin}/dashboard.html#gift-cards`,
    cancel_url: `${window.location.origin}/giftcards.html`,
  };
  if (!getCurrentUser()) {
    // Keep what they typed while they sign in.
    try { sessionStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify(body)); } catch { /* storage blocked */ }
    localStorage.setItem("lyrshopAuthReturnTo", "giftcards.html");
    window.location.href = "auth.html";
    return;
  }
  giftSubmit.disabled = true;
  setGiftStatus("Starting secure checkout…");
  try {
    const result = await authApi("/giftcards/purchase", { method: "POST", body });
    try { sessionStorage.removeItem(GIFT_DRAFT_KEY); } catch { /* storage blocked */ }
    if (result.stripe_configured && result.checkout_url) {
      setGiftStatus("Redirecting to Stripe…");
      window.location.href = result.checkout_url;
      return;
    }
    setGiftStatus(result.message || "Gift card ordered. It activates once the payment is confirmed.");
    giftSubmit.disabled = false;
  } catch (error) {
    setGiftStatus(error.status === 401 ? "Please sign in again to buy a gift card." : (error.message || "Checkout failed. Please try again."), true);
    giftSubmit.disabled = false;
  }
}

function restoreDraft() {
  let draft = null;
  try { draft = JSON.parse(sessionStorage.getItem(GIFT_DRAFT_KEY) || "null"); } catch { /* storage blocked */ }
  const user = getCurrentUser();
  giftFrom.value = draft?.sender_name || user?.name || "";
  if (!draft) return;
  giftAmount.value = draft.amount;
  giftEmail.value = draft.recipient_email || "";
  giftName.value = draft.recipient_name || "";
  giftMessage.value = draft.message || "";
  if (!draft.recipient_email) giftForm.querySelector("input[value='me']").checked = true;
}

giftPresets.innerHTML = GIFT_PRESETS
  .map((amount) => `<button type="button" class="chip-button" data-amount="${amount}" aria-pressed="false">${usd(amount)}</button>`)
  .join("");
giftPresets.addEventListener("click", (event) => {
  const button = event.target.closest("[data-amount]");
  if (!button) return;
  giftAmount.value = button.dataset.amount;
  renderGiftPreview();
});
giftForm.addEventListener("input", renderGiftPreview);
giftForm.addEventListener("change", renderGiftPreview);
giftForm.addEventListener("submit", buyGiftCard);
restoreDraft();
renderGiftPreview();
updateHeaderCounts();
