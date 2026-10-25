// Brands & Stores (brands.html): the brand directory from GET /brands/directory, nearest first for the shopper's
// country, and one brand's page (?b=<slug or name>) from GET /brands/item/<ref> with its listings on Lyrshop.
const BRANDS_PAGE_SIZE = 60;
const BRAND_COUNTRY_KEY = "lyrshopBrandsCountry";
const BRAND_TIER_LABELS = { luxury: "Luxury", premium: "Premium", mainstream: "Everyday", value: "Value" };
const BRAND_MARKETS_SHOWN = 24;

const brandParams = new URLSearchParams(window.location.search);
const brandState = {
  kind: brandParams.get("kind") || "",
  sector: brandParams.get("sector") || "",
  letter: "",
  q: brandParams.get("q") || "",
  local: brandParams.get("local") === "1",
  country: "",
  shown: BRANDS_PAGE_SIZE,
  brands: [],
};

const brandEls = {
  directory: document.getElementById("brands-directory"),
  detail: document.getElementById("brand-detail"),
  country: document.getElementById("brands-country"),
  intro: document.getElementById("brands-intro"),
  tabs: document.querySelectorAll(".brands-tab"),
  search: document.getElementById("brands-search"),
  local: document.getElementById("brands-local"),
  sectors: document.getElementById("brands-sectors"),
  letters: document.getElementById("brands-letters"),
  count: document.getElementById("brands-count"),
  grid: document.getElementById("brands-grid"),
  more: document.getElementById("brands-more"),
};

function brandEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function storedBrandCountry() {
  try {
    return localStorage.getItem(BRAND_COUNTRY_KEY) || "";
  } catch {
    return "";
  }
}

function rememberBrandCountry(code) {
  try {
    localStorage.setItem(BRAND_COUNTRY_KEY, code);
  } catch {
    // Private windows can refuse storage; the choice just isn't remembered.
  }
}

