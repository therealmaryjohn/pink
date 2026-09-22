/* =====================================================================
   PINK WORLD — LIVE PRODUCT & CATEGORY SYNC (Firestore)
   ===================================================================== */

let _productsSyncStarted = false;
let _productsFirestoreHasData = false;
let _categoriesFirestoreHasData = false;

function productsSyncActive() {
  return typeof PRODUCTS_SYNC_ENABLED !== "undefined" && PRODUCTS_SYNC_ENABLED && firebaseReady();
}
function categoriesSyncActive() {
  return productsSyncActive();
}
function firestoreCatalogHasData() {
  return _productsFirestoreHasData;
}
function categoriesFirestoreHasData() {
  return _categoriesFirestoreHasData;
}

function subscribeProductsUpdates(onChange) {
  if (!productsSyncActive()) return false;
  if (!initFirebase()) return false;

  fbDb.collection("products").onSnapshot(
    snap => {
      _productsFirestoreHasData = !snap.empty;
      if (!snap.empty) {
        const items = snap.docs.map(d => d.data());
        items.sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));
        PRODUCTS.splice(0, PRODUCTS.length, ...items);
      }
      if (typeof onChange === "function") onChange();
    },
    err => {
      console.warn("Live product sync unavailable, using the built-in catalog instead:", err);
      if (typeof onChange === "function") onChange();
    }
  );
  _productsSyncStarted = true;
  return true;
}

function subscribeCategoriesUpdates(onChange) {
  if (!categoriesSyncActive()) return false;
  if (!initFirebase()) return false;

  fbDb.collection("categories").onSnapshot(
    snap => {
      _categoriesFirestoreHasData = !snap.empty;
      if (!snap.empty) {
        const items = snap.docs.map(d => d.data());
        items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        CATEGORIES.splice(0, CATEGORIES.length, ...items);
      }
      if (typeof onChange === "function") onChange();
    },
    err => {
      console.warn("Live category sync unavailable, using the built-in categories instead:", err);
      if (typeof onChange === "function") onChange();
    }
  );
  return true;
}
