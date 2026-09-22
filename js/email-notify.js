/* =====================================================================
   PINK WORLD — EMAIL NOTIFICATION LOGIC (EmailJS)
   ===================================================================== */

let _emailjsInited = false;

function emailNotifyReady() {
  return typeof EMAILJS_ENABLED !== "undefined" && EMAILJS_ENABLED &&
    typeof emailjs !== "undefined" &&
    EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";
}

function initEmailNotify() {
  if (!emailNotifyReady()) return false;
  if (!_emailjsInited) {
    try {
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      _emailjsInited = true;
    } catch (e) {
      console.warn("EmailJS failed to initialize:", e);
      return false;
    }
  }
  return true;
}

function sendOrderNotificationEmail(details) {
  if (!initEmailNotify()) return Promise.resolve(false);
  const itemsText = (details.items || []).map(it =>
    `${it.name} (${it.size}) x${it.qty} — ₹${it.price * it.qty}`
  ).join("\n");

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
    to_email: NOTIFY_EMAIL_TO,
    customer_name: details.customerName || "",
    customer_phone: details.customerPhone || "",
    customer_address: details.customerAddress || "",
    branch: details.branch || "",
    items_text: itemsText,
    total: details.total,
    payment_method: details.paymentId ? "Online (Razorpay)" : "WhatsApp / Pay on delivery"
  }).catch(err => {
    console.warn("Order email notification failed to send:", err);
    return false;
  });
}

function sendContactNotificationEmail(fields) {
  if (!initEmailNotify()) return Promise.resolve(false);
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONTACT_TEMPLATE_ID, {
    to_email: NOTIFY_EMAIL_TO,
    customer_name: fields.name || "",
    customer_phone: fields.phone || "",
    message: fields.message || ""
  }).catch(err => {
    console.warn("Contact email notification failed to send:", err);
    return false;
  });
}