// The brand's own logo when staff uploaded one, else its website icon, else its initials.
function brandLogo(brand, large = false) {
  const initials = brand.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const src = brand.logo_url || (brand.website ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(brand.website.split("/")[0])}&sz=128` : "");
  const hue = [...brand.name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  return `<span class="brand-monogram" style="--brand-hue:${hue}">${brandEscape(initials)}</span>${src
    ? `<img src="${brandEscape(src)}" alt="" loading="lazy" width="${large ? 96 : 48}" height="${large ? 96 : 48}" onerror="this.remove()" />` : ""}`;
}

function availabilityLabel(brand, country) {
  if (!country) return brand.worldwide ? "Worldwide" : `${brand.markets.length} countries`;
  if (brand.worldwide) return brand.origin === country ? `From ${LyrLocale.countryName(country)}` : "Available worldwide";
  if (brand.markets.includes(country)) return `In ${LyrLocale.countryName(country)}`;
  return brand.reach === 2 ? "In your region" : "Not in your country";
}

function brandCard(brand) {
  const sector = brand.sectors[0]?.label || (brand.kinds.includes("retailer") ? "Store" : "Brand");
  const local = brand.local ? " brand-tag-local" : "";
  return `
    <a class="brand-tile" href="brands.html?b=${encodeURIComponent(brand.slug)}">
      <span class="brand-logo">${brandLogo(brand)}</span>
      <span class="brand-tile-text">
        <strong>${brandEscape(brand.name)}</strong>
        <span class="brand-tile-sector">${brandEscape(sector)}${brand.kinds.length > 1 ? " · Brand & store" : ""}</span>
        <span class="brand-tags">
          <span class="brand-tag${local}">${brandEscape(availabilityLabel(brand, brandState.country))}</span>
          ${brand.listings ? `<span class="brand-tag brand-tag-count">${brand.listings} on Lyrshop</span>` : ""}
        </span>
      </span>
    </a>`;
}

// ── Directory ───────────────────────────────────────────────────────────────

function directoryQuery() {
  const params = new URLSearchParams();
  if (brandState.country) params.set("country", brandState.country);
  if (brandState.kind) params.set("kind", brandState.kind);
  if (brandState.sector) params.set("sector", brandState.sector);
  if (brandState.letter) params.set("letter", brandState.letter);
  if (brandState.q) params.set("q", brandState.q);
  if (brandState.local) params.set("local", "1");
  return params;
}

let directoryRequest = 0;
async function loadDirectory() {
  const request = ++directoryRequest;
  const params = directoryQuery();
  brandEls.count.textContent = "Loading brands…";
  // Keep the address shareable without reloading.
  const shareable = new URLSearchParams(params);
  shareable.delete("country");
  shareable.delete("letter");
  history.replaceState(null, "", `brands.html${shareable.toString() ? `?${shareable}` : ""}`);
  try {
    const data = await authApi(`/brands/directory?${params}`);
    if (request !== directoryRequest) return;
    brandState.brands = data.brands || [];
    brandState.shown = BRANDS_PAGE_SIZE;
    renderFacets(data.facets || {});
    renderDirectory();
  } catch (error) {
    if (request !== directoryRequest) return;
    brandEls.count.textContent = error.message || "We couldn't load the brand directory.";
    brandEls.grid.innerHTML = "";
  }
}

function renderFacets(facets) {
  const sectors = facets.sectors || [];
  brandEls.sectors.innerHTML = [
    `<button type="button" class="filter-chip${brandState.sector ? "" : " active"}" data-sector="">All sectors</button>`,
    ...sectors.map((s) => `<button type="button" class="filter-chip${brandState.sector === s.key ? " active" : ""}" data-sector="${brandEscape(s.key)}">${brandEscape(s.label)} <span>${s.count}</span></button>`),
  ].join("");
  const letters = facets.letters || {};
  brandEls.letters.innerHTML = [
    `<button type="button" class="${brandState.letter ? "" : "active"}" data-letter="">All</button>`,
    ..."#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => `<button type="button" data-letter="${l}" ${letters[l] || brandState.letter === l ? "" : "disabled"} class="${brandState.letter === l ? "active" : ""}">${l}</button>`),
  ].join("");
}

function renderDirectory() {
  const total = brandState.brands.length;
  const place = brandState.country ? LyrLocale.countryName(brandState.country) : "";
  const localCount = brandState.brands.filter((b) => b.local).length;
  brandEls.count.textContent = total
    ? `${total} ${total === 1 ? "result" : "results"}${place ? ` · ${localCount} available in ${place}` : ""}`
    : "No brands match. Try another search or sector.";
  brandEls.grid.innerHTML = brandState.brands.slice(0, brandState.shown).map(brandCard).join("");
  brandEls.more.hidden = brandState.shown >= total;
  brandEls.more.textContent = `Show more (${total - brandState.shown} left)`;
}

function setKind(kind) {
  brandState.kind = kind;
  brandState.sector = "";
  brandEls.tabs.forEach((tab) => {
    const active = tab.dataset.kind === kind;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  loadDirectory();
}

function initCountryPicker() {
  const options = LyrLocale.countryOptions();
  brandEls.country.innerHTML = `<option value="">Everywhere</option>${options.map((c) => `<option value="${c.code}">${brandEscape(c.name)}</option>`).join("")}`;
  brandState.country = brandParams.get("country") || storedBrandCountry() || LyrLocale.country() || "";
  brandEls.country.value = brandState.country;
  brandEls.intro.textContent = brandState.country
    ? `International brands and the stores in ${LyrLocale.countryName(brandState.country)}, nearest first.`
    : "International brands and stores from around the world.";
}

function initDirectory() {
  initCountryPicker();
  brandEls.search.value = brandState.q;
  brandEls.local.checked = brandState.local;
  brandEls.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.kind === brandState.kind);
    tab.addEventListener("click", () => setKind(tab.dataset.kind));
  });
  brandEls.country.addEventListener("change", () => {
    brandState.country = brandEls.country.value;
    rememberBrandCountry(brandState.country);
    initCountryPicker();
    loadDirectory();
  });
  brandEls.search.addEventListener("input", debounce(() => {
    brandState.q = brandEls.search.value.trim();
    brandState.letter = "";
    loadDirectory();
  }, 250));
  brandEls.local.addEventListener("change", () => {
    brandState.local = brandEls.local.checked;
    loadDirectory();
  });
  brandEls.sectors.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-sector]");
    if (!chip) return;
    brandState.sector = chip.dataset.sector;
    brandState.letter = "";
    loadDirectory();
  });
  brandEls.letters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-letter]");
    if (!button || button.disabled) return;
    brandState.letter = button.dataset.letter;
    loadDirectory();
  });
  brandEls.more.addEventListener("click", () => {
    brandState.shown += BRANDS_PAGE_SIZE;
    renderDirectory();
  });
  // The shopper's country arrives from /locale after the first paint.
  LyrLocale.onChange(() => {
    if (!brandState.country && LyrLocale.country() && !storedBrandCountry()) {
      initCountryPicker();
      loadDirectory();
    }
  });
  loadDirectory();
}

// ── One brand ───────────────────────────────────────────────────────────────

function listingCard(product) {
  const prices = listingPrices(product);
  const image = product.image_url || "logo.svg";
  return `
    <a class="product-card brand-product" href="product.html?id=${encodeURIComponent(product.id)}">
      <div class="brand-product-image"><img src="${brandEscape(image)}" alt="" loading="lazy" /></div>
      <div class="brand-product-info">
        <h3 class="brand-product-name">${brandEscape(product.name)}</h3>
        <p class="brand-product-price">${LyrLocale.formatPrice(prices.price)}${prices.original_price > prices.price
          ? ` <s class="brand-was">${LyrLocale.formatPrice(prices.original_price)}</s>` : ""}</p>
        <p class="brand-product-meta">${brandEscape(conditionLabel(product))}${product.affiliate?.merchant ? ` · Sold by ${brandEscape(product.affiliate.merchant)}` : ""}</p>
      </div>
    </a>`;
}

function marketsList(brand, country) {
  if (brand.worldwide) return `<p>${brandEscape(brand.name)} sells worldwide${country ? `, including ${brandEscape(LyrLocale.countryName(country))}` : ""}.</p>`;
  const names = brand.markets.map((code) => ({ code, name: LyrLocale.countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
  const here = country && brand.markets.includes(country);
  const chips = names.slice(0, BRAND_MARKETS_SHOWN).map((c) => `<span class="brand-tag${c.code === country ? " brand-tag-local" : ""}">${brandEscape(c.name)}</span>`).join("");
  const more = names.length > BRAND_MARKETS_SHOWN ? `<span class="brand-tag">+${names.length - BRAND_MARKETS_SHOWN} more</span>` : "";
  const lead = country
    ? (here ? `${brandEscape(brand.name)} has stores in ${brandEscape(LyrLocale.countryName(country))}.` : `${brandEscape(brand.name)} doesn't trade in ${brandEscape(LyrLocale.countryName(country))} yet.`)
    : "";
  return `<p>${lead} Trades in ${names.length} ${names.length === 1 ? "country" : "countries"}:</p><div class="brand-tags">${chips}${more}</div>`;
}

