// Brands & Stores (brands.html): the brand directory from GET /brands/directory, nearest first for the shopper's
// country, and one brand's page (?b=<slug or name>) from GET /brands/item/<ref> with its listings on Lyrshop.
const BRANDS_PAGE_SIZE = 60;
const BRAND_COUNTRY_KEY = "lyrshopBrandsCountry";
const BRAND_TIER_LABELS = { luxury: "Luxury", premium: "Premium", mainstream: "Everyday", value: "Value" };
const BRAND_MARKETS_SHOWN = 24;
const BRANDS_PER_GROUP = 8;

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
  sectors: [],
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
          ${brand.listings ? '<span class="brand-tag brand-tag-count">On Lyrshop</span>' : ""}
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
    brandState.sectors = data.facets?.sectors || [];
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

// Without a sector, letter or search the directory is shown category by category (a brand in two sectors shows in both).
function directoryGroups() {
  const groups = brandState.sectors.map((sector) => ({ key: sector.key, label: sector.label, brands: [] }));
  const byKey = new Map(groups.map((group) => [group.key, group]));
  const other = { key: "", label: "Other brands & stores", brands: [] };
  brandState.brands.forEach((brand) => {
    const homes = brand.sectors.map((sector) => byKey.get(sector.key)).filter(Boolean);
    (homes.length ? homes : [other]).forEach((group) => group.brands.push(brand));
  });
  return [...groups, other].filter((group) => group.brands.length);
}

