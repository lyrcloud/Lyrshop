const user = getCurrentUser();

if (!user) {
  window.location.href = "auth.html";
} else {
  const orders = getOrdersForUser(getAccountId(user));
  document.getElementById("dashboard-title").textContent = `Welcome, ${user.name}`;
  document.getElementById("dashboard-email").textContent = getAccountContact(user);
  document.getElementById("dashboard-order-count").textContent = orders.length;
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = getAccountContact(user);
  document.getElementById("profile-provider").textContent = user.provider;
  const roleLabels = { superadmin: "Super admin", admin: "Admin", user: "Customer" };
  const showRole = (account) => {
    document.getElementById("profile-role").textContent = roleLabels[account.role] || "Customer";
  };
  showRole(user);
  // The role can change after sign-in (the super admin grants or removes admin access).
  refreshCurrentUser().then((fresh) => fresh && showRole(fresh));

  const orderList = document.getElementById("order-list");
  if (!orders.length) {
    orderList.innerHTML = "<p>No orders yet. Start shopping to build your order history.</p>";
  } else {
    orderList.innerHTML = orders.map((order) => {
      const date = new Date(order.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `
        <div class="order-item">
          <div>
            <strong>${order.items.length} item${order.items.length === 1 ? "" : "s"}</strong>
            <span>${date}</span>
            <span>${order.shipping_method || "Standard"} shipping</span>
            <span>${order.payment_gateway || order.payment_method || "LyrPay Secure"}</span>
          </div>
          <span>$${Number(order.total).toFixed(2)}</span>
        </div>
      `;
    }).join("");
  }

  document.getElementById("logout-button").addEventListener("click", () => {
    clearCurrentUser();
    window.location.href = "index.html";
  });
}
