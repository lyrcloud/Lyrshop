const user = getCurrentUser();

if (!user) {
  window.location.href = "auth.html";
} else {
  const orders = getOrdersForUser(user.email);
  document.getElementById("dashboard-title").textContent = `Welcome, ${user.name}`;
  document.getElementById("dashboard-email").textContent = user.email;
  document.getElementById("dashboard-order-count").textContent = orders.length;
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-provider").textContent = user.provider;

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