async function loadBrand(ref) {
  brandEls.directory.hidden = true;
  brandEls.detail.hidden = false;
  const country = storedBrandCountry() || LyrLocale.country() || "";
  document.getElementById("brand-name").textContent = ref;
  try {
    const data = await authApi(`/brands/item/${encodeURIComponent(ref)}${country ? `?country=${country}` : ""}`);
    renderBrand(data, country);
  } catch (error) {
    document.getElementById("brand-description").textContent = error.status === 404 || error.status === 403
      ? "We couldn't find that brand." : (error.message || "We couldn't load this brand.");
    document.getElementById("brand-listings-title").hidden = true;
  }
}

function renderBrand(data, country) {
  const brand = data.brand;
  document.title = `${brand.name} | Lyrshop`;
  document.getElementById("brand-crumb").textContent = brand.name;
  document.getElementById("brand-name").textContent = brand.name;
  document.getElementById("brand-logo").innerHTML = brandLogo(brand, true);
  document.getElementById("brand-description").textContent = brand.description || "";
  const pills = [
    ...brand.kinds.map((k) => (k === "retailer" ? "Store" : "Brand")),
    BRAND_TIER_LABELS[brand.tier] || "",
    ...brand.sectors.map((s) => s.label),
  ].filter(Boolean);
  document.getElementById("brand-pills").innerHTML = pills.map((p) => `<span class="brand-tag">${brandEscape(p)}</span>`).join("")
    + (brand.protected ? `<span class="brand-tag brand-tag-protected" title="Only sellers the brand authorizes can list it on Lyrshop">✓ Authorized sellers only</span>` : "");
  const facts = [];
  if (brand.origin) facts.push(["From", LyrLocale.countryName(brand.origin)]);
  if (brand.aliases.length) facts.push(["Also known as", brand.aliases.slice(0, 6).join(", ")]);
  facts.push(["On Lyrshop", `${data.listing_total} ${data.listing_total === 1 ? "listing" : "listings"}`]);
  document.getElementById("brand-facts").innerHTML = facts.map(([k, v]) => `<div><dt>${brandEscape(k)}</dt><dd>${brandEscape(v)}</dd></div>`).join("");
  const website = document.getElementById("brand-website");
  if (brand.website) {
    website.href = `https://${brand.website}`;
    website.textContent = `Visit ${brand.website.split("/")[0]}`;
    website.hidden = false;
  }
  document.getElementById("brand-availability").innerHTML = brand.markets.length
    ? `<h2>Where to find ${brandEscape(brand.name)}</h2>${marketsList(brand, country)}` : "";
  document.getElementById("brand-listings-title").textContent = data.listing_total
    ? `${brand.name} on Lyrshop (${data.listing_total})` : `${brand.name} on Lyrshop`;
  document.getElementById("brand-listings").innerHTML = data.listings.length
    ? data.listings.map(listingCard).join("")
    : `<p class="brands-empty">No ${brandEscape(brand.name)} listings yet. ${brand.protected
      ? "This brand is sold only by authorized sellers; email support@lyrshop.com to become one."
      : `Have one to sell? <a href="admin.html">List it on Lyrshop</a>.`}</p>`;
  const shopAll = document.getElementById("brand-shop-all");
  if (data.listing_total > data.listings.length) {
    shopAll.href = `index.html?search=${encodeURIComponent(brand.name)}#product-list`;
    shopAll.hidden = false;
  }
  const related = data.related || [];
  document.getElementById("brand-related-wrap").hidden = !related.length;
  document.getElementById("brand-related").innerHTML = related.map((r) => `
    <a class="brand-chip" href="brands.html?b=${encodeURIComponent(r.slug)}"><span class="brand-logo brand-logo-small">${brandLogo(r)}</span>${brandEscape(r.name)}</a>`).join("");
}

const brandRef = brandParams.get("b");
if (brandRef) loadBrand(brandRef);
else initDirectory();
