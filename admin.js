// Owner dashboard: sign in, then manage categories and products (with image upload) in Supabase.

const db = RDG.client;
const { esc, safeUrl } = RDG;
const $ = (selector, root = document) => root.querySelector(selector);
const app = $("#admin-app");
const dialog = $("#admin-dialog");
const dialogContent = $("#admin-dialog-content");
const toastEl = $("#toast");
const icon = (name) => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const money = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const state = { categories: [], products: [], tab: "products", filter: "all", query: "", email: "" };
let toastTimer;

function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("toast-error", isError);
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 3200);
}

function openDialog(html) {
  dialogContent.innerHTML = `<button class="dialog-close" data-close type="button" aria-label="Close">${icon("close")}</button>${html}`;
  if (!dialog.open) dialog.showModal();
}

const brandBlock = `<a class="brand" href="index.html"><span class="brand-mark">${icon("devices")}</span><span class="brand-text"><strong>Ranak<br>Device Guru</strong><small>Store dashboard</small></span></a>`;

// ---------------------------------------------------------------------------
// Screens: setup → login → dashboard
// ---------------------------------------------------------------------------
function renderSetup() {
  app.innerHTML = `<main class="auth-screen"><div class="auth-card">${brandBlock}
    <h1>Connect Supabase</h1>
    <ol class="setup-steps">
      <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
      <li>Open <b>SQL Editor</b>, paste <code>supabase/schema.sql</code> and run it.</li>
      <li>In <b>Authentication → Users</b>, add the owner's email and password, then run the <code>insert into public.admins</code> line at the end of the schema file.</li>
      <li>Copy the <b>Project URL</b> and <b>anon public key</b> from <b>Project Settings → API</b> into <code>config.js</code>.</li>
    </ol></div></main>`;
}

function renderLogin(message = "") {
  app.innerHTML = `<main class="auth-screen"><form class="auth-card" id="login-form">${brandBlock}
    <h1>Owner sign in</h1>
    <p class="muted">Manage products, prices and photos for your store.</p>
    <label class="field">Email<input name="email" type="email" autocomplete="username" required></label>
    <label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label>
    <p class="form-error" id="login-error">${esc(message)}</p>
    <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    <a class="back-link" href="index.html">${icon("arrow_back")} Back to store</a>
  </form></main>`;
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Signing in…";
    const { data, error } = await db.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
    if (error) return renderLogin(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    enter(data.session);
  });
}

async function enter(session) {
  const { data, error } = await db.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (error || !data) {
    await db.auth.signOut();
    return renderLogin(error
      ? `Signed in, but couldn't check owner access: ${error.message}`
      : `${session.user.email} signed in, but isn't set up as a store owner yet. Add this account to the admins table in Supabase.`);
  }
  state.email = session.user.email;
  renderShell();
  await refresh();
}

function renderShell() {
  app.innerHTML = `
    <header class="admin-header"><div class="container admin-header-inner">${brandBlock}
      <nav class="admin-tabs" role="tablist">
        <button data-tab="products" role="tab" type="button">${icon("inventory_2")}Products</button>
        <button data-tab="categories" role="tab" type="button">${icon("category")}Categories</button>
      </nav>
      <div class="admin-user"><span>${esc(state.email)}</span><a class="btn btn-outline btn-sm" href="index.html" target="_blank" rel="noopener">${icon("storefront")}View store</a><button class="btn btn-outline btn-sm" data-signout type="button">${icon("logout")}Sign out</button></div>
    </div></header>
    <main class="container admin-main" id="admin-main"><p class="loading-note">Loading…</p></main>`;
}

async function refresh() {
  const [cats, prods] = await Promise.all([
    db.from("categories").select("*").order("sort_order").order("name"),
    db.from("products").select("*").order("sort_order").order("created_at", { ascending: false })
  ]);
  if (cats.error || prods.error) return toast((cats.error || prods.error).message, true);
  state.categories = cats.data;
  state.products = prods.data;
  render();
}

function render() {
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  state.tab === "products" ? renderProducts() : renderCategories();
}

