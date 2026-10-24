// Grocery list page: the shopper's list becomes an Instacart page (POST /instacart/list), where they pick a nearby
// store (Aldi, Costco, Restaurant Depot, ...) and check out. Lyrshop never sells these items itself.
const GROCERY_DRAFT_KEY = "lyrshopGroceryList";
const GROCERY_QUICK = ["Milk", "Eggs", "Bread", "Bananas", "Rice", "Chicken breast", "Apples", "Butter", "Coffee", "Water"];

const groceryForm = document.getElementById("grocery-form");
const groceryList = document.getElementById("grocery-list");
const groceryStatus = document.getElementById("grocery-status");
const grocerySubmit = document.getElementById("grocery-submit");
const groceryOpen = document.getElementById("grocery-open");
const groceryPreview = document.getElementById("grocery-preview");

function groceryLines() {
  return groceryList.value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function renderGroceryPreview() {
  const lines = groceryLines();
  groceryPreview.innerHTML = lines.length
    ? lines.slice(0, 50).map((line) => `<li>${escapeGroceryHtml(line)}</li>`).join("")
    : "<li class=\"grocery-empty\">Your list is empty.</li>";
  grocerySubmit.textContent = lines.length
    ? `Shop ${lines.length} item${lines.length === 1 ? "" : "s"} on Instacart`
    : "Shop this list on Instacart";
}

function escapeGroceryHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function saveGroceryDraft() {
  try {
    localStorage.setItem(GROCERY_DRAFT_KEY, groceryList.value);
  } catch {
    // Private windows can refuse storage; the list just isn't remembered.
  }
}

function listChanged() {
  // A link made for the old list would shop the wrong items.
  groceryOpen.hidden = true;
  groceryStatus.textContent = "";
  renderGroceryPreview();
  saveGroceryDraft();
}

GROCERY_QUICK.forEach((item) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip-button";
  button.textContent = `+ ${item}`;
  button.addEventListener("click", () => {
    if (groceryLines().some((line) => line.toLowerCase() === item.toLowerCase())) return;
    groceryList.value = [...groceryLines(), item].join("\n");
    listChanged();
  });
  document.getElementById("grocery-quick").append(button);
});

groceryList.addEventListener("input", listChanged);

groceryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const lines = groceryLines();
  if (!lines.length) {
    groceryStatus.textContent = "Add at least one item to your list.";
    groceryList.focus();
    return;
  }
  grocerySubmit.disabled = true;
  groceryStatus.textContent = "Making your Instacart list…";
  try {
    const { url } = await authApi("/instacart/list", { method: "POST", body: { text: lines.join("\n") } });
    groceryOpen.href = url;
    groceryOpen.hidden = false;
    groceryStatus.textContent = "Your list is ready. Open it to pick a store near you.";
    groceryOpen.focus();
  } catch (error) {
    groceryStatus.textContent = error.message;
  } finally {
    grocerySubmit.disabled = false;
  }
});

try {
  groceryList.value = localStorage.getItem(GROCERY_DRAFT_KEY) || "";
} catch {
  groceryList.value = "";
}
renderGroceryPreview();
