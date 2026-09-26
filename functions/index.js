/* =====================================================================
   PINK WORLD — SECURE RAZORPAY CLOUD FUNCTIONS
   -----------------------------------------------------------------
   These two functions are the ONLY place your Razorpay Key SECRET
   should ever live. It's read from Firebase's Secret Manager (the
   current, recommended way to store secrets — replacing the older
   functions.config() system) — never hardcoded here, never in any
   file you upload to GitHub/Hostinger.

   1. createRazorpayOrder — called BEFORE the payment popup opens.
      Creates a real "Order" on Razorpay's servers so the payment can
      later be cryptographically tied back to it.

   2. verifyRazorpayPayment — called AFTER the customer completes
      payment in the popup. Recomputes the expected signature using
      HMAC-SHA256 and your Key Secret, and compares it against what
      Razorpay sent back. This is the step that actually PROVES the
      payment is genuine — nothing else in this whole system can be
      faked or spoofed by a customer's browser.
   ===================================================================== */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

// These pull their real values from Firebase Secret Manager (set via the
// `firebase functions:secrets:set` commands in README.md) — never from
// a file, never visible in your code or repo.
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

exports.createRazorpayOrder = onRequest(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
      const { amount, currency } = req.body || {};
      if (!amount || typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "A valid 'amount' (in paise) is required." });
        return;
      }

      const keyId = RAZORPAY_KEY_ID.value();
      const keySecret = RAZORPAY_KEY_SECRET.value();
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount, currency: currency || "INR" })
      });

      const data = await razorpayRes.json();
      if (!razorpayRes.ok) {
        console.error("Razorpay order creation failed:", data);
        res.status(502).json({ error: "Razorpay rejected the order request.", details: data });
        return;
      }

      res.status(200).json(data);
    } catch (e) {
      console.error("createRazorpayOrder error:", e);
      res.status(500).json({ error: "Internal error creating the order." });
    }
  }
);

exports.verifyRazorpayPayment = onRequest(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ verified: false, error: "Missing required fields." });
        return;
      }

      const keySecret = RAZORPAY_KEY_SECRET.value();
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const verified = expectedSignature === razorpay_signature;
      res.status(200).json({ verified });
    } catch (e) {
      console.error("verifyRazorpayPayment error:", e);
      res.status(500).json({ verified: false, error: "Internal error verifying the payment." });
    }
  }
);
