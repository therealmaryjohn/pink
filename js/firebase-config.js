/* =====================================================================
   PINK WORLD — CUSTOMER ACCOUNTS & LIVE DATA CONFIGURATION (Firebase)
   -----------------------------------------------------------------
   ACCOUNTS_ENABLED — "Login with Mobile Number", wishlists, order
   history, order tracking, and the Store Manager's Orders/Messages
   tabs all depend on this being turned on. Set to true below, since
   your real Firebase project details are now filled in.

   PRODUCTS_SYNC_ENABLED — makes your product catalog, categories,
   AND size/stock inventory live in a cloud database (Firestore)
   instead of a file you must download and re-upload. Turn this on
   once you've:
     1. Enabled Firebase Storage (Build > Storage) in your project
     2. Published the Firestore + Storage security rules given to you
     3. Clicked "Migrate Current Catalog to Firestore" in admin.html
   Leave it OFF for now — your site works perfectly without it, using
   the products.js file directly. Flip it on whenever you're ready.
   ===================================================================== */

const ACCOUNTS_ENABLED = true;
const PRODUCTS_SYNC_ENABLED = false;

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCh8z_9x3NyoPJiYAPk_I3veQ6RjG44ED4",
  authDomain: "pink-world-store.firebaseapp.com",
  projectId: "pink-world-store",
  storageBucket: "pink-world-store.firebasestorage.app",
  messagingSenderId: "121284750877",
  appId: "1:121284750877:web:f0048c30e5da4c0585e0f4"
};
