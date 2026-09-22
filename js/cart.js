/* =====================================================================
   PINK WORLD — SHOPPING CART & CHECKOUT LOGIC
   ===================================================================== */

const CART_KEY = "pinkworld_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, size, qty) {
  qty = qty || 1;
  const product = PRODUCTS.find(p => p.id === productId);
  const stock = product ? getSizeStock(product, size) : Infinity;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId && item.size === size);
  const currentQtyInCart = existing ? existing.qty : 0;
  const allowedQty = Math.max(0, Math.min(qty, stock - currentQtyInCart));

  if (allowedQty <= 0) {
    alert("Sorry, this size is sold out (or you already have the maximum available quantity in your cart).");
    return false;
  }

  if (existing) { existing.qty += allowedQty; }
  else { cart.push({ id: productId, size: size, qty: allowedQty }); }
  saveCart(cart);

  if (allowedQty < qty) {
    alert(`Only ${allowedQty} more of this size were available, so we've added ${allowedQty} to your cart.`);
  }
  return true;
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (qty <= 0) { cart.splice(index, 1); saveCart(cart); return; }

  const item = cart[index];
  const product = PRODUCTS.find(p => p.id === item.id);
  const stock = product ? getSizeStock(product, item.size) : Infinity;
  if (qty > stock) {
    alert(`Only ${stock} of this size are in stock.`);
    qty = stock;
  }
  cart[index].qty = qty;
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartTotalItems() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotalPrice() {
  const cart = getCart();
  let total = 0;
  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (product) total += product.price * item.qty;
  });
  return total;
}

function cartShippingCost() {
  const total = cartTotalPrice();
  return total >= STORE_CONFIG.freeShippingThreshold ? 0 : 59;
}

function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-badge");
  const count = cartTotalItems();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? "inline-flex" : "none";
  });
}

function buildCartLineItems() {
  return getCart().map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return null;
    return { id: product.id, name: product.name, size: item.size, qty: item.qty, price: product.price };
  }).filter(Boolean);
}

function buildOrderMessage(customerName, customerPhone, customerAddress, branch, paymentId) {
  const cart = getCart();
  let message = `Hello ${STORE_CONFIG.name}! I would like to place an order:\n\n`;
  let total = 0;
  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return;
    const lineTotal = product.price * item.qty;
    total += lineTotal;
    message += `• ${product.name} (Size: ${item.size}) x${item.qty} — ${STORE_CONFIG.currency}${lineTotal}\n`;
  });
  const shipping = cartShippingCost();
  message += `\nSubtotal: ${STORE_CONFIG.currency}${total}`;
  message += `\nShipping: ${shipping === 0 ? "FREE" : STORE_CONFIG.currency + shipping}`;
  message += `\nTotal: ${STORE_CONFIG.currency}${total + shipping}\n`;
  if (customerName) message += `\nName: ${customerName}`;
  if (customerPhone) message += `\nPhone: ${customerPhone}`;
  if (customerAddress) message += `\nAddress: ${customerAddress}`;
  if (branch) message += `\nPreferred Branch: ${branch}`;
  if (paymentId) message += `\n\nPAID ONLINE — Razorpay Payment ID: ${paymentId}`;
  return message;
}

async function checkoutViaWhatsApp(customerName, customerPhone, customerAddress, branch, paymentId) {
  const cart = getCart();
  if (cart.length === 0) { alert("Your cart is empty. Please add some products first."); return; }

  const total = cartTotalPrice();
  const shipping = cartShippingCost();
  const lineItems = buildCartLineItems();

  if (typeof saveOrderIfLoggedIn === "function") {
    try {
      await saveOrderIfLoggedIn({
        customerName, customerPhone, customerAddress, branch, paymentId,
        items: lineItems, subtotal: total, shipping, total: total + shipping
      });
    } catch (e) { console.warn("Could not save order to account:", e); }
  }

  if (typeof decrementStockForOrder === "function") {
    try { await decrementStockForOrder(lineItems); }
    catch (e) { console.warn("Could not update stock after order:", e); }
  }

  if (typeof sendOrderNotificationEmail === "function") {
    try {
      await sendOrderNotificationEmail({
        customerName, customerPhone, customerAddress, branch, paymentId,
        items: lineItems, total: total + shipping
      });
    } catch (e) { console.warn("Order email notification failed:", e); }
  }

  const message = buildOrderMessage(customerName, customerPhone, customerAddress, branch, paymentId);
  const url = `https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function payOnlineWithRazorpay(customerName, customerPhone, customerAddress, branch) {
  const cart = getCart();
  if (cart.length === 0) { alert("Your cart is empty. Please add some products first."); return; }

  if (!STORE_CONFIG.razorpayEnabled || !STORE_CONFIG.razorpayKeyId) {
    alert("Online payment isn't set up yet.\n\nTo enable it: open admin.html > Store Settings, add your real Razorpay Key ID, and switch on online payments.\n\nFor now, please use 'Send Order via WhatsApp' to complete your order.");
    return;
  }
  if (typeof Razorpay === "undefined") {
    alert("Payment system could not load. Please check your internet connection and try again, or use 'Send Order via WhatsApp'.");
    return;
  }

  const total = cartTotalPrice();
  const shipping = cartShippingCost();
  const amountPaise = Math.round((total + shipping) * 100);

  const options = {
    key: STORE_CONFIG.razorpayKeyId,
    amount: amountPaise,
    currency: "INR",
    name: STORE_CONFIG.name,
    description: "Order Payment",
    prefill: { name: customerName || "", contact: customerPhone || "" },
    notes: { address: customerAddress || "", branch: branch || "" },
    theme: { color: "#c9436f" },
    handler: function (response) {
      clearCart();
      alert("Payment successful!\n\nPayment ID: " + response.razorpay_payment_id + "\n\nWe'll now open WhatsApp so you can send your order details for confirmation.");
      checkoutViaWhatsApp(customerName, customerPhone, customerAddress, branch, response.razorpay_payment_id);
    },
    modal: { ondismiss: function () { console.log("Payment popup closed by user."); } }
  };

  const rzp = new Razorpay(options);
  rzp.on("payment.failed", function (response) {
    alert("Payment failed: " + (response.error && response.error.description ? response.error.description : "Please try again or use WhatsApp checkout."));
  });
  rzp.open();
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