function renderDirectory() {
  const grouped = !brandState.sector && !brandState.letter && !brandState.q;
  const groups = grouped ? directoryGroups() : [];
  // Shoppers don't see how many brands there are; the line only speaks up when nothing matches.
  brandEls.count.textContent = brandState.brands.length ? "" : "No brands match. Try another search or sector.";
  if (grouped) {
    brandEls.grid.className = "brands-groups";
    brandEls.grid.innerHTML = groups.map((group) => `
      <section class="brands-group">
        <div class="brands-group-head">
          <h2>${brandEscape(group.label)}</h2>
          ${group.key && group.brands.length > BRANDS_PER_GROUP
            ? `<button type="button" class="brands-group-all" data-sector="${brandEscape(group.key)}">See all ›</button>` : ""}
        </div>
        <div class="brands-grid">${group.brands.slice(0, group.key ? BRANDS_PER_GROUP : brandState.shown).map(brandCard).join("")}</div>
      </section>`).join("");
    brandEls.more.hidden = true;
    return;
  }
  brandEls.grid.className = "brands-grid";
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
  brandEls.grid.addEventListener("click", (event) => {
    const all = event.target.closest(".brands-group-all");
    if (!all) return;
    brandState.sector = all.dataset.sector;
    brandState.letter = "";
    loadDirectory();
    brandEls.sectors.scrollIntoView({ behavior: "smooth", block: "start" });
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
  rememberPhotoFallbacks(product);
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

// Category names are stored on listings; the storefront shows Lyrshop's labels for them (categories.js).
function brandCategoryLabel(name) {
  let categories = [];
  try {
    categories = JSON.parse(localStorage.getItem("lyrshopCategories") || "[]");
  } catch {
    // Unreadable or blocked storage falls back to the built-in names.
  }
  const all = [...(Array.isArray(categories) ? categories : []), ...(typeof LYRSHOP_DEFAULT_CATEGORIES === "undefined" ? [] : LYRSHOP_DEFAULT_CATEGORIES)];
  return all.find((category) => category?.name === name)?.label || name;
}

let brandCategory = brandParams.get("category") || "";

async function loadBrand(ref) {
  brandEls.directory.hidden = true;
  brandEls.detail.hidden = false;
  const country = storedBrandCountry() || LyrLocale.country() || "";
  document.getElementById("brand-name").textContent = ref;
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (brandCategory) params.set("category", brandCategory);
  try {
    const data = await authApi(`/brands/item/${encodeURIComponent(ref)}${params.toString() ? `?${params}` : ""}`);
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
  if (data.listing_total) facts.push(["On Lyrshop", "Yes"]);
  document.getElementById("brand-facts").innerHTML = facts.map(([k, v]) => `<div><dt>${brandEscape(k)}</dt><dd>${brandEscape(v)}</dd></div>`).join("");
  const website = document.getElementById("brand-website");
  if (brand.website) {
    website.href = `https://${brand.website}`;
    website.textContent = `Visit ${brand.website.split("/")[0]}`;
    website.hidden = false;
  }
  document.getElementById("brand-availability").innerHTML = brand.markets.length
    ? `<h2>Where to find ${brandEscape(brand.name)}</h2>${marketsList(brand, country)}` : "";
  document.getElementById("brand-listings-title").textContent = `${brand.name} on Lyrshop`;
  renderBrandCategories(data);
  document.getElementById("brand-listings").innerHTML = data.listings.length
    ? brandListingsHtml(data)
    : `<p class="brands-empty">No ${brandEscape(brand.name)} listings yet. ${brand.protected
      ? "This brand is sold only by authorized sellers; email support@lyrshop.com to become one."
      : `Have one to sell? <a href="admin.html">List it on Lyrshop</a>.`}</p>`;
  const shopAll = document.getElementById("brand-shop-all");
  if ((data.category_total ?? data.listing_total) > data.listings.length) {
    shopAll.href = `index.html?search=${encodeURIComponent(brand.name)}#product-list`;
    shopAll.hidden = false;
  }
  const related = data.related || [];
  document.getElementById("brand-related-wrap").hidden = !related.length;
  document.getElementById("brand-related").innerHTML = related.map((r) => `
    <a class="brand-chip" href="brands.html?b=${encodeURIComponent(r.slug)}"><span class="brand-logo brand-logo-small">${brandLogo(r)}</span>${brandEscape(r.name)}</a>`).join("");
}

// A chip for every category the brand sells in (shoppers don't see how many listings there are); picking one reloads only that category's listings.
function renderBrandCategories(data) {
  const wrap = document.getElementById("brand-categories");
  const categories = data.categories || [];
  wrap.hidden = categories.length < 2;
  wrap.innerHTML = [
    `<button type="button" class="filter-chip${data.category ? "" : " active"}" data-category="">All</button>`,
    ...categories.map((c) => `<button type="button" class="filter-chip${data.category === c.name ? " active" : ""}" data-category="${brandEscape(c.name)}">${brandEscape(brandCategoryLabel(c.name))}</button>`),
  ].join("");
}

// All categories: one section per category, biggest first; a picked category: its listings in one grid.
function brandListingsHtml(data) {
  const categories = data.categories || [];
  if (data.category || categories.length < 2) return `<div class="product-grid brand-listings">${data.listings.map(listingCard).join("")}</div>`;
  const sections = categories.map((c) => ({ ...c, listings: data.listings.filter((p) => p.category === c.name) }));
  const loose = data.listings.filter((p) => !categories.some((c) => c.name === p.category));
  if (loose.length) sections.push({ name: "", count: loose.length, listings: loose });
  return sections.filter((section) => section.listings.length).map((section) => `
    <section class="brand-category-group">
      <div class="brands-group-head">
        <h3>${brandEscape(section.name ? brandCategoryLabel(section.name) : "Other")}</h3>
        ${section.name && section.count > section.listings.length
          ? `<button type="button" class="brands-group-all" data-category="${brandEscape(section.name)}">See all ›</button>` : ""}
      </div>
      <div class="product-grid brand-listings">${section.listings.map(listingCard).join("")}</div>
    </section>`).join("");
}

function pickBrandCategory(event) {
  const target = event.target.closest("[data-category]");
  if (!target) return;
  brandCategory = target.dataset.category;
  const url = new URLSearchParams(window.location.search);
  if (brandCategory) url.set("category", brandCategory);
  else url.delete("category");
  history.replaceState(null, "", `brands.html?${url}`);
  document.getElementById("brand-categories").scrollIntoView({ behavior: "smooth", block: "start" });
  loadBrand(brandParams.get("b"));
}

document.getElementById("brand-categories").addEventListener("click", pickBrandCategory);
document.getElementById("brand-listings").addEventListener("click", pickBrandCategory);

const brandRef = brandParams.get("b");
if (brandRef) loadBrand(brandRef);
else initDirectory();
