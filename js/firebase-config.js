/* =====================================================================
   PINK WORLD — CUSTOMER ACCOUNTS & LIVE DATA CONFIGURATION (Firebase)
   -----------------------------------------------------------------
   ACCOUNTS_ENABLED — customer login (OTP), wishlists, saved cart,
   order history + tracking, and the Store Manager's login gate all
   depend on this.

   PRODUCTS_SYNC_ENABLED — your product catalog, categories, and stock
   levels live in Firestore. Editing a product in admin.html updates
   your live site within seconds — no more downloading or re-uploading
   products.js.

   >>> BEFORE THIS WORKS, YOU MUST STILL DO THESE ONE-TIME STEPS <<<
   1. Firebase Console > Build > Storage > Get Started (enables photo uploads)
   2. Firebase Console > Firestore Database > Rules > paste the rules
      given to you in chat > Publish
   3. Firebase Console > Storage > Rules > paste the storage rules
      given to you in chat > Publish
   4. Open admin.html, log in with your admin number, and click
      "Migrate Current Catalog to Firestore" (only needs doing once)

   Until steps 1-4 are done, your site keeps working perfectly using
   the existing products.js file as a safe fallback — nothing breaks.
   ===================================================================== */

const ACCOUNTS_ENABLED = true;
const PRODUCTS_SYNC_ENABLED = true;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCh8z_9x3NyoPJiYAPk_I3veQ6RjG44ED4",
  authDomain: "pink-world-store.firebaseapp.com",
  projectId: "pink-world-store",
  storageBucket: "pink-world-store.firebasestorage.app",
  messagingSenderId: "121284750877",
  appId: "1:121284750877:web:f0048c30e5da4c0585e0f4"
};