const categoryById = (id) => state.categories.find((c) => c.id === id);
const countIn = (categoryId) => state.products.filter((p) => p.category_id === categoryId).length;
const thumb = (url, label) => (safeUrl(url) ? `<img src="${safeUrl(url)}" alt="${esc(label)}" loading="lazy">` : `<span class="thumb-empty">${icon("image")}</span>`);

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function renderProducts() {
  const query = state.query.trim().toLowerCase();
  const list = state.products.filter((p) =>
    (state.filter === "all" || p.category_id === state.filter) &&
    (!query || `${p.name} ${p.brand || ""}`.toLowerCase().includes(query)));
  const current = categoryById(state.filter);
  $("#admin-main").innerHTML = `
    <div class="admin-toolbar">
      <div><h1>${current ? esc(current.name) : "All products"}</h1><p class="muted">${list.length} product${list.length === 1 ? "" : "s"}${current ? "" : ` in ${state.categories.length} categories`}</p></div>
      <div class="admin-toolbar-actions">
        <label class="admin-search">${icon("search")}<input id="product-search" type="search" placeholder="Search products" value="${esc(state.query)}" aria-label="Search products"></label>
        <button class="btn btn-primary" data-new-product type="button" ${state.categories.length ? "" : "disabled"}>${icon("add")}Add product${current ? ` to ${esc(current.name)}` : ""}</button>
      </div>
    </div>
    <div class="chip-row">
      <button class="chip ${state.filter === "all" ? "active" : ""}" data-filter="all" type="button">All <span>${state.products.length}</span></button>
      ${state.categories.map((c) => `<button class="chip ${state.filter === c.id ? "active" : ""}" data-filter="${c.id}" type="button">${esc(c.name)} <span>${countIn(c.id)}</span></button>`).join("")}
    </div>
    ${state.categories.length ? "" : `<div class="empty-state">${icon("category")}<h3>Add a category first</h3><p>Products are organised by category.</p><button class="btn btn-primary" data-tab="categories" type="button">Go to categories</button></div>`}
    <div class="admin-grid">${list.map(productCard).join("")}</div>
    ${list.length || !state.categories.length ? "" : `<div class="empty-state">${icon("inventory_2")}<h3>No products here yet</h3><p>Add your first product${current ? ` in ${esc(current.name)}` : ""}.</p></div>`}`;
  $("#product-search").addEventListener("input", (event) => {
    state.query = event.target.value;
    const pos = event.target.selectionStart;
    renderProducts();
    const input = $("#product-search");
    input.focus();
    input.setSelectionRange(pos, pos);
  });
}

function productCard(p) {
  const category = categoryById(p.category_id);
  return `<article class="admin-card ${p.is_active ? "" : "is-hidden"}">
    <div class="admin-thumb">${thumb(p.image_url, p.name)}</div>
    <div class="admin-card-body">
      <p class="admin-card-cat">${esc(category?.name || "")}</p>
      <h3>${esc(p.name)}</h3>
      <p class="admin-price"><strong>${money(p.price)}</strong>${p.mrp && p.mrp > p.price ? `<s>${money(p.mrp)}</s>` : ""}</p>
      <p class="admin-meta">${p.rent_per_month ? `Rent ${money(p.rent_per_month)}/mo` : "Not for rent"}</p>
      <div class="badges">${p.is_bestseller ? `<span class="badge-pill blue">Bestseller</span>` : ""}${p.is_rent_deal ? `<span class="badge-pill amber">Rental deal</span>` : ""}${p.is_active ? "" : `<span class="badge-pill grey">Hidden</span>`}</div>
    </div>
    <div class="admin-card-actions">
      <button class="btn btn-outline btn-sm" data-edit-product="${p.id}" type="button">${icon("edit")}Edit</button>
      <button class="icon-btn" data-toggle-product="${p.id}" type="button" title="${p.is_active ? "Hide from store" : "Show on store"}" aria-label="${p.is_active ? "Hide from store" : "Show on store"}">${icon(p.is_active ? "visibility" : "visibility_off")}</button>
      <button class="icon-btn danger" data-delete-product="${p.id}" type="button" title="Delete" aria-label="Delete product">${icon("delete")}</button>
    </div>
  </article>`;
}

