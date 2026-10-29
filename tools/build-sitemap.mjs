// Writes sitemap.xml listing the home page and every active product, so Google can find each product page.
// Run it after adding, renaming or removing products, then redeploy:  node tools/build-sitemap.mjs
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sandbox = { window: {} };
vm.runInNewContext(await readFile(new URL("config.js", root), "utf8"), sandbox);
const { supabaseUrl, supabaseAnonKey, siteUrl } = sandbox.window.RDG_CONFIG;
if (!supabaseUrl || !supabaseAnonKey || !siteUrl) throw new Error("Set supabaseUrl, supabaseAnonKey and siteUrl in config.js first");
const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;

const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,updated_at&is_active=eq.true&order=sort_order`, {
  headers: { apikey: supabaseAnonKey }
});
if (!res.ok) throw new Error(`Supabase returned ${res.status}: ${await res.text()}`);
const products = await res.json();

// Must match productSlug() in app.js
const slug = (p) => {
  const words = p.name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
  return [words, p.id.slice(0, 8)].filter(Boolean).join("-");
};
const xml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const day = (iso) => iso.slice(0, 10);
const newest = products.reduce((max, p) => (p.updated_at > max ? p.updated_at : max), new Date(0).toISOString());

const urls = [
  `  <url><loc>${xml(base)}</loc><lastmod>${day(newest)}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ...products.map((p) => `  <url><loc>${xml(`${base}?p=${slug(p)}`)}</loc><lastmod>${day(p.updated_at)}</lastmod><priority>0.8</priority></url>`)
];
await writeFile(new URL("sitemap.xml", root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`sitemap.xml written with ${products.length} products`);
