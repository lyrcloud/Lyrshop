// Site-wide footer, compact like Lyrtrip's: each group's title with its links on one line, then the copyright.
// Fills every <footer data-site-footer>.
const FOOTER_GROUPS = [
  {
    title: "Shop",
    links: [
      ["Deals", "index.html?view=deals#product-list"],
      ["Brands", "brands.html"],
      ["Gift cards", "giftcards.html"],
      ["Groceries", "groceries.html"],
    ],
  },
  {
    title: "Sell",
    links: [
      ["Start selling", "admin.html"],
      ["Dropshipping API", "partners.html"],
    ],
  },
  {
    title: "My Lyrshop",
    links: [
      ["Purchases", "dashboard.html#purchases"],
      ["Rewards", "dashboard.html#rewards"],
      ["Affiliate", "dashboard.html#affiliate"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track an order", "dashboard.html#purchases"],
      ["Get the app", "app.html"],
      ["Contact us", "mailto:support@lyrshop.com"],
      ["Privacy", "privacy.html"],
      ["Delete account", "privacy.html#delete-account"],
    ],
  },
];

function renderSiteFooter(footer) {
  const groups = FOOTER_GROUPS.map((group) => `
    <div class="footer-group">
      <span class="footer-group-title">${group.title}</span>
      ${group.links.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
    </div>`).join("");
  footer.classList.add("site-footer");
  footer.innerHTML = `
    <div class="footer-inner">
      <nav class="footer-groups" aria-label="Footer">${groups}</nav>
      <div class="footer-legal">
        <p>&copy; ${new Date().getFullYear()} Lyrshop. All rights reserved.</p>
        <div data-locale-picker></div>
      </div>
    </div>`;
}

document.querySelectorAll("footer[data-site-footer]").forEach(renderSiteFooter);

// "Get the app" bar for shoppers on Android phone browsers (never inside the app itself, which tags its user agent
// LyrshopApp). Closing it hides it for 30 days.
const APP_BAR_KEY = "lyrshopAppBarClosed";
const APP_BAR_DAYS = 30;

function showAppBar() {
  const ua = navigator.userAgent;
  const inApp = /LyrshopApp/.test(ua);
  if (inApp) {
    document.querySelectorAll("[data-app-already]").forEach((el) => { el.hidden = false; });
    return;
  }
  if (!/Android/i.test(ua) || location.pathname.endsWith("/app.html")) return;
  try {
    const closed = Number(localStorage.getItem(APP_BAR_KEY) || 0);
    if (closed && Date.now() - closed < APP_BAR_DAYS * 86400000) return;
  } catch (error) { /* storage blocked: show the bar */ }

  const bar = document.createElement("div");
  bar.className = "app-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Lyrshop app");
  bar.innerHTML = `
    <button type="button" class="app-bar-close" aria-label="Close">&times;</button>
    <img src="icon-192.png" alt="" width="40" height="40" />
    <div class="app-bar-text"><strong>Lyrshop app</strong><span>Faster shopping on Android</span></div>
    <a class="app-bar-get" href="app.html">Get</a>`;
  bar.querySelector(".app-bar-close").addEventListener("click", () => {
    bar.remove();
    try { localStorage.setItem(APP_BAR_KEY, String(Date.now())); } catch (error) { /* ignore */ }
  });
  document.body.prepend(bar);
}

showAppBar();