function imageField(url) {
  return `<div class="image-field">
    <label class="dropzone" id="dropzone">
      <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" hidden>
      <span class="dropzone-preview" id="image-preview">${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="">` : icon("add_photo_alternate")}</span>
      <span class="dropzone-text"><b>${safeUrl(url) ? "Change photo" : "Upload photo"}</b><small>JPG, PNG or WebP · drag & drop or click<br>Tip: product on a white background looks best</small></span>
    </label>
  </div>`;
}

function openProductForm(product) {
  const p = product || { category_id: state.filter !== "all" ? state.filter : state.categories[0]?.id, is_active: true };
  const num = (v) => (v === null || v === undefined ? "" : v);
  openDialog(`<form class="admin-form" id="product-form">
    <h2>${product ? "Edit product" : "Add product"}</h2>
    ${imageField(p.image_url)}
    <div class="form-grid">
      <label class="field span-2">Product name *<input name="name" required maxlength="120" value="${esc(p.name || "")}" placeholder="e.g. Samsung Galaxy S24 5G"></label>
      <label class="field">Category *<select name="category_id" required>${state.categories.map((c) => `<option value="${c.id}" ${c.id === p.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field">Brand<input name="brand" maxlength="60" value="${esc(p.brand || "")}" placeholder="e.g. Samsung"></label>
      <label class="field span-2">Short details<input name="detail" maxlength="120" value="${esc(p.detail || "")}" placeholder="e.g. 8GB | 128GB · Onyx Black"></label>
      <label class="field">Selling price (₹) *<input name="price" type="number" min="0" step="1" required value="${num(p.price)}"></label>
      <label class="field">MRP (₹)<input name="mrp" type="number" min="0" step="1" value="${num(p.mrp)}" placeholder="Shows the % off"></label>
      <label class="field">Rent per month (₹)<input name="rent_per_month" type="number" min="1" step="1" value="${num(p.rent_per_month)}" placeholder="Leave empty if not for rent"></label>
      <label class="field">Short name on rental card<input name="rent_label" maxlength="40" value="${esc(p.rent_label || "")}" placeholder="Optional"></label>
      <label class="field">Rating (0–5)<input name="rating" type="number" min="0" max="5" step="0.1" value="${num(p.rating)}" placeholder="Only real ratings"></label>
      <label class="field">Number of reviews<input name="reviews" maxlength="10" value="${esc(p.reviews || "")}" placeholder="e.g. 1.2K"></label>
      <label class="field">Display order<input name="sort_order" type="number" step="1" value="${num(p.sort_order ?? 0)}"><small>Lower numbers show first</small></label>
    </div>
    <div class="toggle-row">
      <label class="toggle"><input type="checkbox" name="is_bestseller" ${p.is_bestseller ? "checked" : ""}><span>Show in Bestselling</span></label>
      <label class="toggle"><input type="checkbox" name="is_rent_deal" ${p.is_rent_deal ? "checked" : ""}><span>Show in Rental Deals</span></label>
      <label class="toggle"><input type="checkbox" name="is_active" ${p.is_active ? "checked" : ""}><span>Visible on store</span></label>
    </div>
    <p class="form-error" id="form-error"></p>
    <div class="form-actions"><button class="btn btn-outline" data-close type="button">Cancel</button><button class="btn btn-primary" type="submit">${product ? "Save changes" : "Add product"}</button></div>
  </form>`);
  const pending = bindImageField();
  $("#product-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProduct(product, new FormData(event.target), pending.file, event.target);
  });
}

function bindImageField() {
  const pending = { file: null };
  const input = $("#image-input");
  const zone = $("#dropzone");
  const accept = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Please choose a JPG, PNG or WebP image.", true);
    if (file.size > 15 * 1024 * 1024) return toast("That image is over 15 MB. Please pick a smaller one.", true);
    pending.file = file;
    $("#image-preview").innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
    zone.querySelector("b").textContent = "Photo ready — save to upload";
  };
  input.addEventListener("change", () => accept(input.files[0]));
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragging"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("dragging"); accept(e.dataTransfer.files[0]); });
  return pending;
}

// Resize to at most 1200px and re-encode (WebP where supported) so uploads stay small and fast.
async function compressImage(file, maxSize = 1200) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (blob && blob.type === "image/webp") return { blob, ext: "webp" };
  return { blob: await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88)), ext: "jpg" };
}

