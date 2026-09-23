/* =====================================================================
   PINK WORLD — SHARED SITE LOGIC
   ===================================================================== */

function formatPrice(n) {
  return STORE_CONFIG.currency + n.toLocaleString("en-IN");
}

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function renderHeader(activePage) {
  const nav = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "shop.html", label: "Shop", key: "shop" },
    { href: "about.html", label: "About & Branches", key: "about" },
    { href: "contact.html", label: "Contact", key: "contact" }
  ];
  const navHtml = nav.map(item =>
    `<a href="${item.href}" class="${activePage === item.key ? "active" : ""}">${item.label}</a>`
  ).join("");

  return `
  <div class="announce-bar">Free shipping on orders above ${formatPrice(STORE_CONFIG.freeShippingThreshold)} — Order via WhatsApp for instant confirmation</div>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="logo-link">
        <img src="images/logo.png" alt="${STORE_CONFIG.name} logo">
      </a>
      <nav class="main-nav" id="mainNav">${navHtml}</nav>
      <div class="header-actions">
        <div class="search-box">
          <input type="text" id="headerSearch" placeholder="Search...">
        </div>
        <a href="account.html" class="account-greeting" id="accountGreeting"></a>
        <a href="account.html" class="icon-link" id="accountHeaderLink" title="My Account">👤</a>
        <a href="cart.html" class="icon-link" title="Cart">🛍️<span class="cart-badge">0</span></a>
        <a href="https://wa.me/${STORE_CONFIG.whatsapp}" target="_blank" class="icon-link" title="WhatsApp us">💬</a>
        <button class="mobile-toggle" id="mobileToggle">☰</button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  const branchesHtml = STORE_CONFIG.branches.map(b =>
    `<p><strong>${b.name}</strong><br>${b.address}<br>${b.phone}</p>`
  ).join("");

  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>${STORE_CONFIG.name}</h4>
          <p>${STORE_CONFIG.description}</p>
          <div class="social-icons">
            <a href="${STORE_CONFIG.social.instagram}" target="_blank">IG</a>
            <a href="${STORE_CONFIG.social.facebook}" target="_blank">FB</a>
            <a href="${STORE_CONFIG.social.youtube}" target="_blank">YT</a>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="shop.html?category=sarees">Sarees</a>
          <a href="shop.html?category=kurtis">Kurtis & Suits</a>
          <a href="shop.html?category=western">Western Wear</a>
          <a href="shop.html?category=mens">Men's Collections</a>
          <a href="shop.html?category=intimate">Intimate & Innerwear</a>
        </div>
        <div>
          <h4>Quick Links</h4>
          <a href="about.html">About Us</a>
          <a href="contact.html">Contact</a>
          <a href="account.html">My Account</a>
          <a href="cart.html">My Cart</a>
        </div>
        <div>
          <h4>Visit Our Stores</h4>
          ${branchesHtml}
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      © <span id="year"></span> ${STORE_CONFIG.name}. All rights reserved. — Made with love in Idukki, Kerala
    </div>
  </footer>
  <a href="https://wa.me/${STORE_CONFIG.whatsapp}" target="_blank" class="float-whatsapp" title="Chat on WhatsApp">💬</a>`;
}

function initLayout(activePage) {
  document.getElementById("header-placeholder").innerHTML = renderHeader(activePage);
  document.getElementById("footer-placeholder").innerHTML = renderFooter();
  document.getElementById("year").textContent = new Date().getFullYear();
  updateCartBadge();

  document.getElementById("mobileToggle").addEventListener("click", () => {
    document.getElementById("mainNav").classList.toggle("mobile-open");
  });

  const searchInput = document.getElementById("headerSearch");
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      window.location.href = "shop.html?search=" + encodeURIComponent(searchInput.value.trim());
    }
  });

  if (typeof onAuthChange === "function") {
    onAuthChange(async (user) => {
      const link = document.getElementById("accountHeaderLink");
      const greetingEl = document.getElementById("accountGreeting");
      if (!user) {
        if (link) { link.title = "Login / My Account"; link.style.color = ""; }
        if (greetingEl) { greetingEl.style.display = "none"; greetingEl.textContent = ""; }
        return;
      }
      if (link) { link.title = "My Account"; link.style.color = "var(--rose-dark)"; }

      // Pull this customer's saved cart (merging in anything they added
      // as a guest on this browser) so it's always there when they log in.
      if (typeof pullCartFromAccountAndMerge === "function") {
        pullCartFromAccountAndMerge(user);
      }

      if (greetingEl && typeof getUserProfile === "function") {
        try {
          const profile = await getUserProfile();
          const firstName = profile && profile.name ? profile.name.trim().split(" ")[0] : "";
          if (firstName) {
            greetingEl.innerHTML = `Hi, ${firstName}`;
            greetingEl.style.display = "inline-flex";
          } else {
            greetingEl.style.display = "none";
          }
        } catch (e) {
          greetingEl.style.display = "none";
        }
      }
    });
  }
}

function productCardHtml(p) {
  const soldOut = isProductSoldOut(p);
  const badgeClass = p.badge ? p.badge.toLowerCase() : "";
  const discount = p.mrp ? Math.round(100 - (p.price / p.mrp) * 100) : null;
  const badgeHtml = soldOut
    ? `<span class="badge soldout">Sold Out</span>`
    : (p.badge ? `<span class="badge ${badgeClass}">${p.badge}</span>` : "");
  return `
  <div class="product-card">
    <a href="product.html?id=${p.id}" class="product-img-wrap">
      ${badgeHtml}
      <button type="button" class="wishlist-heart" data-wishlist-id="${p.id}" onclick="event.preventDefault(); event.stopPropagation(); handleWishlistClick('${p.id}', this);" title="Add to wishlist">♡</button>
      <img src="${p.image}" alt="${p.name}" ${soldOut ? 'style="opacity:0.55;"' : ""}>
    </a>
    <div class="product-info">
      <h4><a href="product.html?id=${p.id}">${p.name}</a></h4>
      <div class="price-row">
        <span class="price">${formatPrice(p.price)}</span>
        ${p.mrp ? `<span class="mrp">${formatPrice(p.mrp)}</span><span class="discount">${discount}% OFF</span>` : ""}
      </div>
      <button class="btn btn-outline btn-sm btn-block" onclick="quickAdd('${p.id}')" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold Out" : "Add to Cart"}</button>
    </div>
  </div>`;
}

async function quickAdd(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  if (isProductSoldOut(product)) { await showNotice("Sorry, this product is currently sold out."); return; }
  const size = getFirstAvailableSize(product);
  const added = await addToCart(id, size, 1);
  if (added) await showNotice(`${product.name} added to cart!`);
}

function categoryCardHtml(c) {
  return `
  <a href="shop.html?category=${c.id}" class="category-card">
    <img src="${c.image}" alt="${c.name}">
    <div class="cat-label">
      <h3>${c.name}</h3>
      <p>${c.description}</p>
    </div>
  </a>`;
}
