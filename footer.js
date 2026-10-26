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
