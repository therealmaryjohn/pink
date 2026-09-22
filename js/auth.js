/* =====================================================================
   PINK WORLD — CUSTOMER LOGIN (Mobile Number + OTP)
   ===================================================================== */

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let recaptchaVerifier = null;
let confirmationResult = null;

const authStateListeners = [];

function firebaseReady() {
  return typeof ACCOUNTS_ENABLED !== "undefined" && ACCOUNTS_ENABLED &&
    typeof firebase !== "undefined" &&
    FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

function initFirebase() {
  if (!firebaseReady()) return false;
  if (!fbApp) {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbAuth.onAuthStateChanged(user => {
      authStateListeners.forEach(cb => cb(user));
    });
  }
  return true;
}

function onAuthChange(callback) {
  authStateListeners.push(callback);
  if (fbAuth) {
    callback(fbAuth.currentUser);
  } else if (initFirebase()) {
    callback(fbAuth.currentUser);
  } else {
    callback(null);
  }
}

function getCurrentUser() {
  return fbAuth ? fbAuth.currentUser : null;
}

function setupRecaptcha(buttonElementId) {
  if (!initFirebase()) return null;
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier(buttonElementId, {
    size: "invisible"
  });
  return recaptchaVerifier;
}

function sendOtp(phoneNumberE164) {
  if (!initFirebase()) return Promise.reject(new Error("not-configured"));
  return fbAuth.signInWithPhoneNumber(phoneNumberE164, recaptchaVerifier)
    .then(result => { confirmationResult = result; return result; });
}

function verifyOtp(code) {
  if (!confirmationResult) return Promise.reject(new Error("no-otp-sent"));
  return confirmationResult.confirm(code).then(async (result) => {
    const user = result.user;
    await ensureUserProfile(user);
    await migrateGuestWishlist(user);
    return user;
  });
}

async function ensureUserProfile(user) {
  const ref = fbDb.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      phone: user.phoneNumber,
      name: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function updateUserName(name) {
  const user = getCurrentUser();
  if (!user) return;
  await fbDb.collection("users").doc(user.uid).set({ name }, { merge: true });
}

async function getUserProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  const snap = await fbDb.collection("users").doc(user.uid).get();
  return snap.exists ? snap.data() : null;
}

function logout() {
  if (fbAuth) return fbAuth.signOut();
  return Promise.resolve();
}

async function migrateGuestWishlist(user) {
  try {
    const guestList = JSON.parse(localStorage.getItem("pinkworld_wishlist_guest") || "[]");
    if (!guestList.length) return;
    const batch = fbDb.batch();
    guestList.forEach(productId => {
      const ref = fbDb.collection("users").doc(user.uid).collection("wishlist").doc(productId);
      batch.set(ref, { productId, addedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    localStorage.removeItem("pinkworld_wishlist_guest");
  } catch (e) {
    console.warn("Wishlist migration skipped:", e);
  }
}
