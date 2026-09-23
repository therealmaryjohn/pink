/* =====================================================================
   PINK WORLD — STORE MANAGER (admin.html logic)
   -----------------------------------------------------------------
   SECURITY: The entire page (every tab) is hidden behind
   updateAdminAccessGate() below, which only reveals anything once
   the visitor has logged in with the exact admin mobile number set
   in Store Settings. This is enforced again server-side by your
   Firestore/Storage security rules, so even a technically savvy
   visitor cannot push changes without that specific phone's OTP.
   ===================================================================== */

const SEED_PRODUCTS = JSON.parse(JSON.stringify(PRODUCTS));
const SEED_CATEGORIES = JSON.parse(JSON.stringify(CATEGORIES));

let workingProducts = JSON.parse(JSON.stringify(PRODUCTS));
let workingCategories = JSON.parse(JSON.stringify(CATEGORIES));
let workingConfig = JSON.parse(JSON.stringify(STORE_CONFIG));
const pendingImages = {};
const pendingCategoryImages = {};

const SYNC_ACTIVE = typeof productsSyncActive === "function" && productsSyncActive();
let _currentAuthUser = null;
let activeAdminTab = "products";

function getWorkingList() { return SYNC_ACTIVE ? PRODUCTS : workingProducts; }
function getWorkingCategoryList() { return SYNC_ACTIVE ? CATEGORIES : workingCategories; }

function isAdminUser() {
  if (!_currentAuthUser) return false;
  const adminPhone = (workingConfig.adminPhone || "").replace(/\s/g, "");
  const userPhone = (_currentAuthUser.phoneNumber || "").replace(/\s/g, "");
  return !!adminPhone && userPhone === adminPhone;
}

/* ---------------------------- PAGE ACCESS GATE ---------------------------- */
function updateAdminAccessGate() {
  const gate = document.getElementById("adminAccessGate");
  const content = document.getElementById("adminGatedContent");

  if (!firebaseReady()) {
    // No login mechanism exists at all -- fall back to showing the page,
    // since there is no way to authenticate anyone without Firebase.
    gate.style.display = "none";
    content.style.display = "block";
    return;
  }

  if (!_currentAuthUser) {
    gate.style.display = "block";
    content.style.display = "none";
    gate.innerHTML = `
      <div class="admin-card admin-gate-card">
        <h2>Store Manager Login Required</h2>
        <p>This page is restricted to the store owner. Please log in with the admin mobile number to continue.</p>
        <a href="account.html" class="btn btn-primary">Go to Login Page</a>
      </div>`;
    return;
  }

  if (!isAdminUser()) {
    gate.style.display = "block";
    content.style.display = "none";
    gate.innerHTML = `
      <div class="admin-card admin-gate-card">
        <h2>Access Denied</h2>
        <p>You're logged in, but this mobile number isn't set as the store's Admin Mobile Number in Store Settings.</p>
      </div>`;
    return;
  }

  gate.style.display = "none";
  content.style.display = "block";
}

/* ---------------------------- TABS ---------------------------- */
function switchTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  ["products", "categories", "settings", "orders", "messages"].forEach(t => {
    document.getElementById("tab-" + t).classList.toggle("active", t === tab);
  });
  if (tab === "orders") loadAllOrders();
  if (tab === "messages") loadAllInquiries();
}

