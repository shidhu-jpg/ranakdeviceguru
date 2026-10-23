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

const tenures = [3, 6, 12];
const state = { category: "All", query: "", sort: "featured", showAll: false, cart: [], wishlist: new Set(), pin: "Motihari, Bihar 845401" };
const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
const findProduct = (id) => products.find((product) => product.id === id);
const discount = (product) => (hasDiscount(product) ? Math.round((1 - product.price / product.mrp) * 100) : 0);
const icon = (name, cls = "") => `<span class="material-symbols-outlined ${cls}" aria-hidden="true">${name}</span>`;
const arrow = icon("arrow_forward", "btn-arrow");

function productMedia(product) {
  return product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
    : `<span class="media-placeholder">${icon("image")}</span>`;
}

const groupSlugs = (group) => categories.filter((c) => c.group === group).map((c) => c.slug);
const filterLabel = (filter) => RDG.navGroups.includes(filter) ? filter : categories.find((c) => c.slug === filter)?.name || filter;
const hasDiscount = (product) => product.mrp && product.mrp > product.price;
const canRent = (product) => Boolean(product.rent);

function stars(rating) {
  return `<span class="stars" aria-label="Rated ${rating} out of 5">${[1, 2, 3, 4, 5].map((n) => `<span class="star ${rating >= n ? "full" : rating >= n - 0.5 ? "half" : ""}">★</span>`).join("")}</span>`;
}

