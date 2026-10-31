// Copies the storefront files into www/ for the Android app.
// The admin panel, database scripts and build tools are left out of the app.
import { cpSync, rmSync, mkdirSync } from "node:fs";

const files = [
  "index.html", "app.css", "app.js", "data.js", "config.js",
  "favicon.png", "manifest.webmanifest", "sw.js", "images"
];

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of files) cpSync(f, `www/${f}`, { recursive: true });
console.log("Copied storefront into www/");
