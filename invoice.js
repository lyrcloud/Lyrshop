// Invoice of an order placed on net terms (a business account): printable, and payable by card until it's settled.
const invoiceId = new URLSearchParams(window.location.search).get("id") || "";
const invoiceSheet = document.getElementById("invoice-sheet");
const invoiceMessage = document.getElementById("invoice-message");

function invoiceEscape(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// Invoices are in US dollars whatever currency the shopper browses in.
function usd(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function invoiceDate(seconds) {
  return seconds ? new Date(seconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
}

function renderInvoice(invoice) {
  const lines = new Map();
  for (const item of invoice.items || []) {
    const key = `${item.id}|${item.variant || ""}|${item.price}`;
    const line = lines.get(key) || { ...item, quantity: 0 };
    line.quantity += 1;
    lines.set(key, line);
  }
  const address = invoice.shipping_address || {};
  const billTo = [invoice.company, address.name, address.address, address.address2,
    [address.city, address.province, address.zip].filter(Boolean).join(" "), address.country_code, address.email].filter(Boolean);
  const status = invoice.payment_status === "invoiced"
    ? invoice.overdue ? `<span class="invoice-status is-overdue">Overdue</span>` : `<span class="invoice-status">Due ${invoiceEscape(invoiceDate(invoice.invoice_due_at))}</span>`
    : invoice.payment_status === "paid" ? `<span class="invoice-status is-paid">Paid ${invoiceEscape(invoiceDate(invoice.paid_at))}</span>`
      : `<span class="invoice-status">${invoiceEscape(invoice.payment_status)}</span>`;
  const totals = [
    ["Items", usd(invoice.subtotal)],
    Number(invoice.discount_total) > 0 && ["Discount", `−${usd(invoice.discount_total)}`],
    ["Shipping", usd(invoice.shipping_total)],
    ["Sales tax", invoice.tax_exempt ? "Exempt" : usd(invoice.tax_total)],
    ["Total", usd(invoice.total)],
    Number(invoice.gift_card_applied) > 0 && ["Gift card", `−${usd(invoice.gift_card_applied)}`],
    Number(invoice.points_value) > 0 && ["Points", `−${usd(invoice.points_value)}`],
  ].filter(Boolean);
  invoiceSheet.innerHTML = `
    <header class="invoice-head">
      <div>
        <h1>Invoice</h1>
        <p class="invoice-number">${invoiceEscape(invoice.invoice_number)}</p>
        ${status}
      </div>
      <div class="invoice-from">
        <strong>${invoiceEscape(invoice.from?.name)}</strong>
        <span>${invoiceEscape(invoice.from?.email)}</span>
        <span>${invoiceEscape(invoice.from?.website)}</span>
      </div>
    </header>
    <dl class="invoice-meta">
      <div><dt>Bill to</dt><dd>${billTo.map(invoiceEscape).join("<br />")}</dd></div>
      <div><dt>Issued</dt><dd>${invoiceEscape(invoiceDate(invoice.created_at))}</dd></div>
      <div><dt>Due</dt><dd>${invoiceEscape(invoiceDate(invoice.invoice_due_at))}</dd></div>
      <div><dt>Order</dt><dd>${invoiceEscape(String(invoice.id).slice(0, 8))}${invoice.quote_id ? `<br />Quote ${invoiceEscape(invoice.quote_id.slice(0, 6).toUpperCase())}` : ""}</dd></div>
    </dl>
    <div class="invoice-table-wrap">
      <table class="invoice-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
        <tbody>${[...lines.values()].map((line) => `
          <tr><td>${invoiceEscape(line.name)}${line.variant ? `<br /><small>${invoiceEscape(line.variant)}</small>` : ""}</td>
          <td>${line.quantity}</td><td>${usd(line.price)}</td><td>${usd(line.price * line.quantity)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <dl class="invoice-totals">
      ${totals.map(([label, value]) => `<div><dt>${invoiceEscape(label)}</dt><dd>${invoiceEscape(value)}</dd></div>`).join("")}
      <div class="invoice-due"><dt>Amount due</dt><dd>${invoice.payment_status === "paid" ? usd(0) : usd(invoice.amount_due)}</dd></div>
    </dl>
    <p class="invoice-terms">Payment terms: net 30. Pay by card on lyrshop.com, or by bank transfer quoting ${invoiceEscape(invoice.invoice_number)} (ask ${invoiceEscape(invoice.from?.email)} for bank details).</p>`;
  document.title = `Lyrshop Invoice ${invoice.invoice_number}`;
  document.getElementById("invoice-pay").hidden = invoice.payment_status !== "invoiced" || !invoice.mine;
}

async function loadInvoice() {
  if (!getCurrentUser()) {
    localStorage.setItem("lyrshopAuthReturnTo", `invoice.html?id=${encodeURIComponent(invoiceId)}`);
    window.location.href = "auth.html";
    return;
  }
  try {
    const { invoice } = await authApi(`/orders/${encodeURIComponent(invoiceId)}/invoice`);
    renderInvoice(invoice);
  } catch (error) {
    invoiceSheet.innerHTML = `<p class="my-empty">${invoiceEscape(error.message || "Invoice not found.")}</p>`;
  }
}

document.getElementById("invoice-print").addEventListener("click", () => window.print());
document.getElementById("invoice-pay").addEventListener("click", async (event) => {
  event.target.disabled = true;
  invoiceMessage.textContent = "Opening secure payment…";
  try {
    const reply = await authApi(`/orders/${encodeURIComponent(invoiceId)}/invoice/pay`, {
      method: "POST",
      body: { success_url: `${window.location.origin}/invoice.html?id=${encodeURIComponent(invoiceId)}`, cancel_url: window.location.href },
    });
    if (reply.stripe_configured && reply.checkout_url) window.location.href = reply.checkout_url;
    else invoiceMessage.textContent = reply.message || "Card payments aren't available right now.";
  } catch (error) {
    invoiceMessage.textContent = error.message;
  } finally {
    event.target.disabled = false;
  }
});

loadInvoice();
