// Supabase connection. Copy these from Supabase → Project Settings → API.
// The anon key is safe to publish: row-level security (supabase/schema.sql) stops visitors from editing anything.
// Leave both empty to run the store on the built-in demo catalogue.
window.RDG_CONFIG = {
  supabaseUrl: "https://fdnlrktzgvsnvjszhvbl.supabase.co",
  supabaseAnonKey: "sb_publishable_6k5gk4707iXGMMRUcxqP2A_-7mPZMg5",
  bucket: "product-images",

  // The live site address, used by tools/build-sitemap.mjs. Also update it in index.html and robots.txt if it changes.
  siteUrl: "https://ranakdeviceguruareraj.in/",

  // Store contact details shown on the site. Leave a value empty to hide it.
  store: {
    phone: "",            // e.g. "+91 98765 43210"
    whatsapp: "",         // digits with country code, e.g. "919876543210" — enables "Send on WhatsApp" after an order
    email: "hello@ranakdeviceguru.in",
    address: "Motihari, Bihar 845401"
  }
};
