/* =====================================================================
   PINK WORLD — SHOPPING CART & CHECKOUT LOGIC
   -----------------------------------------------------------------
   PAYMENT SAFETY: payOnlineWithRazorpay() protects against the
   "shows success even when payment failed" bug in two ways:

   1. DOUBLE-INVOCATION GUARD — a flag (_razorpayInProgress) blocks a
      second Razorpay popup from opening while one is already active.

   2. SERVER-SIDE VERIFICATION (via the deployed Cloud Functions) —
      instead of trusting the browser's own report of "it worked", the
      site asks secure Firebase Cloud Functions to independently
      confirm with Razorpay's servers (using cryptographic signature
      verification with your Key Secret) that the payment truly went
      through. Only then does it show "Payment Successful", clear the
      cart, and save the order.
   ===================================================================== */

const CART_KEY = "pinkworld_cart";
const CART_SYNCED_FLAG_PREFIX = "pinkworld_cart_synced_";
let _razorpayInProgress = false;

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  pushCartToAccountIfLoggedIn(cart);
}

async function addToCart(productId, size, qty) {
  qty = qty || 1;
  const product = PRODUCTS.find(p => p.id === productId);
  const stock = product ? getSizeStock(product, size) : Infinity;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId && item.size === size);
  const currentQtyInCart = existing ? existing.qty : 0;
  const allowedQty = Math.max(0, Math.min(qty, stock - currentQtyInCart));

  if (allowedQty <= 0) {
    await showNotice("Sorry, this size is sold out (or you already have the maximum available quantity in your cart).");
    return false;
  }

  if (existing) { existing.qty += allowedQty; }
  else { cart.push({ id: productId, size: size, qty: allowedQty }); }
  saveCart(cart);

  if (allowedQty < qty) {
    await showNotice(`Only ${allowedQty} more of this size were available, so we've added ${allowedQty} to your cart.`);
  }
  return true;
}

async function updateCartQty(index, qty) {
  const cart = getCart();
  if (qty <= 0) { cart.splice(index, 1); saveCart(cart); return; }

  const item = cart[index];
  const product = PRODUCTS.find(p => p.id === item.id);
  const stock = product ? getSizeStock(product, item.size) : Infinity;
  if (qty > stock) {
    await showNotice(`Only ${stock} of this size are in stock.`);
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
  pushCartToAccountIfLoggedIn([]);
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

function pushCartToAccountIfLoggedIn(cart) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || !fbDb) return;
  fbDb.collection("users").doc(user.uid).set({ cartItems: cart }, { merge: true })
    .catch(e => console.warn("Could not save cart to account:", e));
}

async function pullCartFromAccountAndMerge(user) {
  if (!user || !fbDb) return;
  const flagKey = CART_SYNCED_FLAG_PREFIX + user.uid;
  const alreadyMergedThisSession = sessionStorage.getItem(flagKey);

  try {
    const ref = fbDb.collection("users").doc(user.uid);
    const snap = await ref.get();
    const serverCart = (snap.exists && Array.isArray(snap.data().cartItems)) ? snap.data().cartItems : [];
    const localCart = getCart();

    let merged;
    if (!alreadyMergedThisSession && localCart.length) {
      merged = serverCart.map(item => ({ ...item }));
      localCart.forEach(localItem => {
        const existing = merged.find(i => i.id === localItem.id && i.size === localItem.size);
        if (existing) existing.qty += localItem.qty;
        else merged.push({ ...localItem });
      });
    } else {
      merged = serverCart;
    }

    merged = merged
      .map(item => {
        const product = PRODUCTS.find(p => p.id === item.id);
        if (!product) return item;
        const stock = getSizeStock(product, item.size);
        return { ...item, qty: Math.min(item.qty, stock) };
      })
      .filter(item => item.qty > 0);

    localStorage.setItem(CART_KEY, JSON.stringify(merged));
    updateCartBadge();
    sessionStorage.setItem(flagKey, "1");

    await ref.set({ cartItems: merged }, { merge: true });

    if (typeof renderCartPage === "function") renderCartPage();
  } catch (e) {
    console.warn("Could not sync cart with account:", e);
  }
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
  if (cart.length === 0) { await showNotice("Your cart is empty. Please add some products first."); return; }

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

/* ---------------------------------------------------------------------
   SERVER-SIDE VERIFICATION HELPERS
   --------------------------------------------------------------------- */
function paymentVerificationConfigured() {
  return typeof PAYMENT_VERIFICATION_ENABLED !== "undefined" && PAYMENT_VERIFICATION_ENABLED &&
    typeof CREATE_ORDER_URL !== "undefined" && CREATE_ORDER_URL &&
    typeof VERIFY_PAYMENT_URL !== "undefined" && VERIFY_PAYMENT_URL;
}

async function createRazorpayOrderOnServer(amountPaise) {
  const res = await fetch(CREATE_ORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR" })
  });
  if (!res.ok) throw new Error("Could not create a secure order on the server.");
  return res.json();
}