document.querySelector("#store-app").innerHTML = `
  <header class="site-header">
    <div class="header-inner container">
      <a class="brand" href="#home" aria-label="Ranak Device Guru home">
        <span class="brand-mark">${icon("devices")}</span>
        <span class="brand-text"><strong>Ranak<br>Device Guru</strong><small>Electronics • Appliances • Furniture</small></span>
      </a>
      <button class="location-button" id="pin-button" type="button">${icon("location_on")}<span><small>Deliver to</small><strong id="pin-label">${state.pin}</strong></span></button>
      <form class="search" id="search-form" role="search">
        <input id="search-input" type="search" placeholder="Search for mobiles, TVs, refrigerators, furniture..." aria-label="Search products">
        <button type="submit" aria-label="Search">${icon("search")}</button>
      </form>
      <div class="header-actions">
        <button class="header-action" data-action="account" type="button">${icon("person")}<small>Account</small></button>
        <button class="header-action" data-action="wishlist" type="button">${icon("favorite")}<small>Wishlist</small><span class="badge" id="wishlist-count" hidden>0</span></button>
        <button class="header-action" data-action="cart" type="button">${icon("shopping_cart")}<small>Cart</small><span class="badge" id="cart-count" hidden>0</span></button>
      </div>
    </div>
  </header>

  <nav class="main-nav" aria-label="Main navigation">
    <div class="container main-nav-inner">
      <a href="#categories" class="nav-all">${icon("menu")} All Categories</a>
      <a href="#catalog" data-filter="Mobiles">Mobiles</a>
      <a href="#catalog" data-filter="Electronics">Electronics</a>
      <a href="#catalog" data-filter="Home Appliances">Home Appliances</a>
      <a href="#catalog" data-filter="Furniture">Furniture</a>
      <a href="#rent">Rent</a>
      <a href="#offers">Offers</a>
      <a href="#support" data-action="support">Service &amp; Support</a>
    </div>
  </nav>

  <main id="home">
    <div id="home-sections">
      <section class="hero">
        <img class="hero-bg" src="${img("hero")}" alt="Living room with a smart TV, refrigerator, washing machine, smartphone and laptop" fetchpriority="high">
        <div class="container hero-inner">
          <div class="hero-copy">
            <h1>Upgrade Your Lifestyle<br><span>with Ranak Device Guru</span></h1>
            <p>Latest electronics, home appliances <br>and stylish furniture — now with <br>flexible rental options.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#catalog">Shop Now ${arrow}</a>
              <a class="btn btn-outline" href="#rent">Explore Rentals ${arrow}</a>
            </div>
          </div>
        </div>
        <div class="container trust-row">
          <span>${icon("workspace_premium")}Top Brands</span>
          <span>${icon("credit_card")}Easy EMI</span>
          <span>${icon("local_shipping")}Home Delivery</span>
          <span>${icon("handyman")}Installation Support</span>
        </div>
      </section>

      <section class="container section" id="categories">
        <div class="section-head"><h2>Shop by Category</h2><a href="#catalog" data-filter="All">View All Categories ${arrow}</a></div>
        <div class="category-grid" id="category-grid"></div>
      </section>

      <section class="container promo-grid">
        <a class="promo promo-wide promo-blue" href="#catalog" data-filter="Mobiles">
          <div class="promo-copy"><h3>Latest<br>Smartphones</h3><p>Great Prices, Bigger Possibilities.</p><span class="btn btn-white btn-sm">Shop Now ${arrow}</span></div>
          <img src="${img("promo-phones")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-grey" href="#catalog" data-filter="Home Appliances">
          <div class="promo-copy"><h3>Home Appliances</h3><p class="promo-sub">for a Better Home</p><span class="btn btn-primary btn-sm">Explore Deals ${arrow}</span></div>
          <img src="${img("promo-appliances")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-green" href="#catalog" data-filter="Furniture">
          <div class="promo-copy"><h3>Stylish Furniture</h3><p class="promo-sub">for Every Space</p><span class="btn btn-green btn-sm">Shop Furniture ${arrow}</span></div>
          <img src="${img("promo-furniture")}" alt="" loading="lazy">
        </a>
        <a class="promo promo-wide promo-orange" href="#rent">
          <div class="promo-copy"><h3>Rent What You Need</h3><p>Flexible Plans. Latest Products.</p><span class="btn btn-primary btn-sm">Explore Rentals ${arrow}</span></div>
          <img src="${img("promo-rent")}" alt="" loading="lazy">
        </a>
      </section>
    </div>

    <section class="container section" id="catalog">
      <div class="section-head">
        <h2 id="catalog-title">Bestselling Products</h2>
        <div class="catalog-tools">
          <label><span class="sr-only">Sort products</span><select id="sort-select"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="discount">Biggest discount</option></select></label>
          <button class="link-button" id="view-all" type="button">View All ${arrow}</button>
        </div>
      </div>
      <div class="tabs" id="tabs" role="tablist"></div>
      <div class="product-grid" id="product-grid" aria-live="polite"></div>
      <div class="empty-state" id="empty-state" hidden>${icon("search_off")}<h3>No matches found</h3><p>Try a different search or category.</p><button class="btn btn-outline" id="clear-filters" type="button">Show all products</button></div>
    </section>

    <div id="home-sections-2">
      <section class="why">
        <div class="container">
          <h2>Why Choose Ranak Device Guru?</h2>
          <div class="why-grid">${features.map((f) => `<div class="why-item"><span class="why-icon">${icon(f.icon)}</span><strong>${f.title}</strong><small>${f.text}</small></div>`).join("")}</div>
        </div>
      </section>

      <section class="container section">
        <div class="section-head"><h2>Popular Brands</h2><a href="#catalog" data-filter="All">View All Brands ${arrow}</a></div>
        <div class="brand-row">${brands.map((b) => `<span class="brand-logo ${b.cls}" aria-label="${b.name}">${b.html}</span>`).join("")}</div>
      </section>

      <section class="container">
        <a class="wide-banner" href="#catalog" data-filter="Furniture">
          <img src="${img("banner-furniture")}" alt="" loading="lazy">
          <div class="wide-banner-copy"><h2>Make Your Home<br>More Beautiful</h2><p>Sofas, Beds, Tables, Chairs &amp; More</p><span class="btn btn-navy btn-sm">Explore Furniture ${arrow}</span></div>
        </a>
      </section>

      <section class="rental-section" id="rent">
        <div class="container">
          <div class="section-head"><div><p class="kicker">Rental Deals</p><h2>Get What You Need Without Buying It</h2><p class="muted">Flexible rental plans on mobiles, laptops, appliances and furniture.</p></div><a href="#catalog" id="view-rentals">View All Rentals ${arrow}</a></div>
          <div class="rental-grid" id="rental-grid"></div>
        </div>
      </section>

      <section class="container offer-grid" id="offers">
        <a class="offer offer-festive" href="#catalog" data-sort="discount">
          <div class="promo-copy"><h3>Festive Offers</h3><p>Big Savings for a Brighter Home</p><span class="btn btn-amber btn-sm">Shop Offers ${arrow}</span></div>
          <img src="${img("offer-festive")}" alt="" loading="lazy">
        </a>
        <button class="offer offer-emi" data-action="emi" type="button">
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
      </div>
      <div><h4>Shop</h4><a href="#catalog" data-filter="Mobiles">Mobiles</a><a href="#catalog" data-filter="Electronics">Electronics</a><a href="#catalog" data-filter="Home Appliances">Home Appliances</a><a href="#catalog" data-filter="Furniture">Furniture</a></div>
      <div><h4>Help</h4><a href="#support" data-action="support">Service &amp; Support</a><a href="#rent">Rental Plans</a><button data-action="emi" type="button">EMI Options</button><a href="mailto:hello@ranakdeviceguru.in">Contact Us</a></div>
      <div><h4>Company</h4><a href="#privacy" data-info-page="privacy">Privacy Policy</a><a href="#terms" data-info-page="terms">Terms &amp; Conditions</a><a href="admin.html">Owner login</a></div>
    </div>
    <div class="container footer-bottom"><small>© 2026 Ranak Device Guru · Motihari, Bihar</small></div>
  </footer>

  <nav class="mobile-nav" aria-label="Mobile navigation">
    <a href="#home">${icon("home")}<small>Home</small></a>
    <a href="#categories">${icon("grid_view")}<small>Categories</small></a>
    <a href="#rent">${icon("event_repeat")}<small>Rent</small></a>
    <button data-action="cart" type="button">${icon("shopping_cart")}<small>Cart</small></button>
  </nav>

  <dialog class="app-dialog" id="app-dialog"><div class="dialog-content" id="dialog-content"></div></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const productGrid = document.querySelector("#product-grid");
const dialog = document.querySelector("#app-dialog");
const dialogContent = document.querySelector("#dialog-content");
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function openDialog(content) {
  dialogContent.innerHTML = `<button class="dialog-close" data-close type="button" aria-label="Close dialog">${icon("close")}</button>${content}`;
  if (!dialog.open) dialog.showModal();
}

function renderCategories() {
  document.querySelector("#category-grid").innerHTML = categories.map((category) => `
    <button class="category-card" data-filter="${category.slug}" type="button">
      <span class="category-media">${category.image ? `<img src="${category.image}" alt="" loading="lazy">` : icon("category")}</span>
      <span>${category.name}</span>
    </button>`).join("");
}

function renderRentals() {
  const deals = products.filter((p) => p.rentDeal && canRent(p));
  document.querySelector("#rent").hidden = deals.length === 0;
  document.querySelector("#rental-grid").innerHTML = deals.map((p) => `
    <button class="rental-card" data-rent="${p.id}" type="button">
      <span class="rental-media">${productMedia(p)}</span>
      <strong>${p.rentLabel || p.name}</strong>
      <small>From ${money(p.rent)}/month</small>
    </button>`).join("");
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

function productCard(product) {
  const saved = state.wishlist.has(product.id);
  return `
    <article class="product-card">
      <button class="wish ${saved ? "saved" : ""}" data-wishlist="${product.id}" type="button" aria-pressed="${saved}" aria-label="${saved ? "Remove from" : "Add to"} wishlist">${icon("favorite")}</button>
      <a class="product-media" href="#product/${product.id}" data-details="${product.id}">${productMedia(product)}</a>
      <a class="product-name" href="#product/${product.id}" data-details="${product.id}">${product.name}</a>
      <p class="product-detail">${product.detail}</p>
      ${product.rating ? `<p class="rating">${stars(product.rating)}${product.reviews ? `<small>(${product.reviews})</small>` : ""}</p>` : ""}
      <p class="price"><strong>${money(product.price)}</strong>${hasDiscount(product) ? `<s>${money(product.mrp)}</s>` : ""}</p>
      ${hasDiscount(product) ? `<span class="off">${discount(product)}% off</span>` : ""}
      <div class="card-actions">
        <button class="btn btn-primary btn-xs" data-buy="${product.id}" type="button">Buy Now</button>
        ${canRent(product) ? `<button class="btn btn-outline btn-xs" data-rent="${product.id}" type="button">Rent ${money(product.rent)}/mo</button>` : ""}
      </div>
    </article>`;
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateBadges() {
  const cart = document.querySelector("#cart-count");
  const wish = document.querySelector("#wishlist-count");
  cart.textContent = cartCount();
  cart.hidden = cartCount() === 0;
  wish.textContent = state.wishlist.size;
  wish.hidden = state.wishlist.size === 0;
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
}

function setFilter(category) {
  state.category = category;
  state.query = "";
  document.querySelector("#search-input").value = "";
  goHome();
  renderProducts();
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
}

function addToCart(product, mode = "buy", tenure = 12, quantity = 1) {
  const key = mode === "rent" ? `${product.id}:rent:${tenure}` : `${product.id}:buy`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.quantity += quantity;
  else state.cart.push({ key, id: product.id, mode, tenure, quantity });
  updateBadges();
  showToast(mode === "rent" ? `${product.name} added on rent (${tenure} months).` : `${product.name} added to cart.`);
}

const rentPrice = (product, tenure) => Math.round(product.rent * (tenure === 3 ? 1.3 : tenure === 6 ? 1.12 : 1));

function showRent(product) {
  openDialog(`
    <div class="rent-dialog">
      <div class="rent-media">${productMedia(product)}</div>
      <p class="eyebrow">Rent with flexible plans</p>
      <h2>${product.name}</h2>
      <p class="muted">${product.detail}</p>
      <div class="tenure-list" role="radiogroup" aria-label="Rental tenure">
        ${tenures.map((t) => `<label class="tenure"><input type="radio" name="tenure" value="${t}" ${t === 12 ? "checked" : ""}><span><strong>${t} months</strong><small>${money(rentPrice(product, t))}/month</small></span></label>`).join("")}
      </div>
      <p class="fine">Refundable security deposit and delivery charges are confirmed at checkout. Free relocation and maintenance on 12-month plans.</p>
      <button class="btn btn-primary btn-block" data-confirm-rent="${product.id}" type="button">Add rental to cart</button>
    </div>`);
}

function lineTotal(item) {
  const product = findProduct(item.id);
  return (item.mode === "rent" ? rentPrice(product, item.tenure) : product.price) * item.quantity;
}

function showCart() {
  const buyTotal = state.cart.filter((i) => i.mode === "buy").reduce((s, i) => s + lineTotal(i), 0);
  const rentTotal = state.cart.filter((i) => i.mode === "rent").reduce((s, i) => s + lineTotal(i), 0);
  const lines = state.cart.map((item) => {
    const product = findProduct(item.id);
    return `<div class="cart-line"><span class="cart-thumb">${productMedia(product)}</span><div><strong>${product.name}</strong><small>${item.mode === "rent" ? `Rent · ${item.tenure} months · ${money(rentPrice(product, item.tenure))}/mo` : `Buy · ${money(product.price)}`}</small><div class="qty"><button data-qty="${item.key}" data-delta="-1" type="button" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-qty="${item.key}" data-delta="1" type="button" aria-label="Increase quantity">+</button><button class="remove" data-remove="${item.key}" type="button">Remove</button></div></div><b>${money(lineTotal(item))}${item.mode === "rent" ? "<small>/mo</small>" : ""}</b></div>`;
  }).join("");
  openDialog(`<div class="cart-dialog"><h2>Your Cart <span>(${cartCount()})</span></h2>${lines || `<div class="empty-state">${icon("shopping_cart")}<p>Your cart is empty.</p><button class="btn btn-outline" data-close type="button">Continue shopping</button></div>`}${lines ? `<div class="cart-summary">${buyTotal ? `<p><span>Purchase total</span><strong>${money(buyTotal)}</strong></p>` : ""}${rentTotal ? `<p><span>Monthly rent</span><strong>${money(rentTotal)}/mo</strong></p>` : ""}<small>Delivery, taxes and security deposit are confirmed at checkout.</small><button class="btn btn-primary btn-block" data-checkout type="button">Proceed to Checkout ${arrow}</button></div>` : ""}</div>`);
}

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
  document.title = `${product.name} | Ranak Device Guru`;
  const related = products.filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug).slice(0, 5);
  page.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a><span>/</span><a href="#catalog" data-filter="${product.categorySlug}">${product.category}</a><span>/</span><span>${product.name}</span></nav>
    <div class="pdp">
      <div class="pdp-media">${productMedia(product)}</div>
      <div class="pdp-info">
        <p class="eyebrow">${product.brand} · ${product.category}</p>
        <h1>${product.name}</h1>
        <p class="muted">${product.detail}</p>
        ${product.rating ? `<p class="rating">${stars(product.rating)}<small>${product.rating}${product.reviews ? ` (${product.reviews} ratings)` : ""}</small></p>` : ""}
        <p class="price price-lg"><strong>${money(product.price)}</strong>${hasDiscount(product) ? `<s>${money(product.mrp)}</s><span class="off">${discount(product)}% off</span>` : ""}</p>
        <p class="emi-note">${icon("credit_card")} EMI from ${money(Math.round(product.price / 12))}/month${canRent(product) ? ` · or rent from ${money(product.rent)}/month` : ""}</p>
        <div class="qty-row"><span>Quantity</span><div class="qty"><button data-pdp-qty="-1" type="button" aria-label="Decrease quantity">−</button><output id="pdp-qty">1</output><button data-pdp-qty="1" type="button" aria-label="Increase quantity">+</button></div></div>
        <div class="pdp-actions">
          <button class="btn btn-primary" data-pdp-buy="${product.id}" type="button">Buy Now</button>
          <button class="btn btn-outline" data-pdp-add="${product.id}" type="button">Add to Cart</button>
          ${canRent(product) ? `<button class="btn btn-outline" data-rent="${product.id}" type="button">Rent ${money(product.rent)}/mo</button>` : ""}
        </div>
        <label class="pin-check">Check delivery<div><input id="pdp-pin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code"><button data-pin-check type="button">Check</button></div></label>
        <ul class="pdp-perks"><li>${icon("verified")}100% genuine product</li><li>${icon("local_shipping")}Home delivery</li><li>${icon("build")}Installation support on selected products</li></ul>
      </div>
    </div>
    ${related.length ? `<section class="section"><div class="section-head"><h2>More in ${product.category}</h2></div><div class="product-grid">${related.map(productCard).join("")}</div></section>` : ""}`;
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function showInfoPage(page) {
  const isPrivacy = page === "privacy";
  openDialog(`<div class="info-dialog"><p class="eyebrow">Ranak Device Guru</p><h2>${isPrivacy ? "Privacy Policy" : "Terms & Conditions"}</h2><p>This storefront does not yet collect account, payment or order information. The final ${isPrivacy ? "privacy policy" : "terms and conditions"} will be published here before the store accepts orders.</p><button class="btn btn-primary" data-close type="button">Close</button></div>`);
}

