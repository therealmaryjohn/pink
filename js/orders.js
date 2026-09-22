/* =====================================================================
   PINK WORLD — ORDER HISTORY, TRACKING & CONTACT INQUIRIES
   ===================================================================== */

const ORDER_STATUS_STEPS = ["Placed", "Confirmed", "Shipped", "Delivered"];

async function saveOrderIfLoggedIn(orderDetails) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || !fbDb) return null;

  const order = {
    uid: user.uid,
    phone: user.phoneNumber || orderDetails.customerPhone || "",
    customerName: orderDetails.customerName || "",
    address: orderDetails.customerAddress || "",
    branch: orderDetails.branch || "",
    items: orderDetails.items,
    subtotal: orderDetails.subtotal,
    shipping: orderDetails.shipping,
    total: orderDetails.total,
    paymentMethod: orderDetails.paymentId ? "Online (Razorpay)" : "WhatsApp / Pay on delivery",
    paymentId: orderDetails.paymentId || null,
    status: "Placed",
    trackingNumber: null,
    carrier: null,
    trackingUrl: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const ref = await fbDb.collection("orders").add(order);
  return ref.id;
}

async function getMyOrders() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || !fbDb) return [];

  const snap = await fbDb.collection("orders")
    .where("uid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderStatusStepper(status) {
  if (status === "Cancelled") {
    return `<div class="status-stepper"><span class="step-cancelled-badge">Order Cancelled</span></div>`;
  }
  const currentIdx = Math.max(0, ORDER_STATUS_STEPS.indexOf(status));
  let html = `<div class="status-stepper">`;
  ORDER_STATUS_STEPS.forEach((s, i) => {
    const doneClass = i <= currentIdx ? "done" : "";
    html += `<div class="step ${doneClass}"><div class="step-dot"></div><div class="step-label">${s}</div></div>`;
    if (i < ORDER_STATUS_STEPS.length - 1) {
      html += `<div class="step-line ${i < currentIdx ? "done" : ""}"></div>`;
    }
  });
  html += `</div>`;
  return html;
}

function renderTrackingBox(order) {
  if (!order.trackingNumber) return "";
  const carrierText = order.carrier ? ` via ${order.carrier}` : "";
  const linkHtml = order.trackingUrl
    ? `<a href="${order.trackingUrl}" target="_blank" class="btn btn-outline btn-sm" style="margin-left:8px;">Track Package</a>`
    : "";
  return `<div class="tracking-box"><strong>Tracking Number:</strong> ${order.trackingNumber}${carrierText}${linkHtml}</div>`;
}

async function saveInquiryIfConfigured(fields) {
  if (!(typeof firebaseReady === "function" && firebaseReady())) return null;
  if (!initFirebase()) return null;
  try {
    const doc = {
      name: fields.name || "",
      phone: fields.phone || "",
      message: fields.message || "",
      status: "New",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await fbDb.collection("inquiries").add(doc);
    return ref.id;
  } catch (e) {
    console.warn("Could not save inquiry:", e);
    return null;
  }
}
