// Store catalogue. Everything here is static: no database is needed.
//
// To add or change a product, edit the PRODUCTS list below and put its photo in images/.
// Fields: id (keep it unchanged once shared — product links use it), category slug, brand, name,
// detail line, price, MRP, rent per month (0 = not for rent), photo path, and optional flags:
//   bestseller: true   → shows in Bestsellers
//   rentDeal: true     → shows in Rental Deals
//   rentLabel: "..."   → shorter name on the rental card
// After changing products, run `node tools/build-sitemap.mjs` to refresh sitemap.xml.

const RDG = (() => {
  const config = window.RDG_CONFIG || {};
  const navGroups = ["Mobiles", "Electronics", "Home Appliances", "Furniture"];

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Only allow https URLs or site-relative paths into src attributes.
  const safeUrl = (url) => (/^(https:\/\/|images\/)/.test(url || "") ? esc(url) : "");

  // [slug, name, nav group, photo]
  const CATEGORIES = [
    ["mobile-phones", "Mobile Phones", "Mobiles", "images/cat-mobile.jpg"],
    ["televisions", "Televisions", "Electronics", "images/cat-tv.jpg"],
    ["refrigerators", "Refrigerators", "Home Appliances", "images/cat-fridge.jpg"],
    ["washing-machines", "Washing Machines", "Home Appliances", "images/cat-washer.jpg"],
    ["air-conditioners", "Air Conditioners", "Home Appliances", "images/cat-ac.jpg"],
    ["laptops-computers", "Laptops & Computers", "Electronics", "images/cat-laptop.jpg"],
    ["kitchen-appliances", "Kitchen Appliances", "Home Appliances", "images/cat-kitchen.jpg"],
    ["furniture", "Furniture", "Furniture", "images/cat-furniture.jpg"],
    ["speakers-audio", "Speakers & Audio", "Electronics", "images/cat-speakers.jpg"],
    ["other-electronics", "Other Electronics", "Electronics", "images/cat-other.jpg"]
  ];

  // [id, category, brand, name, detail, price, mrp, rent/month, photo, flags]
  const PRODUCTS = [
    ["14e38b29-196f-4271-90f4-88a97212ed7a", "mobile-phones", "Samsung", "Samsung Galaxy S24 5G", "8GB | 128GB", 59999, 69999, 1499, "images/p-s24.jpg", { bestseller: true }],
    ["6ebc3905-25dd-4bde-a244-31e491e80d66", "televisions", "LG", "LG 43\" 4K Smart TV", "Ultra HD · webOS · HDR10", 32999, 42999, 799, "images/p-lgtv.jpg", { bestseller: true }],
    ["1a56d50a-7c12-451f-98ce-7bb228d532e7", "refrigerators", "Whirlpool", "Whirlpool 258L Refrigerator", "Frost free · Double door · 3 star", 28990, 34999, 799, "images/whirlpool-258l.webp", { bestseller: true }],
    ["584b58ad-8c23-4b62-94cd-c1a0bb4c446a", "washing-machines", "IFB", "IFB 8kg Washing Machine", "Front load · 5 star · Steam wash", 27990, 33999, 799, "images/p-washer.jpg", { bestseller: true }],
    ["7eaa046c-4adb-4e9a-9d5c-392b394a65ce", "speakers-audio", "boAt", "boAt Airdopes 141", "Wireless Earbuds", 1299, 2499, 99, "images/p-earbuds.jpg", { bestseller: true }],
    ["14696229-d1d1-4bf9-a1b0-85d58256ed11", "mobile-phones", "Apple", "iPhone 15", "128GB · Pink", 69900, 79900, 2499, "images/rent-iphone.jpg", { rentDeal: true }],
    ["f867cead-193b-4d9d-99b1-56d6a385421a", "televisions", "Sony", "Sony 55\" 4K TV", "Bravia · Google TV · Dolby Audio", 57990, 99900, 1899, "images/rent-tv.jpg", { rentDeal: true }],
    ["5bd10424-7103-40d8-87ae-f4afe1b6510a", "refrigerators", "Samsung", "Double Door Refrigerator", "345L · Convertible · Frost free", 38990, 47990, 1499, "images/rent-fridge.jpg", { rentDeal: true }],
    ["36ffc892-ee74-406f-a2f1-3cf24da2687b", "washing-machines", "LG", "LG 7kg Front Load Washing Machine", "Inverter direct drive · 5 star", 31990, 38990, 999, "images/rent-washer.jpg", { rentDeal: true, rentLabel: "Washing Machine" }],
    ["132a8a4b-e3e3-4949-a5e4-0e68c99034bd", "furniture", "Ranak Home", "Office Table & Chair", "Engineered wood desk · Ergonomic chair", 15999, 24999, 499, "images/rent-office.jpg", { rentDeal: true }],
    ["af683324-7e4a-4d6a-acde-ee209247b16d", "air-conditioners", "Daikin", "Daikin 1.5 Ton 5 Star Split AC", "Inverter · PM 2.5 filter · Copper", 41990, 58400, 1199, "images/cat-ac.jpg"],
    ["28e8a05f-bad4-4460-a657-1492d59751b2", "mobile-phones", "realme", "realme 5G Smartphone", "8GB | 256GB · Sky Blue", 19999, 24999, 699, "images/cat-mobile.jpg"],
    ["20a22470-f4bd-4553-9953-c9c7a73ca520", "televisions", "Haier", "Haier 32\" HD Smart TV", "HD Ready · Android TV", 13990, 21990, 449, "images/cat-tv.jpg"],
    ["c557de25-33d7-4ed6-b203-b3ce7aa402cc", "refrigerators", "Haier", "Haier 630L French Door Refrigerator", "Inverter · Frost free · Glass finish", 74990, 99990, 2199, "images/cat-fridge.jpg"],
    ["2d5914c4-3ba5-42ca-be03-637784bccade", "laptops-computers", "HP", "HP 15s Laptop", "Intel Core i5 · 16GB · 512GB SSD", 54990, 68990, 1599, "images/cat-laptop.jpg"],
    ["4a08dc44-b6c6-4303-b661-595545a59da5", "kitchen-appliances", "Ranak Home", "Mixer Grinder & Air Fryer Combo", "750W mixer · 4.2L air fryer", 8999, 13999, 299, "images/cat-kitchen.jpg"],
    ["80934355-4ab5-4e05-a6e5-63f4129e2770", "furniture", "Ranak Home", "3-Seater Fabric Sofa", "Solid wood frame · Beige fabric", 24999, 39999, 999, "images/cat-furniture.jpg"],
    ["ea6df2e1-5f55-4f9e-beeb-213a68bd8e00", "speakers-audio", "boAt", "Bluetooth Tower Speakers", "120W · Karaoke mic · RGB lights", 11999, 17999, 449, "images/cat-speakers.jpg"],
    ["4c16a456-150c-4b11-8990-240f5b06158e", "other-electronics", "Ranak Tech", "Digital Camera & Smart Gadgets", "Camera · Smart speaker · Air purifier", 34990, 44990, 1199, "images/cat-other.jpg"]
  ];

  // Shape the lists into the HTML-escaped objects the storefront renders directly.
  function buildCatalog() {
    const categories = CATEGORIES.map(([slug, name, group, image]) => ({ slug, name: esc(name), group, image: safeUrl(image) }));
    const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
    const products = PRODUCTS
      .filter(([, slug]) => bySlug[slug])
      .map(([id, slug, brand, name, detail, price, mrp, rent, image, flags = {}]) => ({
        id,
        categorySlug: slug,
        category: bySlug[slug].name,
        brand: esc(brand),
        name: esc(name),
        detail: esc(detail),
        price,
        mrp,
        rent,
        rating: null,
        reviews: "",
        image: safeUrl(image),
        bestseller: !!flags.bestseller,
        rentDeal: !!flags.rentDeal,
        rentLabel: esc(flags.rentLabel || "")
      }));
    return { categories, products };
  }

  const loadCatalog = async () => buildCatalog();

  return { navGroups, esc, safeUrl, loadCatalog, buildCatalog, PRODUCTS, store: config.store || {} };
})();

// Lets tools/build-sitemap.mjs read the catalogue in Node.
if (typeof module !== "undefined") module.exports = RDG;
