// Sizes, units and colors for shoppers in every country. Loaded before product.js.
// - Shoe sizes listed in EU numbers (most supplier listings) are shown in the shopper's own system (US, UK, JP cm, ...).
// - Ring sizes, letter clothing sizes and measurements get conversion tables in the size guide.
// - Lengths, volumes and weights are shown in inches/fl oz/lb as well for countries that use them.
// - Color names, including supplier names like "Wine red" or "ArmyGreen", become swatches.
// All conversions are standard approximations; the size guide says so.
const LyrSizing = (() => {
  const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM", "PR", "GU", "VI", "AS", "MP", "UM"]);
  const US_SHOE_COUNTRIES = new Set(["US", "CA", "PR", "GU", "VI", "AS", "MP", "PH"]);
  const UK_SHOE_COUNTRIES = new Set(["GB", "IE", "AU", "NZ", "IN", "PK", "BD", "LK", "ZA", "SG", "MY", "HK", "NG", "GH", "KE", "UG", "TZ"]);
  const CM_SHOE_COUNTRIES = new Set(["JP", "MX", "KR", "TW"]);

  // EU shoe size -> [US men, US women, UK, foot length cm]. Adult sizes; brands vary by about half a size.
  const SHOES = {
    35: [3.5, 5, 2.5, 22], 36: [4.5, 6, 3.5, 22.5], 37: [5, 6.5, 4, 23.5], 38: [6, 7.5, 5, 24], 39: [6.5, 8.5, 5.5, 24.5],
    40: [7, 9, 6, 25], 41: [8, 9.5, 7, 26], 42: [8.5, 10.5, 7.5, 26.5], 43: [9.5, 11, 8.5, 27.5], 44: [10, 12, 9.5, 28],
    45: [11, 12.5, 10.5, 28.5], 46: [12, 13.5, 11, 29.5], 47: [13, 14, 12, 30], 48: [14, 15, 13, 31],
  };
  // US ring size -> [UK, EU (inner circumference mm), JP, inner diameter mm].
  const RINGS = {
    4: ["H", 46.5, 7, 14.9], 5: ["J½", 49, 9, 15.7], 6: ["L½", 51.5, 12, 16.5], 7: ["N½", 54, 14, 17.3],
    8: ["P½", 57, 16, 18.1], 9: ["R½", 59.5, 18, 19], 10: ["T½", 62, 20, 19.8], 11: ["V½", 64.5, 23, 20.6],
    12: ["X½", 67, 25, 21.4], 13: ["Z½", 70, 27, 22.2],
  };
  // Letter size -> [chest/bust cm range, US women, UK women, EU women, EU men]. Western fit.
  const LETTERS = {
    XXS: ["76-80", "00", "4", "30", "40"], XS: ["80-84", "0-2", "4-6", "32-34", "42"], S: ["84-90", "4-6", "8-10", "36-38", "44-46"],
    M: ["90-98", "8-10", "12-14", "40-42", "48-50"], L: ["98-106", "12-14", "16-18", "44-46", "52-54"],
    XL: ["106-114", "16-18", "20-22", "48-50", "56-58"], "2XL": ["114-122", "20-22", "24-26", "52-54", "60-62"],
    "3XL": ["122-130", "24-26", "28-30", "56-58", "64-66"], "4XL": ["130-138", "28-30", "32-34", "60-62", "68-70"],
    "5XL": ["138-146", "32", "36", "64", "72"], "6XL": ["146-154", "34", "38", "66", "74"],
  };
  const LETTER_ALIASES = { XXL: "2XL", XXXL: "3XL", XXXXL: "4XL", XXXXXL: "5XL" };

  const country = () => (window.LyrLocale?.country?.() || "").toUpperCase();
  const usesImperial = () => IMPERIAL_COUNTRIES.has(country());
  const round = (value, step = 0.5) => Math.round(value / step) * step;
  const trim = (value) => String(Number(value.toFixed(1)));

  function letterSize(token) {
    const upper = String(token).toUpperCase().replace(/\.$/, "");
    const size = LETTER_ALIASES[upper] || upper;
    return LETTERS[size] ? size : null;
  }

  // The parts of an option value, e.g. "Wine red-3XL" -> ["Wine red", "3XL"], "Black 2pcs" -> ["Black 2pcs"].
  const parts = (value) => String(value).split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);

  function shoeSize(part, optionName) {
    const match = String(part).match(/^(?:EU|EUR)?\s*(\d{2}(?:\.5)?)$/i);
    const size = match && Number(match[1]);
    return size && size >= 35 && size <= 48 && /size|shoe|码/i.test(optionName) ? Math.floor(size) : null;
  }

  function ringSize(part, product) {
    const size = Number(part);
    return /jewel|ring/i.test(`${product.category} ${product.name}`) && /ring/i.test(product.name)
      && Number.isFinite(size) && size >= 4 && size <= 13 && Number.isInteger(size * 2) ? Math.floor(size) : null;
  }

  // "66cm" -> {value: 66, unit: "cm"}; also mm, in/inch, ml, l, kg, g, lb, oz.
  function measure(part) {
    const match = String(part).match(/^(\d+(?:\.\d+)?)\s*(cm|mm|m|in|inch|inches|"|ml|l|kg|g|lb|lbs|oz)$/i);
    return match ? { value: Number(match[1]), unit: match[2].toLowerCase() } : null;
  }

  // The same amount in the other unit system, or "" when the shopper already uses this unit.
  function convertMeasure({ value, unit }) {
    const imperial = usesImperial();
    if (imperial) {
      if (unit === "cm") return `${trim(value / 2.54)} in`;
      if (unit === "mm") return value >= 10 ? `${trim(value / 25.4)} in` : "";
      if (unit === "m") return `${trim(value * 3.281)} ft`;
      if (unit === "ml") return `${trim(value / 29.574)} fl oz`;
      if (unit === "l") return `${trim(value * 33.814)} fl oz`;
      if (unit === "kg") return `${trim(value * 2.2046)} lb`;
      if (unit === "g") return value >= 28 ? `${trim(value / 28.35)} oz` : "";
      return "";
    }
    if (["in", "inch", "inches", '"'].includes(unit)) return `${trim(value * 2.54)} cm`;
    if (["lb", "lbs"].includes(unit)) return `${trim(value * 0.4536)} kg`;
    if (unit === "oz") return `${trim(value * 28.35)} g`;
    return "";
  }

  function shoeLabel(eu) {
    const [men, women, uk, cm] = SHOES[eu];
    const code = country();
    if (US_SHOE_COUNTRIES.has(code)) return `US M ${men} · W ${women}`;
    if (UK_SHOE_COUNTRIES.has(code)) return `UK ${uk}`;
    if (code === "KR") return `${cm * 10} mm`;
    if (CM_SHOE_COUNTRIES.has(code)) return `${cm} cm`;
    if (code === "BR") return `BR ${eu - 2}`;
    return "";
  }

  // A short note under an option value in the shopper's own system, e.g. "US M 8.5 · W 10.5" or "26 in".
  function altLabel(value, option, product) {
    const notes = [];
    for (const part of parts(value)) {
      const shoe = shoeSize(part, option.name);
      if (shoe) notes.push(shoeLabel(shoe));
      const ring = ringSize(part, product);
      if (ring) notes.push(usesImperial() ? "" : `UK ${RINGS[ring][0]} · EU ${RINGS[ring][1]}`);
      const amount = measure(part.replace(/^[A-Za-z]{1,3}(?=\d)/, ""));
      if (amount) notes.push(convertMeasure(amount));
    }
    return notes.filter(Boolean).join(" · ");
  }

  // Which conversion tables the size guide should show for this product.
  function kinds(product) {
    const found = { shoes: new Set(), rings: new Set(), letters: new Set() };
    for (const option of product.options || []) {
      for (const value of option.values || []) {
        for (const part of parts(value)) {
          const shoe = shoeSize(part, option.name);
          if (shoe) found.shoes.add(shoe);
          const ring = ringSize(part, product);
          if (ring) found.rings.add(ring);
          const letter = letterSize(part);
          if (letter && (/size/i.test(option.name) || option.name === "Option")) found.letters.add(letter);
        }
      }
    }
    return found;
  }

  function hasGuide(product) {
    const found = kinds(product);
    return found.shoes.size + found.rings.size + found.letters.size > 0;
  }

  const byOrder = (keys, order) => [...keys].sort((a, b) => order.indexOf(String(a)) - order.indexOf(String(b)));

  function chestRange(cmRange, unit) {
    if (unit === "cm") return `${cmRange} cm`;
    return `${cmRange.split("-").map((cm) => Math.round(Number(cm) / 2.54)).join("-")} in`;
  }

  // The size guide's tables as HTML; unit is "cm" or "in".
  function guideHtml(product, unit) {
    const found = kinds(product);
    const sections = [];
    if (found.letters.size) {
      const sizes = byOrder(found.letters, Object.keys(LETTERS));
      sections.push(`
        <h3>Clothing</h3>
        <div class="size-table-wrap"><table class="size-table">
          <thead><tr><th>Size</th><th>Chest / bust</th><th>US women</th><th>UK women</th><th>EU women</th><th>EU men</th></tr></thead>
          <tbody>${sizes.map((size) => {
            const [chest, usW, ukW, euW, euM] = LETTERS[size];
            return `<tr><th>${size}</th><td>${chestRange(chest, unit)}</td><td>${usW}</td><td>${ukW}</td><td>${euW}</td><td>${euM}</td></tr>`;
          }).join("")}</tbody>
        </table></div>`);
    }
    if (found.shoes.size) {
      const sizes = [...found.shoes].sort((a, b) => a - b);
      sections.push(`
        <h3>Shoes</h3>
        <div class="size-table-wrap"><table class="size-table">
          <thead><tr><th>EU / CN</th><th>US men</th><th>US women</th><th>UK</th><th>Foot length</th><th>JP / KR</th><th>BR</th></tr></thead>
          <tbody>${sizes.map((eu) => {
            const [men, women, uk, cm] = SHOES[eu];
            const foot = unit === "cm" ? `${cm} cm` : `${trim(cm / 2.54)} in`;
            return `<tr><th>${eu}</th><td>${men}</td><td>${women}</td><td>${uk}</td><td>${foot}</td><td>${cm} cm / ${cm * 10} mm</td><td>${eu - 2}</td></tr>`;
          }).join("")}</tbody>
        </table></div>
        <p class="size-guide-tip">Measure your foot from heel to longest toe and pick the size whose foot length matches or is just above it.</p>`);
    }
    if (found.rings.size) {
      const sizes = [...found.rings].sort((a, b) => a - b);
      sections.push(`
        <h3>Rings</h3>
        <div class="size-table-wrap"><table class="size-table">
          <thead><tr><th>US / CA</th><th>UK / AU</th><th>EU / FR</th><th>JP / CN</th><th>Inner diameter</th></tr></thead>
          <tbody>${sizes.map((us) => {
            const [uk, eu, jp, diameter] = RINGS[us];
            const across = unit === "cm" ? `${diameter} mm` : `${trim(diameter / 25.4)} in`;
            return `<tr><th>${us}</th><td>${uk}</td><td>${eu}</td><td>${jp}</td><td>${across}</td></tr>`;
          }).join("")}</tbody>
        </table></div>`);
    }
    return sections.join("");
  }

  // Supplier listings shipped from China or elsewhere in East Asia usually follow Asian sizing.
  function runsSmall(product) {
    const from = String(product.location?.country || "").toUpperCase();
    return ["CN", "HK", "TW", "KR", "JP", "VN", "TH", "ID", "MY"].includes(from) && kinds(product).letters.size > 0;
  }

  // ── Colors ────────────────────────────────────────────────────────────────────
  const COLORS = {
    "wine red": "#722f37", "rose red": "#c21e56", "rose gold": "#b76e79", "brick red": "#a23c2b", "dark red": "#8b0000",
    "lake blue": "#2a7ab0", "navy blue": "#1f2a44", "sky blue": "#87ceeb", "royal blue": "#4169e1", "tibetan blue": "#3b5b92",
    "haze blue": "#7d95b8", "light blue": "#a7c7e7", "dark blue": "#1f3a93", "purplish blue": "#5b5bd6", "ice blue": "#cfe8f3",
    "army green": "#4b5320", "dark green": "#1b4d2e", "light green": "#90ee90", "fluorescent green": "#39ff14",
    "mint green": "#98ff98", "olive green": "#708238", "grass green": "#4caf50", "light pink": "#ffc0cb", "dark pink": "#e75480",
    "light purple": "#c8a2c8", "dark purple": "#4b2a6a", "dark gray": "#555555", "dark grey": "#555555",
    "light gray": "#d3d3d3", "light grey": "#d3d3d3", "lemon yellow": "#fff44f", "bean paste": "#9b6f6a",
    "creamy white": "#fffdd0", "off white": "#f8f4e3", "milky white": "#fdfbf3", "dark black": "#111111", "gun black": "#2a2a2d",
    "caramel colour": "#a5652b", "caramel color": "#a5652b", "sand color": "#c2b280", "wood color": "#a1662f",
    "black": "#111111", "white": "#ffffff", "red": "#d62828", "blue": "#2563eb", "green": "#2e9e44", "yellow": "#f5d000",
    "orange": "#f57c00", "pink": "#f4a6c1", "purple": "#7e3fbf", "violet": "#8f00ff", "brown": "#7b4a2a", "grey": "#8a8a8a",
    "gray": "#8a8a8a", "silver": "#c0c0c0", "gold": "#d4af37", "golden": "#d4af37", "platinum": "#e5e4e2", "khaki": "#c3b091",
    "coffee": "#6f4e37", "camel": "#c19a6b", "caramel": "#a5652b", "apricot": "#fbceb1", "beige": "#e8dcc4", "nude": "#e3bc9a",
    "skin": "#e8beac", "champagne": "#f7e7ce", "tangerine": "#f28500", "navy": "#1f2a44", "wine": "#722f37",
    "burgundy": "#800020", "maroon": "#800000", "mustard": "#e1ad01", "lavender": "#b9a3e3", "fuchsia": "#ff00a8",
    "coral": "#ff7f50", "turquoise": "#30d5c8", "teal": "#008080", "ivory": "#fffff0", "cream": "#fffdd0", "olive": "#708238",
    "rose": "#e8738a", "obsidian": "#1b1b1f", "copper": "#b87333", "bronze": "#a97142", "mint": "#98ff98", "cyan": "#00bcd4",
    "sand": "#c2b280", "wood": "#a1662f", "tan": "#d2b48c", "taupe": "#8b8589", "charcoal": "#36454f", "lilac": "#c8a2c8",
    "peach": "#ffcba4", "salmon": "#fa8072", "jade": "#00a86b", "emerald": "#50c878", "aqua": "#00ffff", "indigo": "#4b0082",
  };
  const MULTI = /\b(multi-?colou?r|colou?rful|mix(ed)? colou?rs?|random|rainbow|assorted)\b/i;
  const CLEAR = /\b(transparent|clear)\b/i;
  const COLOR_NAMES = Object.keys(COLORS).sort((a, b) => b.length - a.length);

  // Swatch CSS for an option value, or "" when it names no color. "Black with green" -> a split swatch.
  function swatch(value) {
    const text = ` ${String(value).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `;
    if (MULTI.test(text)) return "background:conic-gradient(#e53238,#f5af02,#86b817,#0064d2,#7e3fbf,#e53238)";
    if (CLEAR.test(text)) return "background:repeating-conic-gradient(#e5e7eb 0 25%,#ffffff 0 50%) 0 0/8px 8px";
    const found = [];
    let rest = text;
    for (const name of COLOR_NAMES) {
      const at = rest.indexOf(` ${name} `);
      if (at === -1) continue;
      found.push([at, COLORS[name]]);
      rest = rest.slice(0, at) + " ".repeat(name.length + 1) + rest.slice(at + name.length + 1);
    }
    // Run-together names such as "Lemonyellow": match multi-word colors written without spaces.
    if (!found.length) {
      const compact = text.replace(/\s+/g, "");
      const name = COLOR_NAMES.find((color) => color.includes(" ") && compact.includes(color.replace(/\s+/g, "")));
      if (name) found.push([0, COLORS[name]]);
    }
    found.sort((a, b) => a[0] - b[0]);
    const colors = [...new Set(found.map(([, color]) => color))].slice(0, 2);
    if (!colors.length) {
      const css = String(value).toLowerCase().replace(/\s+/g, "");
      return window.CSS?.supports?.("color", css) ? `background:${css}` : "";
    }
    return colors.length === 2 ? `background:linear-gradient(135deg,${colors[0]} 50%,${colors[1]} 50%)` : `background:${colors[0]}`;
  }

  // An option shows swatches when it is a color option or when most of its values name a color.
  function isColorOption(option) {
    if (option.type === "color") return true;
    const values = option.values || [];
    const named = values.filter((value) => swatch(parts(value)[0])).length;
    return /colou?r/i.test(option.name) ? named > 0 : named >= Math.ceil(values.length * 0.6);
  }

  // Measurement rows like "Chest: 40 in" with the other unit added.
  function measurementText(text) {
    return String(text).replace(/(\d+(?:\.\d+)?)\s*(cm|mm|in|inch|inches|ml|kg|lb|lbs|oz|g)\b/gi, (whole, number, unit) => {
      const other = convertMeasure({ value: Number(number), unit: unit.toLowerCase() });
      return other ? `${whole} (${other})` : whole;
    });
  }

  // Size values in size order (S, M, L... or 36, 37, 38...) when every value is a size; otherwise the seller's order.
  function sortedValues(option) {
    const values = option.values || [];
    const letterOrder = Object.keys(LETTERS);
    const letters = values.map((value) => letterSize(value));
    if (letters.every(Boolean)) return [...values].sort((a, b) => letterOrder.indexOf(letterSize(a)) - letterOrder.indexOf(letterSize(b)));
    const numbers = values.map((value) => String(value).match(/^(\d+(?:\.\d+)?)\s*(cm|mm|ml|in)?$/i));
    if (/size|height|length/i.test(option.name) && numbers.every(Boolean)) {
      return [...values].sort((a, b) => parseFloat(a) - parseFloat(b));
    }
    return values;
  }

  return { altLabel, sortedValues, hasGuide, guideHtml, runsSmall, swatch, isColorOption, parts, measurementText, usesImperial };
})();
