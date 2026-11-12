// Writes sitemap.xml listing the home page and every product in data.js, so Google can find each product page.
// Run it after adding, renaming or removing products, then redeploy:  node tools/build-sitemap.mjs
import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sandbox = { window: {}, module: { exports: {} } };
vm.runInNewContext(await readFile(new URL("config.js", root), "utf8"), sandbox);
vm.runInNewContext(await readFile(new URL("data.js", root), "utf8"), sandbox);
const { siteUrl } = sandbox.window.RDG_CONFIG;
if (!siteUrl) throw new Error("Set siteUrl in config.js first");
const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
const products = sandbox.module.exports.PRODUCTS.map(([id, , , name]) => ({ id, name }));

// Must match productSlug() in app.js
const slug = (p) => {
  const words = p.name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
  return [words, p.id.slice(0, 8)].filter(Boolean).join("-");
};
const xml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const today = new Date().toISOString().slice(0, 10);

const urls = [
  `  <url><loc>${xml(base)}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ...products.map((p) => `  <url><loc>${xml(`${base}?p=${slug(p)}`)}</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`)
];
await writeFile(new URL("sitemap.xml", root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`sitemap.xml written with ${products.length} products`);