async function verifyRazorpayPaymentOnServer(response) {
  try {
    const res = await fetch(VERIFY_PAYMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.verified;
  } catch (e) {
    console.warn("Payment verification request failed:", e);
    return false;
  }
}

/* ---------------------------------------------------------------------
   MAIN CHECKOUT FUNCTION
   --------------------------------------------------------------------- */
async function payOnlineWithRazorpay(customerName, customerPhone, customerAddress, branch) {
  const cart = getCart();
  if (cart.length === 0) { await showNotice("Your cart is empty. Please add some products first."); return; }

  if (!STORE_CONFIG.razorpayEnabled || !STORE_CONFIG.razorpayKeyId) {
    await showNotice("Online payment isn't set up yet.\n\nTo enable it: open admin.html > Store Settings, add your real Razorpay Key ID, and switch on online payments.\n\nFor now, please use 'Send Order via WhatsApp' to complete your order.");
    return;
  }
  if (typeof Razorpay === "undefined") {
    await showNotice("Payment system could not load. Please check your internet connection and try again, or use 'Send Order via WhatsApp'.");
    return;
  }
  if (_razorpayInProgress) {
    await showNotice("A payment is already in progress. Please wait for it to finish, or refresh the page and try again.");
    return;
  }

  const total = cartTotalPrice();
  const shipping = cartShippingCost();
  const amountPaise = Math.round((total + shipping) * 100);
  const verificationOn = paymentVerificationConfigured();

  _razorpayInProgress = true;

  let orderIdFromServer = null;
  if (verificationOn) {
    try {
      const orderData = await createRazorpayOrderOnServer(amountPaise);
      orderIdFromServer = orderData.id;
    } catch (e) {
      _razorpayInProgress = false;
      await showNotice("Couldn't start a secure payment session right now. Please check your connection and try again, or use 'Send Order via WhatsApp'.");
      return;
    }
  }

  const options = {
    key: STORE_CONFIG.razorpayKeyId,
    amount: amountPaise,
    currency: "INR",
    name: STORE_CONFIG.name,
    description: "Order Payment",
    prefill: { name: customerName || "", contact: customerPhone || "" },
    notes: { address: customerAddress || "", branch: branch || "" },
    theme: { color: "#96543f" },
    handler: async function (response) {
      try {
        if (verificationOn) {
          const verified = await verifyRazorpayPaymentOnServer(response);
          if (!verified) {
            await showNotice(
              "We couldn't independently verify this payment, so we have NOT marked your order as paid.\n\n" +
              "If money was deducted from your account, please contact us on WhatsApp right away with this Payment ID so we can confirm it manually:\n\n" +
              response.razorpay_payment_id
            );
            return;
          }
        }
        clearCart();
        await showNotice("Payment successful!\n\nPayment ID: " + response.razorpay_payment_id + "\n\nWe'll now open WhatsApp so you can send your order details for confirmation.");
        checkoutViaWhatsApp(customerName, customerPhone, customerAddress, branch, response.razorpay_payment_id);
      } finally {
        _razorpayInProgress = false;
      }
    },
    modal: {
      ondismiss: function () {
        _razorpayInProgress = false;
        console.log("Payment popup closed by user.");
      }
    }
  };
  if (orderIdFromServer) options.order_id = orderIdFromServer;

  const rzp = new Razorpay(options);
  rzp.on("payment.failed", async function (response) {
    _razorpayInProgress = false;
    await showNotice("Payment failed: " + (response.error && response.error.description ? response.error.description : "Please try again or use WhatsApp checkout."));
  });
  rzp.open();
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
