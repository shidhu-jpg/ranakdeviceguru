const img = (name) => `images/${name}.jpg`;

// Filled by RDG.loadCatalog() — see data.js
let products = [];
let categories = [];

const brands = [
  { name: "Samsung", html: "SAMSUNG", cls: "b-samsung" },
  { name: "LG", html: '<i class="lg-dot">LG</i>LG', cls: "b-lg" },
  { name: "Whirlpool", html: "Whirlpool", cls: "b-whirlpool" },
  { name: "IFB", html: "IFB", cls: "b-ifb" },
  { name: "Haier", html: "Haier", cls: "b-haier" },
  { name: "realme", html: "realme", cls: "b-realme" },
  { name: "Xiaomi", html: "mi", cls: "b-mi" },
  { name: "boAt", html: "boAt", cls: "b-boat" },
  { name: "HP", html: "hp", cls: "b-hp" },
  { name: "Lenovo", html: "Lenovo", cls: "b-lenovo" }
];

const features = [
  { icon: "verified", title: "Quality Products", text: "100% Genuine" },
  { icon: "sell", title: "Competitive Pricing", text: "Best Value for Money" },
  { icon: "event_repeat", title: "Flexible Rentals", text: "Affordable Plans" },
  { icon: "local_shipping", title: "Home Delivery", text: "Across India" },
  { icon: "build", title: "Installation Support", text: "For Selected Products" },
  { icon: "support_agent", title: "Customer Support", text: "We're Here to Help" }
];

const announcements = [
  ["local_shipping", "Home delivery &amp; installation support across Motihari"],
  ["credit_card", "Easy EMI options on credit &amp; debit cards"],
  ["event_repeat", "Rent appliances &amp; furniture on flexible monthly plans"]
];

const orderSteps = [
  { key: "new", label: "Order placed", icon: "receipt_long" },
  { key: "confirmed", label: "Confirmed", icon: "task_alt" },
  { key: "out_for_delivery", label: "Out for delivery", icon: "local_shipping" },
  { key: "delivered", label: "Delivered", icon: "home" }
];

const tenures = [3, 6, 12];
const store = RDG.store;
const state = { category: "All", query: "", sort: "featured", showAll: false, cart: [], wishlist: new Set(), pin: "" };
const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
const findProduct = (id) => products.find((product) => product.id === id);
const hasDiscount = (product) => product.mrp && product.mrp > product.price;
const canRent = (product) => Boolean(product.rent);
const discount = (product) => (hasDiscount(product) ? Math.round((1 - product.price / product.mrp) * 100) : 0);
const icon = (name, cls = "") => `<span class="material-symbols-outlined ${cls}" aria-hidden="true">${name}</span>`;
const arrow = icon("arrow_forward", "btn-arrow");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Must match place_order() in supabase/orders.sql
const rentPrice = (product, tenure) => Math.round(product.rent * (tenure === 3 ? 1.3 : tenure === 6 ? 1.12 : 1));