async function init() {
  productGrid.innerHTML = `<p class="loading-note">Loading products…</p>`;
  try {
    ({ categories, products } = await RDG.loadCatalog());
  } catch (error) {
    console.error("Could not load catalogue", error);
    productGrid.innerHTML = "";
    document.querySelector("#empty-state").hidden = false;
    document.querySelector("#empty-state h3").textContent = "Couldn't load products";
    document.querySelector("#empty-state p").textContent = "Please check your connection and refresh the page.";
    return;
  }
  renderCategories();
  renderRentals();
  renderProducts();
  syncRoute(false);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;
  const d = target.dataset;

  if (d.close !== undefined) return dialog.close();
  if (d.filter) { event.preventDefault(); dialog.close(); return setFilter(d.filter); }
  if (d.sort) { event.preventDefault(); state.sort = d.sort; state.showAll = true; return setFilter("All"); }
  if (d.details) { event.preventDefault(); dialog.close(); history.pushState({}, "", `#product/${d.details}`); return syncRoute(); }
  if (d.wishlist) {
    const id = d.wishlist;
    state.wishlist.has(id) ? state.wishlist.delete(id) : state.wishlist.add(id);
    document.querySelectorAll(`[data-wishlist="${id}"]`).forEach((btn) => { btn.classList.toggle("saved", state.wishlist.has(id)); btn.setAttribute("aria-pressed", String(state.wishlist.has(id))); });
    updateBadges();
    return showToast(state.wishlist.has(id) ? "Saved to your wishlist." : "Removed from your wishlist.");
  }
  if (d.buy) { addToCart(findProduct(d.buy)); return showCart(); }
  if (d.rent) return showRent(findProduct(d.rent));
  if (d.confirmRent) {
    const tenure = Number(dialog.querySelector("input[name=tenure]:checked").value);
    addToCart(findProduct(d.confirmRent), "rent", tenure);
    return showCart();
  }
  if (d.pdpQty) { productQuantity = Math.max(1, productQuantity + Number(d.pdpQty)); document.querySelector("#pdp-qty").value = productQuantity; return; }
  if (d.pdpAdd) return addToCart(findProduct(d.pdpAdd), "buy", 12, productQuantity);
  if (d.pdpBuy) { addToCart(findProduct(d.pdpBuy), "buy", 12, productQuantity); return showCart(); }
  if (d.pinCheck !== undefined) {
    const pin = document.querySelector("#pdp-pin").value.trim();
    return showToast(/^\d{6}$/.test(pin) ? "Delivery availability will be confirmed by our team." : "Enter a valid 6-digit PIN code.");
  }
  if (d.qty) {
    const item = state.cart.find((entry) => entry.key === d.qty);
    if (item) item.quantity += Number(d.delta);
    state.cart = state.cart.filter((entry) => entry.quantity > 0);
    updateBadges();
    return showCart();
  }
  if (d.remove) { state.cart = state.cart.filter((entry) => entry.key !== d.remove); updateBadges(); return showCart(); }
  if (d.checkout !== undefined) return openDialog(`<div class="info-dialog"><p class="eyebrow">Almost there</p><h2>Delivery details</h2><p>Online checkout isn't connected yet. Share your PIN code and our team will confirm availability, delivery and installation.</p><label class="field">Delivery PIN code<input inputmode="numeric" maxlength="6" placeholder="6-digit PIN code"></label><button class="btn btn-primary btn-block" data-checkout-submit type="button">Request callback</button></div>`);
  if (d.checkoutSubmit !== undefined) return showToast("Checkout is not connected in this preview.");
  if (d.infoPage) { event.preventDefault(); return showInfoPage(d.infoPage); }

  switch (d.action) {
    case "cart": return showCart();
    case "account": return openDialog(`<div class="info-dialog"><p class="eyebrow">Welcome</p><h2>Sign in to your account</h2><p>Track orders, manage rentals and save your addresses.</p><label class="field">Mobile number<input type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"></label><button class="btn btn-primary btn-block" data-account-submit type="button">Continue</button></div>`);
    case "support": event.preventDefault(); return openDialog(`<div class="info-dialog"><p class="eyebrow">Service &amp; Support</p><h2>We're here to help</h2><ul class="pdp-perks"><li>${icon("build")}Installation &amp; demo for TVs, ACs, washing machines and refrigerators</li><li>${icon("event_repeat")}Free maintenance on 12-month rental plans</li><li>${icon("mail")}<a href="mailto:hello@ranakdeviceguru.in">hello@ranakdeviceguru.in</a></li></ul><button class="btn btn-primary" data-close type="button">Close</button></div>`);
    case "emi": return openDialog(`<div class="info-dialog"><p class="eyebrow">Easy EMI Options</p><h2>Pay in easy monthly instalments</h2><ul class="pdp-perks"><li>${icon("credit_card")}Credit &amp; debit card EMI on major banks</li><li>${icon("percent")}No-cost EMI on selected products</li><li>${icon("schedule")}Tenures from 3 to 24 months</li></ul><p class="fine">EMI eligibility and interest are confirmed at checkout.</p><button class="btn btn-primary" data-close type="button">Got it</button></div>`);
    case "wishlist": {
      const saved = products.filter((p) => state.wishlist.has(p.id));
      return openDialog(`<div class="cart-dialog"><h2>Your Wishlist</h2>${saved.length ? saved.map((p) => `<div class="cart-line"><span class="cart-thumb">${productMedia(p)}</span><div><strong>${p.name}</strong><small>${money(p.price)}</small></div><a class="link-button" data-details="${p.id}" href="#product/${p.id}">View</a></div>`).join("") : `<div class="empty-state">${icon("favorite")}<p>Save products to find them here.</p><button class="btn btn-outline" data-close type="button">Keep browsing</button></div>`}</div>`);
    }
  }
  if (d.accountSubmit !== undefined) return showToast("Sign-in is not connected in this preview.");
  if (target.id === "pin-button") return openDialog(`<div class="info-dialog"><p class="eyebrow">Delivery location</p><h2>Where should we deliver?</h2><label class="field">6-digit PIN code<input id="location-pin" inputmode="numeric" maxlength="6" placeholder="e.g. 845401"></label><button class="btn btn-primary btn-block" data-save-pin type="button">Set location</button></div>`);
  if (d.savePin !== undefined) {
    const pin = document.querySelector("#location-pin").value.trim();
    if (!/^\d{6}$/.test(pin)) return showToast("Enter a valid 6-digit PIN code.");
    document.querySelector("#pin-label").textContent = pin;
    dialog.close();
    return showToast("Delivery location updated.");
  }
  if (target.id === "view-all") { state.showAll = true; return renderProducts(); }
  if (target.id === "clear-filters") { state.query = ""; document.querySelector("#search-input").value = ""; return setFilter("All"); }
  if (target.id === "view-rentals") { event.preventDefault(); return document.querySelector(".rental-grid").scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (target.matches("a[href^='#']") && !target.hash.startsWith("#product/") && location.hash.startsWith("#product/")) {
    event.preventDefault();
    history.pushState({}, "", target.hash);
    syncRoute(false);
    document.querySelector(target.hash)?.scrollIntoView({ behavior: "smooth" });
  }
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  state.query = document.querySelector("#search-input").value;
  state.category = "All";
  goHome();
  renderProducts();
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
});
document.querySelector("#search-input").addEventListener("input", (event) => {
  if (!event.target.value && state.query) { state.query = ""; renderProducts(); }
});
document.querySelector("#sort-select").addEventListener("change", (event) => { state.sort = event.target.value; renderProducts(); });
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
window.addEventListener("popstate", () => syncRoute(false));
init();
