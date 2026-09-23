/* =====================================================================
   PINK WORLD — CUSTOM NOTIFICATION / CONFIRMATION POPUPS
   -----------------------------------------------------------------
   Replaces the browser's built-in alert()/confirm() (the ones that
   show an ugly "yoursite.com says" bar) with a small, on-brand popup
   that matches the rest of the site. Closes as soon as the customer
   clicks OK (or Cancel, for yes/no confirmations).

   Usage anywhere on the site:
     showNotice("Added to cart!");                      // simple OK popup
     const yes = await showConfirm("Delete this order?"); // true/false
   ===================================================================== */

(function () {
  function ensureModalRoot() {
    let root = document.getElementById("pwModalRoot");
    if (root) return root;
    root = document.createElement("div");
    root.id = "pwModalRoot";
    root.innerHTML = `
      <div class="pw-modal-overlay" id="pwModalOverlay" style="display:none;">
        <div class="pw-modal-box" role="alertdialog" aria-modal="true">
          <p class="pw-modal-message" id="pwModalMessage"></p>
          <div class="pw-modal-actions" id="pwModalActions"></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function showNotice(message) {
    return new Promise((resolve) => {
      ensureModalRoot();
      const overlay = document.getElementById("pwModalOverlay");
      const msgEl = document.getElementById("pwModalMessage");
      const actionsEl = document.getElementById("pwModalActions");
      msgEl.textContent = message;
      actionsEl.innerHTML = `<button type="button" class="btn btn-primary pw-modal-ok">OK</button>`;
      overlay.style.display = "flex";

      const okBtn = actionsEl.querySelector(".pw-modal-ok");
      function close() {
        overlay.style.display = "none";
        okBtn.removeEventListener("click", close);
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        resolve();
      }
      function onOverlayClick(e) { if (e.target === overlay) close(); }
      function onKeydown(e) { if (e.key === "Enter" || e.key === "Escape") close(); }

      okBtn.addEventListener("click", close);
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);
      okBtn.focus();
    });
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      ensureModalRoot();
      const overlay = document.getElementById("pwModalOverlay");
      const msgEl = document.getElementById("pwModalMessage");
      const actionsEl = document.getElementById("pwModalActions");
      msgEl.textContent = message;
      actionsEl.innerHTML = `
        <button type="button" class="btn btn-outline pw-modal-cancel">Cancel</button>
        <button type="button" class="btn btn-primary pw-modal-confirm">OK</button>`;
      overlay.style.display = "flex";

      const cancelBtn = actionsEl.querySelector(".pw-modal-cancel");
      const confirmBtn = actionsEl.querySelector(".pw-modal-confirm");

      function finish(result) {
        overlay.style.display = "none";
        cancelBtn.removeEventListener("click", onCancel);
        confirmBtn.removeEventListener("click", onConfirm);
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        resolve(result);
      }
      function onCancel() { finish(false); }
      function onConfirm() { finish(true); }
      function onOverlayClick(e) { if (e.target === overlay) finish(false); }
      function onKeydown(e) { if (e.key === "Escape") finish(false); if (e.key === "Enter") finish(true); }

      cancelBtn.addEventListener("click", onCancel);
      confirmBtn.addEventListener("click", onConfirm);
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);
      confirmBtn.focus();
    });
  }

  window.showNotice = showNotice;
  window.showConfirm = showConfirm;
})();