// ---------------------------------------------------------------------------
// Per-visitor persistence (cart, wishlist, delivery PIN). Never required to work.
// ---------------------------------------------------------------------------
const saved = {
  read(key, fallback) {
    try { const value = localStorage.getItem(`rdg.${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(`rdg.${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }
};
state.cart = saved.read("cart", []);
state.wishlist = new Set(saved.read("wishlist", []));
state.pin = saved.read("pin", "845401");
const persistCart = () => saved.write("cart", state.cart);
const persistWishlist = () => saved.write("wishlist", [...state.wishlist]);

function productMedia(product) {
  return product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
    : `<span class="media-placeholder">${icon("image")}</span>`;
}

const groupSlugs = (group) => categories.filter((c) => c.group === group).map((c) => c.slug);
const filterLabel = (filter) => RDG.navGroups.includes(filter) ? filter : categories.find((c) => c.slug === filter)?.name || filter;

function stars(rating) {
  return `<span class="stars" aria-label="Rated ${rating} out of 5">${[1, 2, 3, 4, 5].map((n) => `<span class="star ${rating >= n ? "full" : rating >= n - 0.5 ? "half" : ""}">★</span>`).join("")}</span>`;
}

const skeletonCards = (n, cls) => Array.from({ length: n }, () => `<div class="skeleton ${cls}"><span></span><span></span><span></span></div>`).join("");
const whatsappLink = (text) => (store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : "");

document.querySelector("#store-app").innerHTML = `
  <div class="announce" role="region" aria-label="Store announcements">
    <div class="container announce-inner" id="announce">${announcements.map(([ic, text], i) => `<p class="${i === 0 ? "active" : ""}">${icon(ic)}${text}</p>`).join("")}</div>
  </div>

  <header class="site-header" id="site-header">
    <div class="header-inner container">
      <a class="brand" href="#home" aria-label="Ranak Device Guru home">
        <span class="brand-mark">${icon("devices")}</span>
        <span class="brand-text"><strong>Ranak<br>Device Guru</strong><small>Electronics • Appliances • Furniture</small></span>
      </a>
      <button class="location-button" id="pin-button" type="button">${icon("location_on")}<span><small>Deliver to</small><strong id="pin-label"></strong></span></button>
      <form class="search" id="search-form" role="search" autocomplete="off">
        <input id="search-input" type="search" placeholder="Search for mobiles, TVs, refrigerators, furniture..." aria-label="Search products" aria-controls="search-suggest" aria-expanded="false">
        <button type="submit" aria-label="Search">${icon("search")}</button>
        <div class="search-suggest" id="search-suggest" role="listbox" hidden></div>
      </form>
      <div class="header-actions">
        <button class="header-action" data-action="track" type="button">${icon("package_2")}<small>Track Order</small></button>
        <button class="header-action" data-action="wishlist" type="button">${icon("favorite")}<small>Wishlist</small><span class="badge" id="wishlist-count" hidden>0</span></button>
        <button class="header-action" data-action="cart" type="button">${icon("shopping_cart")}<small>Cart</small><span class="badge" id="cart-count" hidden>0</span></button>
      </div>
    </div>
  </header>

  <nav class="main-nav" aria-label="Main navigation">
    <div class="container main-nav-inner">
      <button class="nav-all" id="mega-toggle" type="button" aria-expanded="false" aria-controls="mega">${icon("menu")} All Categories ${icon("expand_more", "nav-caret")}</button>
      <a href="#catalog" data-filter="Mobiles">Mobiles</a>
      <a href="#catalog" data-filter="Electronics">Electronics</a>
      <a href="#catalog" data-filter="Home Appliances">Home Appliances</a>
      <a href="#catalog" data-filter="Furniture">Furniture</a>
      <a href="#rent">Rent</a>
      <a href="#offers">Offers</a>
      <a href="#support" data-action="support">Service &amp; Support</a>
    </div>
    <div class="mega" id="mega" hidden><div class="container mega-grid" id="mega-grid"></div></div>
  </nav>

  <main id="home">
    <div id="home-sections">
      <section class="hero">
        <img class="hero-bg" id="hero-bg" src="${img("hero")}" alt="Living room with a smart TV, refrigerator, washing machine, smartphone and laptop" fetchpriority="high">
        <div class="hero-chips" aria-hidden="true">
          <span class="hero-chip chip-a" id="chip-discount" hidden>${icon("local_offer")}<b></b></span>
          <span class="hero-chip chip-b" id="chip-rent" hidden>${icon("event_repeat")}<b></b></span>
          <span class="hero-chip chip-c">${icon("verified")}<b>100% genuine products</b></span>
        </div>
        <div class="container hero-inner">
          <div class="hero-copy">
            <h1 class="hero-anim" style="--d:0">Upgrade Your Lifestyle<br><span>with Ranak Device Guru</span></h1>
            <p class="hero-anim" style="--d:1">Latest electronics, home appliances <br>and stylish furniture — now with <br>flexible rental options.</p>
            <div class="hero-actions hero-anim" style="--d:2">
              <a class="btn btn-primary btn-shine" href="#catalog">Shop Now ${arrow}</a>
              <a class="btn btn-outline" href="#rent">Explore Rentals ${arrow}</a>
            </div>
          </div>
        </div>
        <div class="container trust-row hero-anim" style="--d:3">
          <span>${icon("workspace_premium")}Top Brands</span>
          <span>${icon("credit_card")}Easy EMI</span>
          <span>${icon("local_shipping")}Home Delivery</span>
          <span>${icon("handyman")}Installation Support</span>
        </div>
      </section>

      <section class="container section" id="categories">
        <div class="section-head" data-reveal><h2>Shop by Category</h2><a href="#catalog" data-filter="All">View All Categories ${arrow}</a></div>
        <div class="category-grid" id="category-grid">${skeletonCards(10, "sk-category")}</div>
      </section>

      <section class="container promo-grid">
        <a class="promo promo-wide promo-blue" href="#catalog" data-filter="Mobiles" data-reveal>
          <div class="promo-copy"><h3>Latest<br>Smartphones</h3><p>Great Prices, Bigger Possibilities.</p><span class="btn btn-white btn-sm">Shop Now ${arrow}</span></div>
          <img src="${img("promo-phones")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-grey" href="#catalog" data-filter="Home Appliances" data-reveal style="--i:1">
          <div class="promo-copy"><h3>Home Appliances</h3><p class="promo-sub">for a Better Home</p><span class="btn btn-primary btn-sm">Explore Deals ${arrow}</span></div>
          <img src="${img("promo-appliances")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-green" href="#catalog" data-filter="Furniture" data-reveal>
          <div class="promo-copy"><h3>Stylish Furniture</h3><p class="promo-sub">for Every Space</p><span class="btn btn-green btn-sm">Shop Furniture ${arrow}</span></div>
          <img src="${img("promo-furniture")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-wide promo-orange" href="#rent" data-reveal style="--i:1">
          <div class="promo-copy"><h3>Rent What You Need</h3><p>Flexible Plans. Latest Products.</p><span class="btn btn-primary btn-sm">Explore Rentals ${arrow}</span></div>
          <img src="${img("promo-rent")}" alt="" loading="lazy">
        </a>
      </section>
    </div>

    <section class="container section" id="catalog">
      <div class="section-head" data-reveal>
        <h2 id="catalog-title">Bestselling Products</h2>
        <div class="catalog-tools">
          <label><span class="sr-only">Sort products</span><select id="sort-select"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="discount">Biggest discount</option></select></label>
          <button class="link-button" id="view-all" type="button">View All ${arrow}</button>
        </div>
      </div>
      <div class="tabs" id="tabs" role="tablist"></div>
      <div class="product-grid" id="product-grid" aria-live="polite">${skeletonCards(5, "sk-product")}</div>
      <div class="empty-state" id="empty-state" hidden>${icon("search_off")}<h3>No matches found</h3><p>Try a different search or category.</p><button class="btn btn-outline" id="clear-filters" type="button">Show all products</button></div>
    </section>

    <div id="home-sections-2">
      <section class="why">
        <div class="container">
          <h2 data-reveal>Why Choose Ranak Device Guru?</h2>
          <div class="why-grid">${features.map((f, i) => `<div class="why-item" data-reveal style="--i:${i}"><span class="why-icon">${icon(f.icon)}</span><strong>${f.title}</strong><small>${f.text}</small></div>`).join("")}</div>
        </div>
      </section>

      <section class="container section">
        <div class="section-head" data-reveal><h2>Popular Brands</h2><a href="#catalog" data-filter="All">View All Brands ${arrow}</a></div>
        <div class="brand-marquee" data-reveal>
          <div class="brand-track">${[0, 1].map((copy) => `<div class="brand-row" ${copy ? 'aria-hidden="true"' : ""}>${brands.map((b) => `<span class="brand-logo ${b.cls}" ${copy ? "" : `aria-label="${b.name}"`}>${b.html}</span>`).join("")}</div>`).join("")}</div>
        </div>
      </section>

      <section class="container">
        <a class="wide-banner" href="#catalog" data-filter="Furniture" data-reveal>
          <img src="${img("banner-furniture")}" alt="" loading="lazy">
          <div class="wide-banner-copy"><h2>Make Your Home<br>More Beautiful</h2><p>Sofas, Beds, Tables, Chairs &amp; More</p><span class="btn btn-navy btn-sm">Explore Furniture ${arrow}</span></div>
        </a>
      </section>

      <section class="rental-section" id="rent">
        <div class="container">
          <div class="section-head" data-reveal><div><p class="kicker">Rental Deals</p><h2>Get What You Need Without Buying It</h2><p class="muted">Flexible rental plans on mobiles, laptops, appliances and furniture.</p></div><a href="#catalog" id="view-rentals">View All Rentals ${arrow}</a></div>
          <div class="rental-grid" id="rental-grid">${skeletonCards(5, "sk-rental")}</div>
        </div>
      </section>

      <section class="container offer-grid" id="offers">
        <a class="offer offer-festive" href="#catalog" data-sort="discount" data-reveal>
          <div class="promo-copy"><h3>Festive Offers</h3><p>Big Savings for a Brighter Home</p><span class="btn btn-amber btn-sm">Shop Offers ${arrow}</span></div>
          <img src="${img("offer-festive")}" alt="" loading="lazy">
        </a>
        <button class="offer offer-emi" data-action="emi" type="button" data-reveal style="--i:1">
          <div class="promo-copy"><h3>Easy EMI Options</h3><p>Make Your Purchase Easier</p><span class="btn btn-primary btn-sm">Know More ${arrow}</span></div>
          <img src="${img("offer-emi")}" alt="" loading="lazy">
        </button>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <a class="brand brand-light" href="#home"><span class="brand-mark">${icon("devices")}</span><span class="brand-text"><strong>Ranak<br>Device Guru</strong></span></a>
        <p>Electronics, home appliances and furniture — to buy or rent — delivered to your door.</p>
        <ul class="footer-contact">
          ${store.phone ? `<li>${icon("call")}<a href="tel:${store.phone.replace(/[^\d+]/g, "")}">${RDG.esc(store.phone)}</a></li>` : ""}
          ${store.email ? `<li>${icon("mail")}<a href="mailto:${RDG.esc(store.email)}">${RDG.esc(store.email)}</a></li>` : ""}
          ${store.address ? `<li>${icon("location_on")}${RDG.esc(store.address)}</li>` : ""}
        </ul>
      </div>
      <div><h4>Shop</h4><a href="#catalog" data-filter="Mobiles">Mobiles</a><a href="#catalog" data-filter="Electronics">Electronics</a><a href="#catalog" data-filter="Home Appliances">Home Appliances</a><a href="#catalog" data-filter="Furniture">Furniture</a></div>
      <div><h4>Help</h4><button data-action="track" type="button">Track Your Order</button><a href="#support" data-action="support">Service &amp; Support</a><a href="#rent">Rental Plans</a><button data-action="emi" type="button">EMI Options</button></div>
      <div><h4>Company</h4><a href="#privacy" data-info-page="privacy">Privacy Policy</a><a href="#terms" data-info-page="terms">Terms &amp; Conditions</a><a href="admin.html">Owner login</a></div>
    </div>
    <div class="container footer-bottom"><small>© ${new Date().getFullYear()} Ranak Device Guru · Motihari, Bihar</small></div>
  </footer>

  <nav class="mobile-nav" aria-label="Mobile navigation">
    <a href="#home">${icon("home")}<small>Home</small></a>
    <a href="#categories">${icon("grid_view")}<small>Categories</small></a>
    <button data-action="track" type="button">${icon("package_2")}<small>Track</small></button>
    <button data-action="cart" type="button">${icon("shopping_cart")}<small>Cart</small><span class="badge" id="cart-count-mobile" hidden>0</span></button>
  </nav>

  <button class="to-top" id="to-top" type="button" aria-label="Back to top">${icon("arrow_upward")}</button>

  <div class="drawer-overlay" id="drawer-overlay"></div>
  <aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden="true"><div class="drawer-content" id="drawer-content"></div></aside>

  <dialog class="app-dialog" id="app-dialog"><div class="dialog-content" id="dialog-content"></div></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const productGrid = document.querySelector("#product-grid");
const dialog = document.querySelector("#app-dialog");
const dialogContent = document.querySelector("#dialog-content");
const drawer = document.querySelector("#cart-drawer");
const drawerContent = document.querySelector("#drawer-content");
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message, kind = "") {
  toast.innerHTML = `${icon(kind === "error" ? "error" : "check_circle")}<span>${message}</span>`;
  toast.className = `toast visible ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function openDialog(content) {
  dialogContent.innerHTML = `<button class="dialog-close" data-close type="button" aria-label="Close dialog">${icon("close")}</button>${content}`;
  if (!dialog.open) dialog.showModal();
}

// ---------------------------------------------------------------------------
// Scroll reveal: elements with [data-reveal] fade up the first time they enter the viewport
// ---------------------------------------------------------------------------
const revealObserver = "IntersectionObserver" in window && !reducedMotion
  ? new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
  : null;

function observeReveals(root = document) {
  root.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add("in")));
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderCategories() {
  document.querySelector("#category-grid").innerHTML = categories.map((category, i) => `
    <button class="category-card" data-filter="${category.slug}" type="button" data-reveal style="--i:${i % 5}">
      <span class="category-media">${category.image ? `<img src="${category.image}" alt="" loading="lazy">` : icon("category")}</span>
      <span>${category.name}</span>
    </button>`).join("");
  document.querySelector("#mega-grid").innerHTML = categories.map((c) => `
    <button class="mega-item" data-filter="${c.slug}" type="button">
      <span class="mega-thumb">${c.image ? `<img src="${c.image}" alt="" loading="lazy">` : icon("category")}</span>
      <span><b>${c.name}</b><small>${((n) => `${n} product${n === 1 ? "" : "s"}`)(products.filter((p) => p.categorySlug === c.slug).length)}</small></span>
    </button>`).join("");
}

function renderRentals() {
  const deals = products.filter((p) => p.rentDeal && canRent(p));
  document.querySelector("#rent").hidden = deals.length === 0;
  document.querySelector("#rental-grid").innerHTML = deals.map((p, i) => `
    <button class="rental-card" data-rent="${p.id}" type="button" data-reveal style="--i:${i}">
      <span class="rental-media">${productMedia(p)}</span>
      <strong>${p.rentLabel || p.name}</strong>
      <small>From ${money(p.rent)}/month</small>
    </button>`).join("");
}

function renderHeroChips() {
  const best = Math.max(0, ...products.map(discount));
  const rents = products.filter(canRent).map((p) => p.rent);
  const chipDiscount = document.querySelector("#chip-discount");
  const chipRent = document.querySelector("#chip-rent");
  if (best >= 5) { chipDiscount.querySelector("b").textContent = `Up to ${best}% off`; chipDiscount.hidden = false; }
  if (rents.length) { chipRent.querySelector("b").textContent = `Rent from ${money(Math.min(...rents))}/mo`; chipRent.hidden = false; }
}

function filteredProducts() {
  const query = state.query.trim().toLowerCase();
  const allowed = RDG.navGroups.includes(state.category) ? groupSlugs(state.category) : [state.category];
  let result = products.filter((product) => {
    const matchesQuery = !query || `${product.brand} ${product.name} ${product.category} ${product.detail}`.toLowerCase().includes(query);
    const matchesCategory = state.category === "All" || allowed.includes(product.categorySlug);
    return matchesQuery && matchesCategory;
  });
  if (state.sort === "featured") result.sort((a, b) => Number(!!b.bestseller) - Number(!!a.bestseller));
  if (state.sort === "low") result.sort((a, b) => a.price - b.price);
  if (state.sort === "high") result.sort((a, b) => b.price - a.price);
  if (state.sort === "discount") result.sort((a, b) => discount(b) - discount(a));
  return result;
}

function productCard(product, index = 0) {
  const isSaved = state.wishlist.has(product.id);
  return `
    <article class="product-card" data-reveal style="--i:${index % 5}">
      ${hasDiscount(product) && discount(product) >= 20 ? `<span class="deal-tag">${discount(product)}% OFF</span>` : ""}
      <button class="wish ${isSaved ? "saved" : ""}" data-wishlist="${product.id}" type="button" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove from" : "Add to"} wishlist">${icon("favorite")}</button>
      <a class="product-media" href="#product/${product.id}" data-details="${product.id}">${productMedia(product)}</a>
      <a class="product-name" href="#product/${product.id}" data-details="${product.id}">${product.name}</a>
      <p class="product-detail">${product.detail}</p>
      ${product.rating ? `<p class="rating">${stars(product.rating)}${product.reviews ? `<small>(${product.reviews})</small>` : ""}</p>` : ""}
      <p class="price"><strong>${money(product.price)}</strong>${hasDiscount(product) ? `<s>${money(product.mrp)}</s>` : ""}</p>
      ${hasDiscount(product) ? `<span class="off">${discount(product)}% off</span>` : ""}
      <div class="card-actions">
        <button class="btn btn-primary btn-xs" data-buy="${product.id}" type="button">Buy Now</button>
        ${canRent(product) ? `<button class="btn btn-outline btn-xs" data-rent="${product.id}" type="button">Rent ${money(product.rent)}/mo</button>` : `<button class="btn btn-outline btn-xs" data-add="${product.id}" type="button">${icon("add_shopping_cart")}Add</button>`}
      </div>
    </article>`;
}

const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0);

function updateBadges(bump = false) {
  [["#cart-count", cartCount()], ["#cart-count-mobile", cartCount()], ["#wishlist-count", state.wishlist.size]].forEach(([sel, n]) => {
    const badge = document.querySelector(sel);
    badge.textContent = n;
    badge.hidden = n === 0;
    if (bump && sel !== "#wishlist-count" && n) { badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump"); }
  });
}

function renderProducts() {
  const result = filteredProducts();
  const limited = state.showAll || state.query || state.category !== "All" ? result : result.slice(0, 5);
  productGrid.innerHTML = limited.map(productCard).join("");
  productGrid.hidden = result.length === 0;
  document.querySelector("#empty-state").hidden = result.length > 0;
  document.querySelector("#view-all").hidden = limited.length === result.length;
  document.querySelector("#catalog-title").innerHTML = state.query
    ? `Results for “${RDG.esc(state.query)}”`
    : state.category === "All" ? (state.showAll ? "All Products" : "Bestselling Products") : filterLabel(state.category);
  const tabs = [{ filter: "All", label: "All" }, ...categories.map((c) => ({ filter: c.slug, label: c.name }))];
  if (!tabs.some((t) => t.filter === state.category)) tabs.push({ filter: state.category, label: filterLabel(state.category) });
  document.querySelector("#tabs").innerHTML = tabs.map((tab) => `<button class="tab ${state.category === tab.filter ? "active" : ""}" role="tab" aria-selected="${state.category === tab.filter}" data-filter="${tab.filter}" type="button">${tab.label}</button>`).join("");
  document.querySelector("#sort-select").value = state.sort;
  updateBadges();
  observeReveals(productGrid);
}

function setFilter(category) {
  state.category = category;
  state.query = "";
  document.querySelector("#search-input").value = "";
  closeMega();
  goHome();
  renderProducts();
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
}

function addToCart(product, mode = "buy", tenure = 12, quantity = 1, silent = false) {
  const key = mode === "rent" ? `${product.id}:rent:${tenure}` : `${product.id}:buy`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
  else state.cart.push({ key, id: product.id, mode, tenure, quantity: Math.min(10, quantity) });
  persistCart();
  updateBadges(true);
  if (!silent) showToast(mode === "rent" ? `${product.name} added on rent (${tenure} months)` : `${product.name} added to cart`);
}

function showRent(product) {
  openDialog(`
    <div class="rent-dialog">
      <div class="rent-media">${productMedia(product)}</div>
      <p class="eyebrow">Rent with flexible plans</p>
      <h2>${product.name}</h2>
      <p class="muted">${product.detail}</p>
      <div class="tenure-list" role="radiogroup" aria-label="Rental tenure">
        ${tenures.map((t) => `<label class="tenure"><input type="radio" name="tenure" value="${t}" ${t === 12 ? "checked" : ""}><span>${t === 12 ? `<em>Best value</em>` : ""}<strong>${t} months</strong><small>${money(rentPrice(product, t))}/month</small></span></label>`).join("")}
      </div>
      <p class="fine">Our team will call to confirm delivery, installation and the refundable security deposit before your rental starts.</p>
      <button class="btn btn-primary btn-block" data-confirm-rent="${product.id}" type="button">Add rental to cart</button>
    </div>`);
}

const lineTotal = (item) => {
  const product = findProduct(item.id);
  return (item.mode === "rent" ? rentPrice(product, item.tenure) : product.price) * item.quantity;
};
const totals = () => ({
  buy: state.cart.filter((i) => i.mode === "buy").reduce((s, i) => s + lineTotal(i), 0),
  rent: state.cart.filter((i) => i.mode === "rent").reduce((s, i) => s + lineTotal(i), 0)
});

// ---------------------------------------------------------------------------
// Cart drawer → checkout → confirmation
// ---------------------------------------------------------------------------
let lastFocus = null;

function openDrawer(view = "cart") {
  lastFocus = document.activeElement;
  renderDrawer(view);
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.querySelector("#drawer-overlay").classList.add("open");
  document.body.classList.add("lock");
  setTimeout(() => drawer.querySelector("button, input")?.focus(), 50);
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.querySelector("#drawer-overlay").classList.remove("open");
  document.body.classList.remove("lock");
  lastFocus?.focus?.();
}

const drawerHead = (title, back = false) => `<div class="drawer-head">${back ? `<button class="icon-round" data-drawer-view="cart" type="button" aria-label="Back to cart">${icon("arrow_back")}</button>` : ""}<h2>${title}</h2><button class="icon-round" data-drawer-close type="button" aria-label="Close cart">${icon("close")}</button></div>`;

function renderDrawer(view, data) {
  if (view === "cart") drawerContent.innerHTML = cartView();
  if (view === "checkout") drawerContent.innerHTML = checkoutView();
  if (view === "done") drawerContent.innerHTML = doneView(data);
  drawerContent.scrollTop = 0;
  if (view === "checkout") bindCheckout();
}

function cartView() {
  const { buy, rent } = totals();
  const lines = state.cart.map((item) => {
    const product = findProduct(item.id);
    return `<div class="cart-line"><span class="cart-thumb">${productMedia(product)}</span><div><strong>${product.name}</strong><small>${item.mode === "rent" ? `Rent · ${item.tenure} months · ${money(rentPrice(product, item.tenure))}/mo` : `Buy · ${money(product.price)}`}</small><div class="qty"><button data-qty="${item.key}" data-delta="-1" type="button" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-qty="${item.key}" data-delta="1" type="button" aria-label="Increase quantity" ${item.quantity >= 10 ? "disabled" : ""}>+</button><button class="remove" data-remove="${item.key}" type="button">Remove</button></div></div><b>${money(lineTotal(item))}${item.mode === "rent" ? "<small>/mo</small>" : ""}</b></div>`;
  }).join("");
  if (!lines) return `${drawerHead("Your Cart")}<div class="drawer-empty">${icon("shopping_cart")}<h3>Your cart is empty</h3><p>Explore our bestsellers and rental deals.</p><button class="btn btn-primary" data-drawer-close data-goto="catalog" type="button">Start shopping ${arrow}</button></div>`;
  return `${drawerHead(`Your Cart <span>(${cartCount()})</span>`)}
    <div class="drawer-body">${lines}</div>
    <div class="drawer-foot">
      ${buy ? `<p><span>Purchase total</span><strong>${money(buy)}</strong></p>` : ""}
      ${rent ? `<p><span>Monthly rent</span><strong>${money(rent)}/mo</strong></p>` : ""}
      <small>${icon("local_shipping")} Delivery &amp; installation confirmed by our team after you order.</small>
      <button class="btn btn-primary btn-block btn-shine" data-drawer-view="checkout" type="button">Proceed to Checkout ${arrow}</button>
    </div>`;
}

function checkoutView() {
  const { buy, rent } = totals();
  const draft = saved.read("customer", {});
  const v = (k) => RDG.esc(draft[k] || "");
  return `${drawerHead("Checkout", true)}
    <form class="drawer-body checkout-form" id="checkout-form" novalidate>
      <div class="checkout-summary">${state.cart.map((item) => { const p = findProduct(item.id); return `<span class="cart-thumb sm" title="${p.name}">${productMedia(p)}<i>${item.quantity}</i></span>`; }).join("")}</div>
      <h3 class="form-section">${icon("person")} Contact details</h3>
      <label class="field">Full name<input name="name" autocomplete="name" required minlength="2" maxlength="80" value="${v("name")}"></label>
      <label class="field">Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile number" value="${v("phone")}"></label>
      <h3 class="form-section">${icon("home_pin")} Delivery address</h3>
      <label class="field">House, street, area<textarea name="address" rows="3" autocomplete="street-address" required minlength="10" maxlength="400">${v("address")}</textarea></label>
      <label class="field">PIN code<input name="pincode" inputmode="numeric" autocomplete="postal-code" required pattern="[1-9][0-9]{5}" maxlength="6" value="${RDG.esc(draft.pincode || state.pin || "")}"></label>
      <label class="field">Notes for our team <span class="optional">(optional)</span><input name="notes" maxlength="300" placeholder="Preferred delivery time, landmark…" value="${v("notes")}"></label>
      <div class="pay-note">${icon("payments")}<div><b>Pay on delivery</b><small>Cash or UPI when your order arrives. For rentals, our team confirms the plan and refundable deposit on a call.</small></div></div>
      <p class="form-error" id="checkout-error" role="alert"></p>
      <div class="checkout-total">
        ${buy ? `<p><span>Purchase total</span><strong>${money(buy)}</strong></p>` : ""}
        ${rent ? `<p><span>Monthly rent</span><strong>${money(rent)}/mo</strong></p>` : ""}
      </div>
      <button class="btn btn-primary btn-block btn-shine" type="submit">${icon("lock")} Place Order</button>
    </form>`;
}

function doneView(order) {
  const msg = `Hello Ranak Device Guru, I just placed order ${order.order_number}.`;
  const wa = whatsappLink(msg);
  return `${drawerHead("Order placed")}
    <div class="drawer-body done">
      <svg class="done-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg>
      <h3>Thank you, ${RDG.esc(order.name)}!</h3>
      <p>Your order number is</p>
      <p class="order-no">${RDG.esc(order.order_number)}</p>
      <p class="muted">We'll call you on <b>${RDG.esc(order.phone)}</b> to confirm delivery${order.monthly_rent_total ? ", rental plan" : ""} and installation.</p>
      <div class="checkout-total">
        ${order.purchase_total ? `<p><span>Pay on delivery</span><strong>${money(order.purchase_total)}</strong></p>` : ""}
        ${order.monthly_rent_total ? `<p><span>Monthly rent</span><strong>${money(order.monthly_rent_total)}/mo</strong></p>` : ""}
      </div>
      ${wa ? `<a class="btn btn-green btn-block" href="${wa}" target="_blank" rel="noopener">${icon("chat")} Send on WhatsApp</a>` : ""}
      <button class="btn btn-outline btn-block" data-action="track" data-order="${RDG.esc(order.order_number)}" data-phone="${RDG.esc(order.phone)}" type="button">${icon("package_2")} Track this order</button>
      <button class="btn btn-primary btn-block" data-drawer-close type="button">Continue shopping</button>
    </div>`;
}

function bindCheckout() {
  const form = document.querySelector("#checkout-form");
  form.addEventListener("input", () => {
    const data = Object.fromEntries(new FormData(form));
    saved.write("customer", data);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.querySelector("#checkout-error");
    const data = Object.fromEntries(new FormData(form));
    data.phone = data.phone.replace(/\D/g, "").slice(-10);
    const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
    if (invalid) {
      invalid.focus();
      error.textContent = invalid.name === "phone" ? "Please enter a valid 10-digit mobile number." : invalid.name === "pincode" ? "Please enter a valid 6-digit PIN code." : `Please fill in your ${invalid.closest("label").firstChild.textContent.trim().toLowerCase()}.`;
      return;
    }
    if (!RDG.configured) {
      error.textContent = "Online ordering isn't connected yet. Please call or WhatsApp us to order.";
      return;
    }
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> Placing order…`;
    error.textContent = "";
    const items = state.cart.map((i) => ({ product_id: i.id, mode: i.mode, tenure: i.mode === "rent" ? i.tenure : null, quantity: i.quantity }));
    const { data: order, error: rpcError } = await RDG.client.rpc("place_order", { p_customer: data, p_items: items });
    if (rpcError) {
      button.disabled = false;
      button.innerHTML = `${icon("lock")} Place Order`;
      error.textContent = /function|schema cache/i.test(rpcError.message || "")
        ? "Online ordering is being set up. Please call or WhatsApp us to place your order."
        : rpcError.message || "We couldn't place your order. Please try again.";
      return;
    }
    state.cart = [];
    persistCart();
    updateBadges();
    saved.write("lastOrder", { order_number: order.order_number, phone: data.phone });
    renderDrawer("done", { ...order, name: data.name.split(" ")[0], phone: data.phone });
  });
}

// ---------------------------------------------------------------------------
// Order tracking
// ---------------------------------------------------------------------------
function showTrack(prefill = saved.read("lastOrder", {})) {
  openDialog(`<form class="info-dialog" id="track-form">
    <p class="eyebrow">Track your order</p>
    <h2>Where's my order?</h2>
    <p>Enter the order number from your confirmation and the mobile number you ordered with.</p>
    <label class="field">Order number<input name="order" required placeholder="e.g. RDG-1A2B3C" value="${RDG.esc(prefill.order_number || "")}" autocapitalize="characters"></label>
    <label class="field">Mobile number<input name="phone" type="tel" inputmode="numeric" required maxlength="10" placeholder="10-digit mobile number" value="${RDG.esc(prefill.phone || "")}"></label>
    <p class="form-error" id="track-error" role="alert"></p>
    <button class="btn btn-primary btn-block" type="submit">${icon("search")} Track order</button>
    <div id="track-result"></div>
  </form>`);
  document.querySelector("#track-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const err = document.querySelector("#track-error");
    const result = document.querySelector("#track-result");
    err.textContent = "";
    if (!RDG.configured) { err.textContent = "Order tracking isn't connected yet."; return; }
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true;
    const { data, error } = await RDG.client.rpc("track_order", { p_order_number: form.get("order"), p_phone: form.get("phone") });
    button.disabled = false;
    if (error) { err.textContent = /function|schema cache/i.test(error.message) ? "Order tracking is being set up. Please contact us for an update." : error.message; return; }
    if (!data) { result.innerHTML = ""; err.textContent = "We couldn't find an order with those details. Check the order number and mobile number."; return; }
    const current = orderSteps.findIndex((s) => s.key === data.status);
    result.innerHTML = `<div class="track-card">
      <div class="track-head"><b>${RDG.esc(data.order_number)}</b><small>Placed ${new Date(data.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></div>
      ${data.status === "cancelled" ? `<p class="track-cancelled">${icon("cancel")} This order was cancelled. Contact us if you have questions.</p>` : `<ol class="timeline">${orderSteps.map((s, i) => `<li class="${i <= current ? "done" : ""} ${i === current ? "current" : ""}">${icon(s.icon)}<span>${s.label}</span></li>`).join("")}</ol>`}
      <ul class="track-items">${data.items.map((it) => `<li><span>${RDG.esc(it.name)} × ${it.quantity}</span><b>${it.mode === "rent" ? `${money(it.unit_price * it.quantity)}/mo · ${it.tenure} mo` : money(it.unit_price * it.quantity)}</b></li>`).join("")}</ul>
    </div>`;
  });
}

// ---------------------------------------------------------------------------
// Product page (#product/<id>)
// ---------------------------------------------------------------------------
let productQuantity = 1;
const homeBlocks = () => [document.querySelector("#home-sections"), document.querySelector("#catalog"), document.querySelector("#home-sections-2")];

function goHome() {
  if (location.hash.startsWith("#product/")) history.pushState({}, "", "#catalog");
  syncRoute(false);
}

function syncRoute(scroll = true) {
  const match = location.hash.match(/^#product\/([^/?#]+)/);
  const product = match && findProduct(decodeURIComponent(match[1]));
  let page = document.querySelector("#product-view");
  homeBlocks().forEach((block) => { block.hidden = !!product; });
  if (!product) {
    if (page) page.hidden = true;
    document.title = "Ranak Device Guru | Electronics, Appliances & Furniture";
    return;
  }
  if (!page) {
    page = document.createElement("section");
    page.id = "product-view";
    page.className = "container product-view";
    document.querySelector("#home").append(page);
  }
  page.hidden = false;
  productQuantity = 1;
  document.title = `${new DOMParser().parseFromString(product.name, "text/html").body.textContent} | Ranak Device Guru`;
  const related = products.filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug).slice(0, 5);
  page.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a><span>/</span><a href="#catalog" data-filter="${product.categorySlug}">${product.category}</a><span>/</span><span>${product.name}</span></nav>
    <div class="pdp">
      <div class="pdp-media pdp-zoom" id="pdp-zoom">${productMedia(product)}${hasDiscount(product) ? `<span class="deal-tag">${discount(product)}% OFF</span>` : ""}</div>
      <div class="pdp-info">
        <p class="eyebrow">${product.brand ? `${product.brand} · ` : ""}${product.category}</p>
        <h1>${product.name}</h1>
        <p class="muted">${product.detail}</p>
        ${product.rating ? `<p class="rating">${stars(product.rating)}<small>${product.rating}${product.reviews ? ` (${product.reviews} ratings)` : ""}</small></p>` : ""}
        <p class="price price-lg"><strong>${money(product.price)}</strong>${hasDiscount(product) ? `<s>${money(product.mrp)}</s><span class="off">${discount(product)}% off</span>` : ""}</p>
        <p class="emi-note">${icon("credit_card")} EMI from ${money(Math.round(product.price / 12))}/month${canRent(product) ? ` · or rent from ${money(product.rent)}/month` : ""}</p>
        <div class="qty-row"><span>Quantity</span><div class="qty"><button data-pdp-qty="-1" type="button" aria-label="Decrease quantity">−</button><output id="pdp-qty">1</output><button data-pdp-qty="1" type="button" aria-label="Increase quantity">+</button></div></div>
        <div class="pdp-actions">
          <button class="btn btn-primary btn-shine" data-pdp-buy="${product.id}" type="button">Buy Now</button>
          <button class="btn btn-outline" data-pdp-add="${product.id}" type="button">${icon("add_shopping_cart")} Add to Cart</button>
          ${canRent(product) ? `<button class="btn btn-outline" data-rent="${product.id}" type="button">Rent ${money(product.rent)}/mo</button>` : ""}
          <button class="icon-round wish-lg ${state.wishlist.has(product.id) ? "saved" : ""}" data-wishlist="${product.id}" type="button" aria-label="Save to wishlist">${icon("favorite")}</button>
        </div>
        <label class="pin-check">Check delivery<div><input id="pdp-pin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code" value="${RDG.esc(state.pin)}"><button data-pin-check type="button">Check</button></div></label>
        <p class="pin-result" id="pin-result"></p>
        <ul class="pdp-perks"><li>${icon("verified")}100% genuine product</li><li>${icon("local_shipping")}Home delivery</li><li>${icon("build")}Installation support on selected products</li><li>${icon("payments")}Pay on delivery — cash or UPI</li></ul>
      </div>
    </div>
    ${related.length ? `<section class="section"><div class="section-head"><h2>More in ${product.category}</h2></div><div class="product-grid">${related.map(productCard).join("")}</div></section>` : ""}`;
  bindZoom();
  observeReveals(page);
  if (scroll) window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}

// Hover-to-zoom on the product photo (desktop pointers only)
function bindZoom() {
  const box = document.querySelector("#pdp-zoom");
  const image = box?.querySelector("img");
  if (!image || reducedMotion || !window.matchMedia("(hover: hover)").matches) return;
  box.addEventListener("mousemove", (e) => {
    const r = box.getBoundingClientRect();
    image.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    image.style.transform = "scale(1.8)";
  });
  box.addEventListener("mouseleave", () => { image.style.transform = ""; });
}

// ---------------------------------------------------------------------------
// Info dialogs
// ---------------------------------------------------------------------------
const contactLines = () => [
  store.phone && `<li>${icon("call")}<a href="tel:${store.phone.replace(/[^\d+]/g, "")}">${RDG.esc(store.phone)}</a></li>`,
  store.whatsapp && `<li>${icon("chat")}<a href="${whatsappLink("Hello Ranak Device Guru")}" target="_blank" rel="noopener">Chat on WhatsApp</a></li>`,
  store.email && `<li>${icon("mail")}<a href="mailto:${RDG.esc(store.email)}">${RDG.esc(store.email)}</a></li>`,
  store.address && `<li>${icon("location_on")}${RDG.esc(store.address)}</li>`
].filter(Boolean).join("");

function showInfoPage(page) {
  const privacy = `
    <p>Ranak Device Guru ("we") respects your privacy. This policy explains what we collect when you use this website and how we use it.</p>
    <h3>What we collect</h3><p>When you place an order we collect your name, mobile number, delivery address, PIN code and any notes you add. We don't collect card or bank details — payment is made on delivery.</p>
    <h3>How we use it</h3><p>Only to process and deliver your order, arrange installation or rentals, contact you about your order, and provide support. We do not sell or rent your information to anyone.</p>
    <h3>Storage</h3><p>Order details are stored securely with our hosting provider (Supabase) and are only accessible to the store owner. Your cart and wishlist are saved in your own browser.</p>
    <h3>Your choices</h3><p>You can ask us to view, correct or delete your order information at any time using the contact details below.</p>`;
  const terms = `
    <p>By ordering from Ranak Device Guru you agree to these terms.</p>
    <h3>Prices &amp; availability</h3><p>Prices are in Indian Rupees and include applicable taxes unless stated otherwise. Availability and delivery to your PIN code are confirmed by our team after you order. We may cancel an order if a product is unavailable.</p>
    <h3>Payment</h3><p>Pay by cash or UPI on delivery. EMI options are subject to your bank's eligibility.</p>
    <h3>Rentals</h3><p>Rental plans run for the tenure you choose (3, 6 or 12 months) at the monthly rate shown. A refundable security deposit may apply and is explained before delivery. Rented products remain our property and must be returned in good condition, allowing for normal wear.</p>
    <h3>Warranty &amp; returns</h3><p>New products carry the manufacturer's warranty. Please check products at delivery and report any damage or missing items within 48 hours.</p>
    <h3>Jurisdiction</h3><p>These terms are governed by the laws of India, with courts at Motihari, Bihar having jurisdiction.</p>`;
  openDialog(`<div class="info-dialog legal"><p class="eyebrow">Ranak Device Guru</p><h2>${page === "privacy" ? "Privacy Policy" : "Terms &amp; Conditions"}</h2>${page === "privacy" ? privacy : terms}${contactLines() ? `<h3>Contact</h3><ul class="pdp-perks">${contactLines()}</ul>` : ""}<button class="btn btn-primary" data-close type="button">Close</button></div>`);
}

// ---------------------------------------------------------------------------
// Search suggestions
// ---------------------------------------------------------------------------
const searchInput = document.querySelector("#search-input");
const suggestBox = document.querySelector("#search-suggest");
let suggestIndex = -1;

function renderSuggestions() {
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) return hideSuggestions();
  const matches = products.filter((p) => `${p.brand} ${p.name} ${p.category}`.toLowerCase().includes(q)).slice(0, 6);
  const cats = categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 2);
  suggestIndex = -1;
  suggestBox.innerHTML = (cats.map((c) => `<button class="suggest-item suggest-cat" data-filter="${c.slug}" type="button" role="option">${icon("category")}<span>${c.name}</span><small>Category</small></button>`).join("")
    + matches.map((p) => `<button class="suggest-item" data-details="${p.id}" type="button" role="option"><span class="suggest-thumb">${productMedia(p)}</span><span>${p.name}</span><small>${money(p.price)}</small></button>`).join(""))
    || `<p class="suggest-empty">No products match “${RDG.esc(searchInput.value.trim())}”</p>`;
  if (matches.length) suggestBox.innerHTML += `<button class="suggest-all" data-search-all type="button">See all results ${arrow}</button>`;
  suggestBox.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
}

function hideSuggestions() {
  suggestBox.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
}

function runSearch() {
  state.query = searchInput.value;
  state.category = "All";
  hideSuggestions();
  goHome();
  renderProducts();
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Mega menu
// ---------------------------------------------------------------------------
const megaToggle = document.querySelector("#mega-toggle");
function closeMega() {
  document.querySelector("#mega").hidden = true;
  megaToggle.setAttribute("aria-expanded", "false");
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function updatePinLabel() {
  document.querySelector("#pin-label").textContent = state.pin === "845401" ? "Motihari, Bihar 845401" : state.pin;
}

async function init() {
  updatePinLabel();
  updateBadges();
  observeReveals();
  try {
    ({ categories, products } = await RDG.loadCatalog());
  } catch (error) {
    console.error("Could not load catalogue", error);
    productGrid.innerHTML = "";
    document.querySelector("#category-grid").innerHTML = "";
    document.querySelector("#rental-grid").innerHTML = "";
    document.querySelector("#empty-state").hidden = false;
    document.querySelector("#empty-state h3").textContent = "Couldn't load products";
    document.querySelector("#empty-state p").textContent = "Please check your connection and refresh the page.";
    return;
  }
  // Drop saved cart/wishlist entries for products that no longer exist
  state.cart = state.cart.filter((item) => findProduct(item.id) && (item.mode !== "rent" || canRent(findProduct(item.id))));
  state.wishlist = new Set([...state.wishlist].filter((id) => findProduct(id)));
  persistCart();
  persistWishlist();
  renderCategories();
  renderRentals();
  renderHeroChips();
  renderProducts();
  observeReveals();
  syncRoute(false);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) hideSuggestions();
  if (!event.target.closest("#mega, #mega-toggle")) closeMega();
  const target = event.target.closest("button, a");
  if (!target) return;
  const d = target.dataset;

  if (d.close !== undefined) return dialog.close();
  if (d.drawerView) return renderDrawer(d.drawerView);
  if (d.drawerClose !== undefined) {
    closeDrawer();
    if (d.goto) document.querySelector(`#${d.goto}`).scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (target === megaToggle) {
    const mega = document.querySelector("#mega");
    mega.hidden = !mega.hidden;
    megaToggle.setAttribute("aria-expanded", String(!mega.hidden));
    return;
  }
  if (d.searchAll !== undefined) return runSearch();
  if (d.filter) { event.preventDefault(); dialog.close(); return setFilter(d.filter); }
  if (d.sort) { event.preventDefault(); state.sort = d.sort; state.showAll = true; return setFilter("All"); }
  if (d.details) { event.preventDefault(); dialog.close(); hideSuggestions(); history.pushState({}, "", `#product/${d.details}`); return syncRoute(); }
  if (d.wishlist) {
    const id = d.wishlist;
    state.wishlist.has(id) ? state.wishlist.delete(id) : state.wishlist.add(id);
    persistWishlist();
    document.querySelectorAll(`[data-wishlist="${id}"]`).forEach((btn) => {
      btn.classList.toggle("saved", state.wishlist.has(id));
      btn.setAttribute("aria-pressed", String(state.wishlist.has(id)));
      if (state.wishlist.has(id)) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    });
    updateBadges();
    return showToast(state.wishlist.has(id) ? "Saved to your wishlist" : "Removed from your wishlist");
  }
  if (d.buy) { dialog.close(); addToCart(findProduct(d.buy), "buy", 12, 1, true); return openDrawer("cart"); }
  if (d.add) {
    addToCart(findProduct(d.add));
    target.classList.add("added");
    target.innerHTML = `${icon("check")}Added`;
    return setTimeout(() => { target.classList.remove("added"); target.innerHTML = `${icon("add_shopping_cart")}Add`; }, 1400);
  }
  if (d.rent) return showRent(findProduct(d.rent));
  if (d.confirmRent) {
    const tenure = Number(dialog.querySelector("input[name=tenure]:checked").value);
    addToCart(findProduct(d.confirmRent), "rent", tenure, 1, true);
    dialog.close();
    return openDrawer("cart");
  }
  if (d.pdpQty) { productQuantity = Math.min(10, Math.max(1, productQuantity + Number(d.pdpQty))); document.querySelector("#pdp-qty").value = productQuantity; return; }
  if (d.pdpAdd) return addToCart(findProduct(d.pdpAdd), "buy", 12, productQuantity);
  if (d.pdpBuy) { addToCart(findProduct(d.pdpBuy), "buy", 12, productQuantity, true); return openDrawer("cart"); }
  if (d.pinCheck !== undefined) {
    const pin = document.querySelector("#pdp-pin").value.trim();
    const out = document.querySelector("#pin-result");
    if (!/^[1-9]\d{5}$/.test(pin)) { out.className = "pin-result error"; out.textContent = "Enter a valid 6-digit PIN code."; return; }
    state.pin = pin;
    saved.write("pin", pin);
    updatePinLabel();
    out.className = "pin-result ok";
    out.innerHTML = `${icon("check_circle")} We'll confirm delivery &amp; installation to ${pin} when our team calls after your order.`;
    return;
  }
  if (d.qty) {
    const item = state.cart.find((entry) => entry.key === d.qty);
    if (item) item.quantity = Math.min(10, item.quantity + Number(d.delta));
    state.cart = state.cart.filter((entry) => entry.quantity > 0);
    persistCart();
    updateBadges();
    return renderDrawer("cart");
  }
  if (d.remove) { state.cart = state.cart.filter((entry) => entry.key !== d.remove); persistCart(); updateBadges(); return renderDrawer("cart"); }
  if (d.infoPage) { event.preventDefault(); return showInfoPage(d.infoPage); }

  switch (d.action) {
    case "cart": return openDrawer("cart");
    case "track":
      if (drawer.classList.contains("open")) closeDrawer();
      return showTrack(d.order ? { order_number: d.order, phone: d.phone } : undefined);
    case "support": event.preventDefault(); return openDialog(`<div class="info-dialog"><p class="eyebrow">Service &amp; Support</p><h2>We're here to help</h2><ul class="pdp-perks"><li>${icon("build")}Installation &amp; demo for TVs, ACs, washing machines and refrigerators</li><li>${icon("event_repeat")}Free maintenance on 12-month rental plans</li><li>${icon("package_2")}<button class="link-button" data-action="track" type="button">Track an existing order</button></li>${contactLines()}</ul><button class="btn btn-primary" data-close type="button">Close</button></div>`);
    case "emi": return openDialog(`<div class="info-dialog"><p class="eyebrow">Easy EMI Options</p><h2>Pay in easy monthly instalments</h2><ul class="pdp-perks"><li>${icon("credit_card")}Credit &amp; debit card EMI on major banks</li><li>${icon("percent")}No-cost EMI on selected products</li><li>${icon("schedule")}Tenures from 3 to 24 months</li></ul><p class="fine">EMI eligibility and interest are confirmed by our team before delivery.</p><button class="btn btn-primary" data-close type="button">Got it</button></div>`);
    case "wishlist": {
      const list = products.filter((p) => state.wishlist.has(p.id));
      return openDialog(`<div class="cart-dialog"><h2>Your Wishlist</h2>${list.length ? list.map((p) => `<div class="cart-line"><span class="cart-thumb">${productMedia(p)}</span><div><strong>${p.name}</strong><small>${money(p.price)}</small></div><div class="wish-actions"><button class="btn btn-primary btn-xs" data-buy="${p.id}" type="button">Buy</button><a class="link-button" data-details="${p.id}" href="#product/${p.id}">View</a></div></div>`).join("") : `<div class="empty-state">${icon("favorite")}<p>Save products to find them here.</p><button class="btn btn-outline" data-close type="button">Keep browsing</button></div>`}</div>`);
    }
  }
  if (target.id === "pin-button") return openDialog(`<div class="info-dialog"><p class="eyebrow">Delivery location</p><h2>Where should we deliver?</h2><label class="field">6-digit PIN code<input id="location-pin" inputmode="numeric" maxlength="6" placeholder="e.g. 845401" value="${RDG.esc(state.pin)}"></label><button class="btn btn-primary btn-block" data-save-pin type="button">Set location</button></div>`);
  if (d.savePin !== undefined) {
    const pin = document.querySelector("#location-pin").value.trim();
    if (!/^[1-9]\d{5}$/.test(pin)) return showToast("Enter a valid 6-digit PIN code", "error");
    state.pin = pin;
    saved.write("pin", pin);
    updatePinLabel();
    dialog.close();
    return showToast("Delivery location updated");
  }
  if (target.id === "view-all") { state.showAll = true; return renderProducts(); }
  if (target.id === "clear-filters") { state.query = ""; searchInput.value = ""; return setFilter("All"); }
  if (target.id === "view-rentals") { event.preventDefault(); return document.querySelector(".rental-grid").scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (target.id === "to-top") return window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  if (target.matches("a[href^='#']") && !target.hash.startsWith("#product/") && location.hash.startsWith("#product/")) {
    event.preventDefault();
    history.pushState({}, "", target.hash);
    syncRoute(false);
    document.querySelector(target.hash)?.scrollIntoView({ behavior: "smooth" });
  }
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const active = suggestBox.querySelectorAll(".suggest-item")[suggestIndex];
  if (active && !suggestBox.hidden) return active.click();
  runSearch();
});
searchInput.addEventListener("input", () => {
  if (!searchInput.value && state.query) { state.query = ""; renderProducts(); }
  renderSuggestions();
});
searchInput.addEventListener("focus", renderSuggestions);
searchInput.addEventListener("keydown", (event) => {
  const items = [...suggestBox.querySelectorAll(".suggest-item")];
  if (event.key === "Escape") return hideSuggestions();
  if (!items.length || suggestBox.hidden || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  suggestIndex = (suggestIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle("active", i === suggestIndex));
});

document.querySelector("#sort-select").addEventListener("change", (event) => { state.sort = event.target.value; renderProducts(); });
document.querySelector("#drawer-overlay").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
  if (event.key === "Escape") closeMega();
});
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
window.addEventListener("popstate", () => syncRoute(false));

// Header state, back-to-top and a gentle hero parallax, batched per animation frame
const header = document.querySelector("#site-header");
const toTop = document.querySelector("#to-top");
const heroBg = document.querySelector("#hero-bg");
let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 40);
    toTop.classList.toggle("show", y > 900);
    if (!reducedMotion && y < 700) heroBg.style.setProperty("--parallax", `${y * 0.12}px`);
    ticking = false;
  });
}, { passive: true });

// Rotate the announcement bar
if (!reducedMotion) {
  let current = 0;
  setInterval(() => {
    const items = document.querySelectorAll("#announce p");
    items[current].classList.remove("active");
    current = (current + 1) % items.length;
    items[current].classList.add("active");
  }, 4500);
}

init();
