/* =====================================================================
   PINK WORLD — SECURE PAYMENT VERIFICATION (Firebase Cloud Functions)
   -----------------------------------------------------------------
   Your Cloud Functions are deployed! This turns on independent,
   server-side confirmation of every Razorpay payment before the site
   ever shows "Payment Successful" — fixing the false-success bug.

   NOTE: Cloud Functions v2 (the version we deployed) gives EACH
   function its own unique URL via Cloud Run, rather than one shared
   base URL — so both full URLs are stored separately below.
   ===================================================================== */

const PAYMENT_VERIFICATION_ENABLED = true;

const CREATE_ORDER_URL = "https://createrazorpayorder-ikxis4v7wa-uc.a.run.app";
const VERIFY_PAYMENT_URL = "https://verifyrazorpaypayment-ikxis4v7wa-uc.a.run.app";