async function uploadImage(file, folder) {
  const { blob, ext } = await compressImage(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(RDG.bucket).upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw error;
  return { path, url: db.storage.from(RDG.bucket).getPublicUrl(path).data.publicUrl };
}

async function removeImage(path) {
  if (path) await db.storage.from(RDG.bucket).remove([path]);
}

const intOrNull = (v) => (v === "" || v === null ? null : Math.round(Number(v)));

async function withBusy(form, label, task) {
  const button = form.querySelector("button[type=submit]");
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = label;
  $("#form-error").textContent = "";
  try {
    await task();
  } catch (error) {
    $("#form-error").textContent = error.message || "Something went wrong. Please try again.";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function saveProduct(existing, form, file, formEl) {
  const payload = {
    category_id: form.get("category_id"),
    name: form.get("name").trim(),
    brand: form.get("brand").trim() || null,
    detail: form.get("detail").trim() || null,
    price: intOrNull(form.get("price")),
    mrp: intOrNull(form.get("mrp")),
    rent_per_month: intOrNull(form.get("rent_per_month")),
    rent_label: form.get("rent_label").trim() || null,
    rating: form.get("rating") === "" ? null : Number(form.get("rating")),
    reviews: form.get("reviews").trim() || null,
    sort_order: intOrNull(form.get("sort_order")) ?? 0,
    is_bestseller: form.has("is_bestseller"),
    is_rent_deal: form.has("is_rent_deal"),
    is_active: form.has("is_active")
  };
  if (payload.mrp !== null && payload.mrp < payload.price) return ($("#form-error").textContent = "MRP should be equal to or higher than the selling price.");
  if (payload.is_rent_deal && !payload.rent_per_month) return ($("#form-error").textContent = "Add a monthly rent to show this in Rental Deals.");

  const oldImagePath = existing?.image_path;
  await withBusy(formEl, file ? "Uploading photo…" : "Saving…", async () => {
    let uploaded = null;
    if (file) {
      const folder = state.categories.find((c) => c.id === payload.category_id)?.slug || "products";
      uploaded = await uploadImage(file, folder);
      payload.image_url = uploaded.url;
      payload.image_path = uploaded.path;
    }
    const query = existing
      ? db.from("products").update(payload).eq("id", existing.id)
      : db.from("products").insert(payload);
    const { error } = await query;
    if (error) {
      if (uploaded) await removeImage(uploaded.path);
      throw error;
    }
    if (uploaded && oldImagePath) await removeImage(oldImagePath);
    dialog.close();
    toast(existing ? "Product updated." : "Product added to the store.");
    await refresh();
  });
}

async function toggleProduct(id) {
  const p = state.products.find((x) => x.id === id);
  const { error } = await db.from("products").update({ is_active: !p.is_active }).eq("id", id);
  if (error) return toast(error.message, true);
  toast(p.is_active ? "Hidden from the store." : "Now visible on the store.");
  refresh();
}

async function deleteProduct(id) {
  const p = state.products.find((x) => x.id === id);
  if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return toast(error.message, true);
  await removeImage(p.image_path);
  toast("Product deleted.");
  refresh();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
function renderCategories() {
  $("#admin-main").innerHTML = `
    <div class="admin-toolbar">
      <div><h1>Categories</h1><p class="muted">Shown in "Shop by Category" and the product tabs, in this order.</p></div>
      <button class="btn btn-primary" data-new-category type="button">${icon("add")}Add category</button>
    </div>
    <div class="category-admin-list">${state.categories.map((c) => `
      <article class="admin-row">
        <div class="admin-thumb small">${thumb(c.image_url, c.name)}</div>
        <div class="admin-row-body"><h3>${esc(c.name)}</h3><p class="muted">${countIn(c.id)} products · ${esc(c.nav_group || "No menu group")} · order ${c.sort_order}</p></div>
        <button class="btn btn-outline btn-sm" data-open-category="${c.id}" type="button">${icon("inventory_2")}Products</button>
        <button class="btn btn-outline btn-sm" data-edit-category="${c.id}" type="button">${icon("edit")}Edit</button>
        <button class="icon-btn danger" data-delete-category="${c.id}" type="button" aria-label="Delete category" title="Delete">${icon("delete")}</button>
      </article>`).join("")}</div>
    ${state.categories.length ? "" : `<div class="empty-state">${icon("category")}<h3>No categories yet</h3><p>Create categories like Mobile Phones, Televisions or Furniture.</p></div>`}`;
}

const slugify = (text) => text.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

function openCategoryForm(category) {
  const c = category || { sort_order: (state.categories.at(-1)?.sort_order ?? 0) + 10 };
  openDialog(`<form class="admin-form" id="category-form">
    <h2>${category ? "Edit category" : "Add category"}</h2>
    ${imageField(c.image_url)}
    <div class="form-grid">
      <label class="field span-2">Category name *<input name="name" required maxlength="60" value="${esc(c.name || "")}" placeholder="e.g. Air Conditioners"></label>
      <label class="field">Menu group<select name="nav_group"><option value="">None</option>${RDG.navGroups.map((g) => `<option ${g === c.nav_group ? "selected" : ""}>${g}</option>`).join("")}</select><small>Which top-menu link includes it</small></label>
      <label class="field">Display order<input name="sort_order" type="number" step="1" value="${c.sort_order ?? 0}"><small>Lower numbers show first</small></label>
    </div>
    <p class="form-error" id="form-error"></p>
    <div class="form-actions"><button class="btn btn-outline" data-close type="button">Cancel</button><button class="btn btn-primary" type="submit">${category ? "Save changes" : "Add category"}</button></div>
  </form>`);
  const pending = bindImageField();
  $("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveCategory(category, new FormData(event.target), pending.file, event.target);
  });
}

async function saveCategory(existing, form, file, formEl) {
  const name = form.get("name").trim();
  const payload = { name, nav_group: form.get("nav_group") || null, sort_order: intOrNull(form.get("sort_order")) ?? 0 };
  if (!existing) {
    payload.slug = slugify(name);
    if (!payload.slug) return ($("#form-error").textContent = "Use letters or numbers in the name.");
    if (state.categories.some((c) => c.slug === payload.slug)) return ($("#form-error").textContent = "A category with this name already exists.");
  }
  const oldImagePath = existing?.image_path;
  await withBusy(formEl, file ? "Uploading photo…" : "Saving…", async () => {
    let uploaded = null;
    if (file) {
      uploaded = await uploadImage(file, `categories/${existing?.slug || payload.slug}`);
      payload.image_url = uploaded.url;
      payload.image_path = uploaded.path;
    }
    const query = existing ? db.from("categories").update(payload).eq("id", existing.id) : db.from("categories").insert(payload);
    const { error } = await query;
    if (error) {
      if (uploaded) await removeImage(uploaded.path);
      throw error;
    }
    if (uploaded && oldImagePath) await removeImage(oldImagePath);
    dialog.close();
    toast(existing ? "Category updated." : "Category added.");
    await refresh();
  });
}

async function deleteCategory(id) {
  const c = categoryById(id);
  if (countIn(id)) return toast(`Move or delete the ${countIn(id)} products in "${c.name}" first.`, true);
  if (!confirm(`Delete the "${c.name}" category?`)) return;
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return toast(error.message, true);
  await removeImage(c.image_path);
  toast("Category deleted.");
  refresh();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
document.addEventListener("click", async (event) => {
  const t = event.target.closest("button, a");
  if (!t) return;
  const d = t.dataset;
  if (d.close !== undefined) return dialog.close();
  if (d.tab) { state.tab = d.tab; return render(); }
  if (d.filter) { state.filter = d.filter; return renderProducts(); }
  if (d.newProduct !== undefined) return openProductForm(null);
  if (d.editProduct) return openProductForm(state.products.find((p) => p.id === d.editProduct));
  if (d.toggleProduct) return toggleProduct(d.toggleProduct);
  if (d.deleteProduct) return deleteProduct(d.deleteProduct);
  if (d.newCategory !== undefined) return openCategoryForm(null);
  if (d.editCategory) return openCategoryForm(categoryById(d.editCategory));
  if (d.deleteCategory) return deleteCategory(d.deleteCategory);
  if (d.openCategory) { state.tab = "products"; state.filter = d.openCategory; return render(); }
  if (d.signout !== undefined) { await db.auth.signOut(); return renderLogin(); }
});
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

async function start() {
  if (!RDG.configured) return renderSetup();
  const { data } = await db.auth.getSession();
  data.session ? enter(data.session) : renderLogin();
}

start();
