// Language and currency for visitors from every country. Loaded before the page scripts.
// - Language: the browser's language is applied automatically through Google's website translator; a picker overrides it.
// - Currency: /locale reports the visitor's country (from CloudFront) and USD exchange rates; prices are stored in USD
//   and shown converted. Checkout charges in USD, with Stripe converting to the shopper's currency where it can.
(() => {
  const API_BASE_URL = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname)
    ? "http://127.0.0.1:5000"
    : "";
  const LOCALE_KEY = "lyrshopLocale";
  const CURRENCY_KEY = "lyrshopCurrency";
  const LANGUAGE_KEY = "lyrshopLanguage";
  const LOCALE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const SITE_LANGUAGE = "en";
  // Languages offered in the picker; Google's translator handles each of these.
  const LANGUAGES = [
    "en", "es", "fr", "de", "it", "pt", "nl", "sv", "no", "da", "fi", "pl", "cs", "sk", "hu", "ro", "bg", "el", "uk", "ru",
    "tr", "ar", "he", "fa", "ur", "hi", "bn", "pa", "gu", "mr", "ta", "te", "kn", "ml", "si", "ne", "th", "vi", "id", "ms",
    "tl", "zh-CN", "zh-TW", "ja", "ko", "sw", "am", "yo", "ha", "zu", "af",
  ];

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* Private mode: the choice lasts for this page only. */ }
    },
  };

  function readCachedLocale() {
    try {
      const cached = JSON.parse(storage.get(LOCALE_KEY) || "null");
      return cached && Date.now() - cached.saved_at < LOCALE_MAX_AGE_MS ? cached : null;
    } catch {
      return null;
    }
  }

  let locale = readCachedLocale() || { country: null, currency: "USD", rates: { USD: 1 } };
  const listeners = [];

  function activeCurrency() {
    const chosen = storage.get(CURRENCY_KEY);
    const currency = chosen || locale.currency || "USD";
    return locale.rates?.[currency] ? currency : "USD";
  }

  const numberLocale = () => navigator.language || "en-US";

  // A USD amount in the shopper's currency, e.g. 24 -> "₹2,288" or "€21.44".
  function formatPrice(usd) {
    const currency = activeCurrency();
    const amount = Number(usd || 0) * (locale.rates?.[currency] || 1);
    try {
      return new Intl.NumberFormat(numberLocale(), { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  function formatUsd(usd) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(usd || 0));
  }

  function notify() {
    listeners.forEach((listener) => {
      try { listener(); } catch (error) { console.warn("Locale listener failed.", error); }
    });
    renderPickers();
  }

  async function loadLocale() {
    if (readCachedLocale()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/locale`);
      const isJson = (res.headers.get("Content-Type") || "").includes("application/json");
      if (!res.ok || !isJson) return;
      const data = await res.json();
      const before = activeCurrency();
      locale = { ...data, saved_at: Date.now() };
      storage.set(LOCALE_KEY, JSON.stringify(locale));
      if (activeCurrency() !== before) notify();
      else renderPickers();
    } catch (error) {
      console.warn("Locale lookup failed; showing USD.", error);
    }
  }

  // ── Translation ────────────────────────────────────────────────────────────
  function browserLanguage() {
    const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || SITE_LANGUAGE;
    const [base, region] = preferred.split("-");
    if (base === "zh") return /TW|HK|MO|Hant/i.test(preferred) ? "zh-TW" : "zh-CN";
    if (base === "nb" || base === "nn") return "no";
    if (base === "iw") return "he";
    if (base === "fil") return "tl";
    return LANGUAGES.includes(base) ? base : LANGUAGES.includes(`${base}-${region}`) ? `${base}-${region}` : SITE_LANGUAGE;
  }

  function activeLanguage() {
    return storage.get(LANGUAGE_KEY) || browserLanguage();
  }

  // Google's translator reads the googtrans cookie to pick the target language.
  function setTranslateCookie(language) {
    const host = window.location.hostname;
    const parent = host.split(".").slice(-2).join(".");
    const value = language === SITE_LANGUAGE ? "" : `/${SITE_LANGUAGE}/${language}`;
    const expiry = value ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=${value}; path=/${expiry}`;
    if (parent.includes(".")) document.cookie = `googtrans=${value}; path=/; domain=.${parent}${expiry}`;
  }

  function startTranslation() {
    const language = activeLanguage();
    setTranslateCookie(language);
    if (language === SITE_LANGUAGE) return;
    const holder = document.createElement("div");
    holder.id = "google_translate_element";
    holder.hidden = true;
    document.body.appendChild(holder);
    window.lyrshopTranslateInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage: SITE_LANGUAGE, autoDisplay: false }, "google_translate_element");
      // The cookie usually starts the translation; if the page is still untranslated, pick the language in Google's
      // hidden selector as well.
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        const combo = document.querySelector(".goog-te-combo");
        const translated = /translated-(ltr|rtl)/.test(document.documentElement.className);
        if (translated || tries > 50) {
          clearInterval(timer);
          return;
        }
        if (combo && combo.options.length > 1 && tries > 10) {
          clearInterval(timer);
          combo.value = language;
          combo.dispatchEvent(new Event("change"));
        }
      }, 200);
    };
    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=lyrshopTranslateInit";
    script.async = true;
    script.onerror = () => console.warn("Translation is unavailable right now; showing English.");
    document.head.appendChild(script);
  }

  // ── Pickers ────────────────────────────────────────────────────────────────
  function displayName(type, code) {
    try {
      // Each language is listed in its own language, e.g. "español", "हिन्दी".
      return new Intl.DisplayNames([code], { type }).of(code) || code;
    } catch {
      return code;
    }
  }

  function currencyName(code) {
    try {
      return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code;
    } catch {
      return code;
    }
  }

  function renderPickers() {
    const language = activeLanguage();
    const currency = activeCurrency();
    const currencies = Object.keys(locale.rates || { USD: 1 }).sort();
    document.querySelectorAll("[data-locale-picker]").forEach((slot) => {
      slot.classList.add("locale-picker");
      slot.setAttribute("translate", "no");
      slot.innerHTML = `
        <label class="locale-select">
          <span aria-hidden="true">&#127760;</span>
          <span class="visually-hidden">Language</span>
          <select data-locale-language aria-label="Language">
            ${LANGUAGES.map((code) => `<option value="${code}" ${code === language ? "selected" : ""}>${displayName("language", code)}</option>`).join("")}
          </select>
        </label>
        <label class="locale-select">
          <span class="visually-hidden">Currency</span>
          <select data-locale-currency aria-label="Currency">
            ${currencies.map((code) => `<option value="${code}" ${code === currency ? "selected" : ""}>${code} · ${currencyName(code)}</option>`).join("")}
          </select>
        </label>`;
    });
  }

  document.addEventListener("change", (event) => {
    const languageSelect = event.target.closest("[data-locale-language]");
    if (languageSelect) {
      storage.set(LANGUAGE_KEY, languageSelect.value);
      setTranslateCookie(languageSelect.value);
      window.location.reload();
      return;
    }
    const currencySelect = event.target.closest("[data-locale-currency]");
    if (currencySelect) {
      storage.set(CURRENCY_KEY, currencySelect.value);
      notify();
    }
  });

  applyUrlChoices();

  window.LyrLocale = {
    formatPrice,
    formatUsd,
    currency: activeCurrency,
    isLocalCurrency: () => activeCurrency() !== "USD",
    country: () => locale.country,
    onChange(listener) { listeners.push(listener); },
  };
  window.formatPrice = formatPrice;

  // Links can carry ?lang=de and ?currency=EUR, e.g. for sharing or testing; they are remembered like a picker choice.
  function applyUrlChoices() {
    const params = new URLSearchParams(window.location.search);
    const language = params.get("lang");
    const currency = (params.get("currency") || "").toUpperCase();
    if (language && LANGUAGES.includes(language)) storage.set(LANGUAGE_KEY, language);
    if (/^[A-Z]{3}$/.test(currency)) storage.set(CURRENCY_KEY, currency);
  }

  function start() {
    renderPickers();
    startTranslation();
    loadLocale();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
