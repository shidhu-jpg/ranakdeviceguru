// Catalogue data layer shared by the storefront (app.js) and the owner dashboard (admin.js).

const RDG = (() => {
  const config = window.RDG_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const bucket = config.bucket || "product-images";

  const navGroups = ["Mobiles", "Electronics", "Home Appliances", "Furniture"];

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Only allow https URLs or site-relative paths into src attributes.
  const safeUrl = (url) => (/^(https:\/\/|images\/)/.test(url || "") ? esc(url) : "");

  // Demo catalogue used until Supabase is configured. Ratings here are placeholders.
  const demoCategories = [
    { slug: "mobile-phones", name: "Mobile Phones", group: "Mobiles", image: "images/cat-mobile.jpg" },
    { slug: "televisions", name: "Televisions", group: "Electronics", image: "images/cat-tv.jpg" },
    { slug: "refrigerators", name: "Refrigerators", group: "Home Appliances", image: "images/cat-fridge.jpg" },
    { slug: "washing-machines", name: "Washing Machines", group: "Home Appliances", image: "images/cat-washer.jpg" },
    { slug: "air-conditioners", name: "Air Conditioners", group: "Home Appliances", image: "images/cat-ac.jpg" },
    { slug: "laptops-computers", name: "Laptops &amp; Computers", group: "Electronics", image: "images/cat-laptop.jpg" },
    { slug: "kitchen-appliances", name: "Kitchen Appliances", group: "Home Appliances", image: "images/cat-kitchen.jpg" },
    { slug: "furniture", name: "Furniture", group: "Furniture", image: "images/cat-furniture.jpg" },
    { slug: "speakers-audio", name: "Speakers &amp; Audio", group: "Electronics", image: "images/cat-speakers.jpg" },
    { slug: "other-electronics", name: "Other Electronics", group: "Electronics", image: "images/cat-other.jpg" }
  ];

  const demoProducts = [
    ["galaxy-s24", "mobile-phones", "Samsung", "Samsung Galaxy S24 5G", "8GB | 128GB", 59999, 69999, 1499, 4.5, "1.2K", "p-s24", { bestseller: true }],
    ["lg-43-tv", "televisions", "LG", "LG 43\" 4K Smart TV", "Ultra HD · webOS · HDR10", 32999, 42999, 799, 4.4, "860", "p-lgtv", { bestseller: true }],
    ["whirlpool-258", "refrigerators", "Whirlpool", "Whirlpool 258L Refrigerator", "Frost free · Double door · 3 star", 28990, 34999, 799, 4.3, "624", "p-fridge", { bestseller: true }],
    ["ifb-8kg", "washing-machines", "IFB", "IFB 8kg Washing Machine", "Front load · 5 star · Steam wash", 27990, 33999, 799, 4.4, "410", "p-washer", { bestseller: true }],
    ["boat-141", "speakers-audio", "boAt", "boAt Airdopes 141", "Wireless Earbuds", 1299, 2499, 99, 4.2, "930", "p-earbuds", { bestseller: true }],
    ["iphone-15", "mobile-phones", "Apple", "iPhone 15", "128GB · Pink", 69900, 79900, 2499, 4.6, "2.1K", "rent-iphone", { rentDeal: true }],
    ["sony-55-tv", "televisions", "Sony", "Sony 55\" 4K TV", "Bravia · Google TV · Dolby Audio", 57990, 99900, 1899, 4.5, "740", "rent-tv", { rentDeal: true }],
    ["samsung-345", "refrigerators", "Samsung", "Double Door Refrigerator", "345L · Convertible · Frost free", 38990, 47990, 1499, 4.4, "380", "rent-fridge", { rentDeal: true }],
    ["washer-7kg", "washing-machines", "LG", "LG 7kg Front Load Washing Machine", "Inverter direct drive · 5 star", 31990, 38990, 999, 4.4, "290", "rent-washer", { rentDeal: true, rentLabel: "Washing Machine" }],
    ["office-set", "furniture", "Ranak Home", "Office Table & Chair", "Engineered wood desk · Ergonomic chair", 15999, 24999, 499, 4.3, "150", "rent-office", { rentDeal: true }],
    ["daikin-ac", "air-conditioners", "Daikin", "Daikin 1.5 Ton 5 Star Split AC", "Inverter · PM 2.5 filter · Copper", 41990, 58400, 1199, 4.5, "512", "cat-ac"],
    ["realme-5g", "mobile-phones", "realme", "realme 5G Smartphone", "8GB | 256GB · Sky Blue", 19999, 24999, 699, 4.3, "1.4K", "cat-mobile"],
    ["haier-32-tv", "televisions", "Haier", "Haier 32\" HD Smart TV", "HD Ready · Android TV", 13990, 21990, 449, 4.2, "540", "cat-tv"],
    ["haier-630", "refrigerators", "Haier", "Haier 630L French Door Refrigerator", "Inverter · Frost free · Glass finish", 74990, 99990, 2199, 4.5, "210", "cat-fridge"],
    ["hp-15s", "laptops-computers", "HP", "HP 15s Laptop", "Intel Core i5 · 16GB · 512GB SSD", 54990, 68990, 1599, 4.4, "980", "cat-laptop"],
    ["kitchen-combo", "kitchen-appliances", "Ranak Home", "Mixer Grinder & Air Fryer Combo", "750W mixer · 4.2L air fryer", 8999, 13999, 299, 4.3, "430", "cat-kitchen"],
    ["fabric-sofa", "furniture", "Ranak Home", "3-Seater Fabric Sofa", "Solid wood frame · Beige fabric", 24999, 39999, 999, 4.3, "210", "cat-furniture"],
    ["tower-speakers", "speakers-audio", "boAt", "Bluetooth Tower Speakers", "120W · Karaoke mic · RGB lights", 11999, 17999, 449, 4.3, "360", "cat-speakers"],
    ["camera-kit", "other-electronics", "Ranak Tech", "Digital Camera & Smart Gadgets", "Camera · Smart speaker · Air purifier", 34990, 44990, 1199, 4.2, "120", "cat-other"]
  ].map(([id, slug, brand, name, detail, price, mrp, rent, rating, reviews, image, flags = {}]) => ({
    id, categorySlug: slug, brand: esc(brand), name: esc(name), detail: esc(detail), price, mrp, rent, rating, reviews,
    image: `images/${image}.jpg`, bestseller: !!flags.bestseller, rentDeal: !!flags.rentDeal, rentLabel: esc(flags.rentLabel || "")
  }));

  function withCategoryNames(categories, products) {
    const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
    return {
      categories,
      products: products.filter((p) => bySlug[p.categorySlug]).map((p) => ({ ...p, category: bySlug[p.categorySlug].name }))
    };
  }

  // Map database rows to the HTML-escaped shape the storefront renders directly.
  function fromRows(categoryRows, productRows) {
    const slugById = Object.fromEntries(categoryRows.map((c) => [c.id, c.slug]));
    const categories = categoryRows.map((c) => ({ slug: c.slug, name: esc(c.name), group: c.nav_group || "", image: safeUrl(c.image_url) }));
    const products = productRows.map((p) => ({
      id: p.id,
      categorySlug: slugById[p.category_id],
      brand: esc(p.brand),
      name: esc(p.name),
      detail: esc(p.detail),
      price: p.price,
      mrp: p.mrp,
      rent: p.rent_per_month,
      rating: p.rating === null ? null : Number(p.rating),
      reviews: esc(p.reviews),
      image: safeUrl(p.image_url),
      bestseller: p.is_bestseller,
      rentDeal: p.is_rent_deal,
      rentLabel: esc(p.rent_label)
    }));
    return withCategoryNames(categories, products);
  }

  async function loadCatalog() {
    if (!client) return withCategoryNames(demoCategories, demoProducts);
    const [cats, prods] = await Promise.all([
      client.from("categories").select("*").order("sort_order").order("name"),
      client.from("products").select("*").eq("is_active", true).order("sort_order").order("created_at", { ascending: false })
    ]);
    if (cats.error || prods.error) throw cats.error || prods.error;
    return fromRows(cats.data, prods.data);
  }

  return { configured, client, bucket, navGroups, esc, safeUrl, loadCatalog, store: config.store || {} };
})();
