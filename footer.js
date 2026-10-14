// Site-wide footer, laid out like eBay's: link columns, then a copyright line. Fills every <footer data-site-footer>.
const FOOTER_COLUMNS = [
  {
    title: "Buy",
    links: [
      ["Registration", "auth.html"],
      ["Today's deals", "index.html?view=deals#product-list"],
      ["All brands", "index.html?view=brands#product-list"],
      ["Watchlist", "index.html?view=watchlist#product-list"],
      ["Cart", "cart.html"],
      ["Gift cards", "giftcards.html"],
    ],
  },
  {
    title: "Sell",
    links: [
      ["Start selling", "admin.html"],
      ["Seller dashboard", "admin.html"],
    ],
  },
  {
    title: "My Lyrshop",
    links: [
      ["Summary", "dashboard.html#summary"],
      ["Purchases", "dashboard.html#purchases"],
      ["Rewards & badges", "dashboard.html#rewards"],
      ["Affiliate program", "dashboard.html#affiliate"],
      ["Recently viewed", "dashboard.html#recently-viewed"],
      ["Account", "dashboard.html#account"],
    ],
  },
  {
    title: "Help & Contact",
    links: [
      ["Track an order", "dashboard.html#purchases"],
      ["Contact us", "mailto:support@lyrshop.com"],
      ["Sign in", "auth.html"],
    ],
  },
];

function renderSiteFooter(footer) {
  const columns = FOOTER_COLUMNS.map((column) => `
    <nav class="footer-column" aria-label="${column.title}">
      <h2>${column.title}</h2>
      <ul>${column.links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>
    </nav>`).join("");
  footer.classList.add("site-footer");
  footer.innerHTML = `
    <div class="footer-columns">${columns}</div>
    <div class="footer-legal">
      <p>Copyright &copy; ${new Date().getFullYear()} Lyrshop. All rights reserved. Powered by Lyrcloud.</p>
      <div data-locale-picker></div>
    </div>`;
}

document.querySelectorAll("footer[data-site-footer]").forEach(renderSiteFooter);