/* ---------------------------- HELPERS ---------------------------- */
function slugify(text) {
  return text.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
function nextProductId() {
  const list = getWorkingList();
  const nums = list.map(p => parseInt((p.id || "P000").replace(/\D/g, ""), 10) || 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return "P" + String(max + 1).padStart(3, "0");
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function resizeImageToBlob(file, maxDim, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
      else if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => callback(blob, w, h), "image/jpeg", 0.82);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function stockPillHtml(totalStock) {
  if (totalStock <= 0) return `<span class="stock-pill out-stock">Sold Out</span>`;
  if (totalStock <= 5) return `<span class="stock-pill low-stock">${totalStock} left</span>`;
  return `<span class="stock-pill in-stock">${totalStock} in stock</span>`;
}

/* ---------------------------- SIZE & STOCK ROW EDITOR ---------------------------- */
let currentSizeRows = [];

function renderSizeRows() {
  const wrap = document.getElementById("pf-sizes-rows");
  wrap.innerHTML = currentSizeRows.map((row, i) => `
    <div class="admin-size-row">
      <input type="text" placeholder="Size (e.g. S, M, Free Size)" value="${escapeHtml(row.size)}" oninput="updateSizeRow(${i}, 'size', this.value)">
      <input type="number" placeholder="Stock qty" min="0" value="${row.stock}" oninput="updateSizeRow(${i}, 'stock', this.value)">
      <button type="button" class="del-btn" onclick="removeSizeRow(${i})">Remove</button>
    </div>
  `).join("") || `<p style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">No sizes added yet — click "+ Add Size" below.</p>`;
}
function addSizeRow() { currentSizeRows.push({ size: "", stock: 0 }); renderSizeRows(); }
function updateSizeRow(i, field, value) {
  currentSizeRows[i][field] = field === "stock" ? (parseInt(value, 10) || 0) : value;
}
function removeSizeRow(i) { currentSizeRows.splice(i, 1); renderSizeRows(); }

/* ---------------------------- PRODUCTS TAB ---------------------------- */
function updateProductsTabUI() {
  const badge = document.getElementById("syncStatusBadge");
  const hint = document.getElementById("syncStatusHint");
  const migrateBanner = document.getElementById("migrateBanner");

  if (!SYNC_ACTIVE) {
    badge.className = "sync-badge offline";
    badge.innerHTML = '<span class="sync-dot"></span> File-based mode';
    hint.textContent = "Changes are saved by downloading & re-uploading products.js.";
    migrateBanner.style.display = "none";
  } else {
    badge.className = "sync-badge live";
    badge.innerHTML = '<span class="sync-dot"></span> Live sync — changes save instantly';
    hint.textContent = "Add, edit, or delete products below — your website updates within seconds.";
    migrateBanner.style.display = (firestoreCatalogHasData() && categoriesFirestoreHasData()) ? "none" : "block";
  }
  renderProductTable();
}

function renderProductTable() {
  const list = getWorkingList();
  document.getElementById("productCount").textContent = list.length;
  const rows = list.map(p => `
    <tr>
      <td><img src="${pendingImages[p.id] ? pendingImages[p.id].url : p.image}" alt=""></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>₹${p.price}${p.mrp ? ` <span style="color:var(--text-muted); text-decoration:line-through; font-size:12px;">₹${p.mrp}</span>` : ""}</td>
      <td>${stockPillHtml(getTotalStock(p))}</td>
      <td>${p.badge ? `<span class="badge ${p.badge.toLowerCase()}" style="position:static; display:inline-block;">${p.badge}</span>` : "—"}</td>
      <td>
        <div class="admin-actions-cell">
          <button class="edit-btn" onclick="openProductForm('${p.id}')">Edit</button>
          <button class="del-btn" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  document.getElementById("productTableBody").innerHTML = rows || `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">No products yet — click "Add New Product" above.</td></tr>`;
  refreshCategoryDropdownOptions();
}

async function deleteProduct(id) {
  const ok = await showConfirm("Remove this product? " + (SYNC_ACTIVE ? "This takes effect on your live site immediately." : "(This only affects the downloaded file, not your live site until you re-upload.)"));
  if (!ok) return;

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { await showNotice("Please log in as the admin number first."); return; }
    try {
      await fbDb.collection("products").doc(id).delete();
      delete pendingImages[id];
    } catch (e) {
      await showNotice("Couldn't delete this product online right now: " + e.message);
    }
    return;
  }

  workingProducts = workingProducts.filter(p => p.id !== id);
  delete pendingImages[id];
  renderProductTable();
}

/* ---------------------------- PRODUCT FORM ---------------------------- */
let editingProductId = null;
function openProductForm(id) {
  editingProductId = id;
  refreshCategoryDropdownOptions();
  const card = document.getElementById("productFormCard");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth" });
  if (id) {
    const p = getWorkingList().find(x => x.id === id);
    document.getElementById("productFormTitle").textContent = "Edit Product";
    document.getElementById("pf-id").value = p.id;
    document.getElementById("pf-name").value = p.name;
    document.getElementById("pf-category").value = p.category;
    document.getElementById("pf-price").value = p.price;
    document.getElementById("pf-mrp").value = p.mrp || "";
    document.getElementById("pf-badge").value = p.badge || "";
    document.getElementById("pf-description").value = p.description || "";
    currentSizeRows = (p.sizes || []).map(s => (typeof s === "object" && s !== null)
      ? { size: s.size, stock: Number(s.stock) || 0 }
      : { size: s, stock: 10 });
    const previewSrc = pendingImages[id] ? pendingImages[id].url : p.image;
    document.getElementById("pf-image-preview-wrap").innerHTML = `<img class="image-preview" src="${previewSrc}">`;
    document.getElementById("pf-image-path-note").textContent = "Current image: " + p.image;
  } else {
    document.getElementById("productFormTitle").textContent = "Add New Product";
    document.getElementById("pf-id").value = "";
    document.getElementById("pf-name").value = "";
    document.getElementById("pf-price").value = "";
    document.getElementById("pf-mrp").value = "";
    document.getElementById("pf-badge").value = "";
    document.getElementById("pf-description").value = "";
    currentSizeRows = [{ size: "Free Size", stock: 10 }];
    document.getElementById("pf-image-preview-wrap").innerHTML = "";
    document.getElementById("pf-image-path-note").textContent = "";
  }
  renderSizeRows();
}
function closeProductForm() {
  document.getElementById("productFormCard").style.display = "none";
  editingProductId = null;
  currentSizeRows = [];
}
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  resizeImageToBlob(file, 1000, function (blob, w, h) {
    const url = URL.createObjectURL(blob);
    const nameField = document.getElementById("pf-name").value || "product";
    const idField = document.getElementById("pf-id").value || nextProductId();
    const filename = `${idField}-${slugify(nameField)}.jpg`;
    const key = editingProductId || "__new__";
    pendingImages[key] = { blob, filename, url };
    document.getElementById("pf-image-preview-wrap").innerHTML = `<img class="image-preview" src="${url}">`;
    document.getElementById("pf-image-path-note").textContent = `New photo ready: ${filename} (resized to ${w}×${h}px)`;
  });
}

async function saveProduct() {
  const name = document.getElementById("pf-name").value.trim();
  const category = document.getElementById("pf-category").value;
  const price = parseInt(document.getElementById("pf-price").value, 10);
  const mrpRaw = document.getElementById("pf-mrp").value.trim();
  const mrp = mrpRaw ? parseInt(mrpRaw, 10) : null;
  const badge = document.getElementById("pf-badge").value;
  const description = document.getElementById("pf-description").value.trim();
  const sizes = currentSizeRows
    .filter(r => r.size && r.size.trim())
    .map(r => ({ size: r.size.trim(), stock: Math.max(0, Number(r.stock) || 0) }));

  if (!name || !price || !category) { await showNotice("Please fill in at least the product name, category, and price."); return; }
  if (sizes.length === 0) { await showNotice("Please add at least one size (e.g. \"Free Size\") with its stock quantity."); return; }

  let id = document.getElementById("pf-id").value;
  const isNew = !id;
  if (isNew) id = nextProductId();
  if (isNew && pendingImages["__new__"]) { pendingImages[id] = pendingImages["__new__"]; delete pendingImages["__new__"]; }
  const pending = pendingImages[id];

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { await showNotice("Please log in as the admin number first."); return; }
    const saveBtn = document.getElementById("saveProductBtn");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    try {
      let imagePath;
      if (pending && pending.blob) {
        saveBtn.textContent = "Uploading photo...";
        const storageRef = firebase.storage().ref(`products/${id}/${pending.filename}`);
        await storageRef.put(pending.blob);
        imagePath = await storageRef.getDownloadURL();
      } else {
        const existing = PRODUCTS.find(p => p.id === id);
        imagePath = existing ? existing.image : "images/placeholder.jpg";
      }
      saveBtn.textContent = "Saving...";
      const productData = {
        id, name, category, price, mrp: mrp || null, image: imagePath, badge, sizes, description,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await fbDb.collection("products").doc(id).set(productData, { merge: true });
      delete pendingImages[id];
      closeProductForm();
      await showNotice("Product saved — your website updates within a few seconds.");
    } catch (e) {
      await showNotice("Couldn't save this product online right now. Please check your connection and try again.\n\n" + e.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
    return;
  }

  const existingProduct = workingProducts.find(p => p.id === id);
  const imagePath = pending ? `images/${pending.filename}` : (existingProduct ? existingProduct.image : "images/placeholder.jpg");
  const productData = { id, name, category, price, mrp: mrp || null, image: imagePath, badge, sizes, description };
  if (isNew) { workingProducts.push(productData); }
  else { const idx = workingProducts.findIndex(p => p.id === id); workingProducts[idx] = productData; }
  closeProductForm();
  renderProductTable();
}

/* ---------------------------- CATEGORIES TAB ---------------------------- */
function updateCategoriesTabUI() {
  renderCategoryTable();
}

function renderCategoryTable() {
  const list = getWorkingCategoryList();
  document.getElementById("categoryCount").textContent = list.length;
  document.getElementById("categoryTableBody").innerHTML = list.map(c => `
    <tr>
      <td><img src="${pendingCategoryImages[c.id] ? pendingCategoryImages[c.id].url : c.image}" alt=""></td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.description || "")}</td>
      <td>
        <div class="admin-actions-cell">
          <button class="edit-btn" onclick="openCategoryForm('${c.id}')">Edit</button>
          <button class="del-btn" onclick="deleteCategory('${c.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No categories yet.</td></tr>`;
  refreshCategoryDropdownOptions();
}

let editingCategoryId = null;
function openCategoryForm(id) {
  editingCategoryId = id;
  document.getElementById("categoryFormCard").style.display = "block";
  document.getElementById("categoryFormCard").scrollIntoView({ behavior: "smooth" });
  const idInput = document.getElementById("cf-cat-id");
  if (id) {
    const c = getWorkingCategoryList().find(x => x.id === id);
    document.getElementById("categoryFormTitle").textContent = "Edit Category";
    document.getElementById("cf-cat-name").value = c.name;
    idInput.value = c.id; idInput.disabled = true;
    document.getElementById("cf-cat-description").value = c.description || "";
    const previewSrc = pendingCategoryImages[id] ? pendingCategoryImages[id].url : c.image;
    document.getElementById("cf-cat-image-preview-wrap").innerHTML = `<img class="image-preview" src="${previewSrc}">`;
    document.getElementById("cf-cat-image-path-note").textContent = "Current image: " + c.image;
  } else {
    document.getElementById("categoryFormTitle").textContent = "Add New Category";
    document.getElementById("cf-cat-name").value = "";
    idInput.value = ""; idInput.disabled = false;
    document.getElementById("cf-cat-description").value = "";
    document.getElementById("cf-cat-image-preview-wrap").innerHTML = "";
    document.getElementById("cf-cat-image-path-note").textContent = "";
  }
}
function closeCategoryForm() {
  document.getElementById("categoryFormCard").style.display = "none";
  editingCategoryId = null;
}

function handleCategoryImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  resizeImageToBlob(file, 1000, function (blob, w, h) {
    const url = URL.createObjectURL(blob);
    const idField = document.getElementById("cf-cat-id").value.trim() || slugify(document.getElementById("cf-cat-name").value || "category");
    const filename = `cat-${idField}.jpg`;
    const key = editingCategoryId || "__new__";
    pendingCategoryImages[key] = { blob, filename, url };
    document.getElementById("cf-cat-image-preview-wrap").innerHTML = `<img class="image-preview" src="${url}">`;
    document.getElementById("cf-cat-image-path-note").textContent = `New photo ready: ${filename} (resized to ${w}×${h}px)`;
  });
}

async function saveCategory() {
  const name = document.getElementById("cf-cat-name").value.trim();
  let id = document.getElementById("cf-cat-id").value.trim();
  const description = document.getElementById("cf-cat-description").value.trim();
  if (!name) { await showNotice("Please enter a category name."); return; }
  if (!id) id = slugify(name);

  const isNew = !editingCategoryId;
  const list = getWorkingCategoryList();
  if (isNew && list.some(c => c.id === id)) {
    let n = 2; const base = id;
    while (list.some(c => c.id === (base + "-" + n))) n++;
    id = base + "-" + n;
  }

  if (isNew && pendingCategoryImages["__new__"]) { pendingCategoryImages[id] = pendingCategoryImages["__new__"]; delete pendingCategoryImages["__new__"]; }
  const pending = pendingCategoryImages[id];

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { await showNotice("Please log in as the admin number first."); return; }
    const saveBtn = document.getElementById("saveCategoryBtn");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    try {
      let imagePath;
      if (pending && pending.blob) {
        saveBtn.textContent = "Uploading photo...";
        const storageRef = firebase.storage().ref(`categories/${id}/${pending.filename}`);
        await storageRef.put(pending.blob);
        imagePath = await storageRef.getDownloadURL();
      } else {
        const existing = CATEGORIES.find(c => c.id === id);
        imagePath = existing ? existing.image : "images/placeholder.jpg";
      }
      saveBtn.textContent = "Saving...";
      await fbDb.collection("categories").doc(id).set({
        id, name, description, image: imagePath,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      delete pendingCategoryImages[id];
      closeCategoryForm();
      await showNotice("Category saved — your website updates within a few seconds.");
    } catch (e) {
      await showNotice("Couldn't save this category online right now.\n\n" + e.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
    return;
  }

  const existingCat = workingCategories.find(c => c.id === id);
  const imagePath = pending ? `images/${pending.filename}` : (existingCat ? existingCat.image : "images/placeholder.jpg");
  const catData = { id, name, description, image: imagePath };
  if (isNew) { workingCategories.push(catData); }
  else { const idx = workingCategories.findIndex(c => c.id === id); workingCategories[idx] = catData; }
  closeCategoryForm();
  renderCategoryTable();
}

async function deleteCategory(id) {
  const inUseCount = getWorkingList().filter(p => p.category === id).length;
  const msg = inUseCount > 0
    ? `${inUseCount} product(s) currently use this category. They'll keep that category tag, but it will no longer appear as a filter option unless you reassign them. Delete anyway?`
    : "Delete this category?";
  const ok = await showConfirm(msg);
  if (!ok) return;

  if (SYNC_ACTIVE) {
    if (!isAdminUser()) { await showNotice("Please log in as the admin number first."); return; }
    try { await fbDb.collection("categories").doc(id).delete(); delete pendingCategoryImages[id]; }
    catch (e) { await showNotice("Couldn't delete: " + e.message); }
    return;
  }
  workingCategories = workingCategories.filter(c => c.id !== id);
  delete pendingCategoryImages[id];
  renderCategoryTable();
}

function refreshCategoryDropdownOptions() {
  const sel = document.getElementById("pf-category");
  if (!sel) return;
  const current = sel.value;
  const list = getWorkingCategoryList();
  sel.innerHTML = list.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  if (list.some(c => c.id === current)) sel.value = current;
}

document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("cf-cat-name");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      if (!editingCategoryId) {
        document.getElementById("cf-cat-id").value = slugify(nameInput.value);
      }
    });
  }
});

/* ---------------------------- MIGRATION (one-time) ---------------------------- */
async function migrateCatalogToFirestore() {
  if (!SYNC_ACTIVE || !isAdminUser()) return;
  const ok = await showConfirm(`Copy your current ${SEED_PRODUCTS.length} starter products (with their stock levels) and ${SEED_CATEGORIES.length} categories into the live database? This is normally only done once.`);
  if (!ok) return;
  const btn = document.getElementById("migrateBtn");
  const originalText = btn.textContent;
  btn.textContent = "Migrating..."; btn.disabled = true;
  try {
    const batch = fbDb.batch();
    SEED_PRODUCTS.forEach(p => {
      const ref = fbDb.collection("products").doc(p.id);
      batch.set(ref, Object.assign({}, p, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
    });
    SEED_CATEGORIES.forEach(c => {
      const ref = fbDb.collection("categories").doc(c.id);
      batch.set(ref, Object.assign({}, c, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
    });
    await batch.commit();
    await showNotice("Catalog migrated! Your products, categories, and stock levels are now live — edits will appear on your site within seconds.");
  } catch (e) {
    await showNotice("Migration failed: " + e.message + "\n\nDouble-check your Firestore security rules include the products and categories collections.");
  } finally {
    btn.textContent = originalText; btn.disabled = false;
  }
}

/* ---------------------------- SETTINGS TAB ---------------------------- */
function renderBranchForms() {
  const wrap = document.getElementById("branchFormsWrap");
  wrap.innerHTML = workingConfig.branches.map((b, i) => `
    <div style="border:1px solid var(--border); padding:16px; margin-bottom:14px;">
      <h4 style="font-size:14px; color:var(--rose-dark); margin-bottom:10px;">Branch ${i + 1}</h4>
      <div class="form-row">
        <div class="form-group"><label>Branch Name</label><input type="text" id="branch-name-${i}" value="${escapeHtml(b.name)}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="branch-phone-${i}" value="${escapeHtml(b.phone)}"></div>
      </div>
      <div class="form-group"><label>Full Address</label><input type="text" id="branch-address-${i}" value="${escapeHtml(b.address)}"></div>
      <div class="form-group"><label>Opening Hours</label><input type="text" id="branch-hours-${i}" value="${escapeHtml(b.hours)}"></div>
      <div class="form-group"><label>Google Maps Link (share link)</label><input type="text" id="branch-maplink-${i}" value="${escapeHtml(b.mapLink)}"></div>
      <div class="form-group"><label>Google Maps Embed URL</label><input type="text" id="branch-mapembed-${i}" value="${escapeHtml(b.mapEmbed)}"></div>
    </div>
  `).join("");
}
function loadSettingsForm() {
  document.getElementById("cf-name").value = workingConfig.name;
  document.getElementById("cf-whatsapp").value = workingConfig.whatsapp;
  document.getElementById("cf-email").value = workingConfig.email;
  document.getElementById("cf-shipping").value = workingConfig.freeShippingThreshold;
  document.getElementById("cf-description").value = workingConfig.description;
  document.getElementById("cf-razorpay-enabled").checked = !!workingConfig.razorpayEnabled;
  document.getElementById("cf-razorpay-key").value = workingConfig.razorpayKeyId;
  document.getElementById("cf-admin-phone").value = workingConfig.adminPhone || "";
  document.getElementById("cf-instagram").value = workingConfig.social.instagram;
  document.getElementById("cf-facebook").value = workingConfig.social.facebook;
  renderBranchForms();
}
function collectConfigFromForm() {
  workingConfig.name = document.getElementById("cf-name").value.trim();
  workingConfig.whatsapp = document.getElementById("cf-whatsapp").value.trim();
  workingConfig.email = document.getElementById("cf-email").value.trim();
  workingConfig.freeShippingThreshold = parseInt(document.getElementById("cf-shipping").value, 10) || 0;
  workingConfig.description = document.getElementById("cf-description").value.trim();
  workingConfig.razorpayEnabled = document.getElementById("cf-razorpay-enabled").checked;
  workingConfig.razorpayKeyId = document.getElementById("cf-razorpay-key").value.trim();
  workingConfig.adminPhone = document.getElementById("cf-admin-phone").value.trim();
  workingConfig.social.instagram = document.getElementById("cf-instagram").value.trim() || "#";
  workingConfig.social.facebook = document.getElementById("cf-facebook").value.trim() || "#";
  workingConfig.branches = workingConfig.branches.map((b, i) => ({
    name: document.getElementById(`branch-name-${i}`).value.trim(),
    address: document.getElementById(`branch-address-${i}`).value.trim(),
    phone: document.getElementById(`branch-phone-${i}`).value.trim(),
    hours: document.getElementById(`branch-hours-${i}`).value.trim(),
    mapLink: document.getElementById(`branch-maplink-${i}`).value.trim(),
    mapEmbed: document.getElementById(`branch-mapembed-${i}`).value.trim()
  }));
}
function downloadConfigJs() {
  collectConfigFromForm();
  const c = workingConfig;
  const branchesStr = c.branches.map(b => `    {
      name: ${JSON.stringify(b.name)},
      address: ${JSON.stringify(b.address)},
      phone: ${JSON.stringify(b.phone)},
      hours: ${JSON.stringify(b.hours)},
      mapEmbed: ${JSON.stringify(b.mapEmbed)},
      mapLink: ${JSON.stringify(b.mapLink)}
    }`).join(",\n");

  const content = `/* PINK WORLD — STORE CONFIGURATION (generated/updated using admin.html) */

const STORE_CONFIG = {
  name: ${JSON.stringify(c.name)},
  tagline: ${JSON.stringify(c.tagline || "Fashion & Everyday Essentials for the Whole Family")},
  description: ${JSON.stringify(c.description)},

  whatsapp: ${JSON.stringify(c.whatsapp)},
  email: ${JSON.stringify(c.email)},

  freeShippingThreshold: ${c.freeShippingThreshold},
  currency: ${JSON.stringify(c.currency || "₹")},

  razorpayEnabled: ${c.razorpayEnabled ? "true" : "false"},
  razorpayKeyId: ${JSON.stringify(c.razorpayKeyId)},

  adminPhone: ${JSON.stringify(c.adminPhone || "")},

  branches: [
${branchesStr}
  ],

  social: {
    instagram: ${JSON.stringify(c.social.instagram)},
    facebook: ${JSON.stringify(c.social.facebook)},
    youtube: ${JSON.stringify(c.social.youtube || "#")}
  }
};
`;
  downloadTextFile("config.js", content);
}

/* ---------------------------- ORDERS TAB ---------------------------- */
const ORDER_STATUSES = ["Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"];

async function loadAllOrders() {
  if (!isAdminUser()) return;
  let orders = [];
  try {
    const snap = await fbDb.collection("orders").orderBy("createdAt", "desc").limit(200).get();
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Could not load orders:", e);
    document.getElementById("adminOrdersList").innerHTML = `<p style="text-align:center; color:#c0392b; padding:30px;">Couldn't load orders right now. If you just set this up, double-check your Firestore security rules and try again.</p>`;
    document.getElementById("orderCount").textContent = "0";
    return;
  }
  document.getElementById("orderCount").textContent = orders.length;
  document.getElementById("adminOrdersList").innerHTML = orders.map(o => {
    const dateStr = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    const itemsHtml = (o.items || []).map(it => `<div class="order-item-row"><span>${escapeHtml(it.name)} (${escapeHtml(it.size)}) x${it.qty}</span><span>₹${it.price * it.qty}</span></div>`).join("");
    const statusOptions = ORDER_STATUSES.map(s => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("");
    return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <strong>${escapeHtml(o.customerName || "Customer")}</strong> — ${escapeHtml(o.phone || "")}<br>
            <span style="font-size:12.5px; color:var(--text-muted);">${dateStr} · ${escapeHtml(o.paymentMethod || "")} · ${escapeHtml(o.branch || "")}</span>
          </div>
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px; border:1px solid var(--border); font-size:13px;">
            ${statusOptions}
          </select>
        </div>
        ${o.address ? `<p style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">Address: ${escapeHtml(o.address)}</p>` : ""}
        ${itemsHtml}
        <div class="row" style="margin-top:10px; font-weight:700; color:var(--rose-dark);"><span>Total</span><span>₹${o.total || 0}</span></div>
        <div class="tracking-edit-row">
          <input type="text" class="tracking-input" id="track-num-${o.id}" placeholder="Tracking Number" value="${escapeHtml(o.trackingNumber || "")}">
          <input type="text" class="tracking-input" id="track-carrier-${o.id}" placeholder="Carrier (e.g. BlueDart, DTDC, India Post)" value="${escapeHtml(o.carrier || "")}">
          <input type="text" class="tracking-input" id="track-url-${o.id}" placeholder="Tracking URL (optional)" value="${escapeHtml(o.trackingUrl || "")}">
          <button class="btn btn-outline btn-sm" onclick="saveTracking('${o.id}')">Save Tracking Info</button>
        </div>
      </div>`;
  }).join("") || `<p style="text-align:center; color:var(--text-muted); padding:30px;">No orders yet.</p>`;
}
async function updateOrderStatus(orderId, newStatus) {
  await fbDb.collection("orders").doc(orderId).set({ status: newStatus }, { merge: true });
}
async function saveTracking(orderId) {
  const num = document.getElementById(`track-num-${orderId}`).value.trim();
  const carrier = document.getElementById(`track-carrier-${orderId}`).value.trim();
  const url = document.getElementById(`track-url-${orderId}`).value.trim();
  try {
    await fbDb.collection("orders").doc(orderId).set({
      trackingNumber: num || null,
      carrier: carrier || null,
      trackingUrl: url || null
    }, { merge: true });
    await showNotice("Tracking info saved. The customer will see this under My Orders.");
  } catch (e) {
    await showNotice("Couldn't save tracking info: " + e.message);
  }
}

/* ---------------------------- MESSAGES TAB (Contact Us inquiries) ---------------------------- */
const INQUIRY_STATUSES = ["New", "Read", "Replied"];

async function loadAllInquiries() {
  if (!isAdminUser()) return;
  let items = [];
  try {
    const snap = await fbDb.collection("inquiries").orderBy("createdAt", "desc").limit(200).get();
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Could not load inquiries:", e);
    document.getElementById("adminMessagesList").innerHTML = `<p style="text-align:center; color:#c0392b; padding:30px;">Couldn't load messages right now. If you just set this up, double-check your Firestore security rules and try again.</p>`;
    document.getElementById("messageCount").textContent = "0";
    return;
  }
  document.getElementById("messageCount").textContent = items.length;
  document.getElementById("adminMessagesList").innerHTML = items.map(m => {
    const dateStr = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    const statusOptions = INQUIRY_STATUSES.map(s => `<option value="${s}" ${m.status === s ? "selected" : ""}>${s}</option>`).join("");
    return `
      <div class="order-card">
        <div class="order-card-head">
          <div>
            <strong>${escapeHtml(m.name || "Customer")}</strong> — ${escapeHtml(m.phone || "")}<br>
            <span style="font-size:12.5px; color:var(--text-muted);">${dateStr}</span>
          </div>
          <select onchange="updateInquiryStatus('${m.id}', this.value)" style="padding:6px 10px; border:1px solid var(--border); font-size:13px;">
            ${statusOptions}
          </select>
        </div>
        <p style="font-size:14px; margin-top:10px; white-space:pre-wrap;">${escapeHtml(m.message || "")}</p>
      </div>`;
  }).join("") || `<p style="text-align:center; color:var(--text-muted); padding:30px;">No messages yet.</p>`;
}
async function updateInquiryStatus(id, status) {
  await fbDb.collection("inquiries").doc(id).set({ status }, { merge: true });
}

/* ---------------------------- INIT ---------------------------- */
loadSettingsForm();
updateAdminAccessGate();
updateProductsTabUI();
updateCategoriesTabUI();

if (typeof onAuthChange === "function") {
  onAuthChange(user => {
    _currentAuthUser = user;
    updateAdminAccessGate();
    updateProductsTabUI();
    updateCategoriesTabUI();
    if (isAdminUser() && activeAdminTab === "orders") loadAllOrders();
    if (isAdminUser() && activeAdminTab === "messages") loadAllInquiries();
  });
}

if (SYNC_ACTIVE) {
  subscribeProductsUpdates(function () { updateProductsTabUI(); });
  subscribeCategoriesUpdates(function () { updateCategoriesTabUI(); });
}
