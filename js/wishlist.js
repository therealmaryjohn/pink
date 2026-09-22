/* =====================================================================
   PINK WORLD — WISHLIST LOGIC
   ===================================================================== */

const GUEST_WISHLIST_KEY = "pinkworld_wishlist_guest";

function getGuestWishlist() {
  try { return JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY)) || []; }
  catch (e) { return []; }
}

function saveGuestWishlist(list) {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(list));
}

async function getWishlistIds() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (user && fbDb) {
    const snap = await fbDb.collection("users").doc(user.uid).collection("wishlist").get();
    return snap.docs.map(d => d.id);
  }
  return getGuestWishlist();
}

async function isInWishlist(productId) {
  const ids = await getWishlistIds();
  return ids.includes(productId);
}

async function toggleWishlist(productId) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  if (user && fbDb) {
    const ref = fbDb.collection("users").doc(user.uid).collection("wishlist").doc(productId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      return false;
    } else {
      await ref.set({ productId, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
      return true;
    }
  }

  let list = getGuestWishlist();
  const idx = list.indexOf(productId);
  if (idx > -1) {
    list.splice(idx, 1);
    saveGuestWishlist(list);
    return false;
  } else {
    list.push(productId);
    saveGuestWishlist(list);
    return true;
  }
}

async function refreshWishlistIcons() {
  const ids = await getWishlistIds();
  document.querySelectorAll("[data-wishlist-id]").forEach(btn => {
    const pid = btn.getAttribute("data-wishlist-id");
    btn.classList.toggle("active", ids.includes(pid));
    btn.textContent = ids.includes(pid) ? "♥" : "♡";
  });
}

async function handleWishlistClick(productId, btnEl) {
  const nowActive = await toggleWishlist(productId);
  if (btnEl) {
    btnEl.classList.toggle("active", nowActive);
    btnEl.textContent = nowActive ? "♥" : "♡";
  }
}
