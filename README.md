# Ranak Device Guru

Online store for Ranak Device Guru, Motihari: electronics, home appliances and furniture to **buy or rent**. Plain HTML/CSS/JS with no build step and no database: the whole site, including every product photo, is static files.

| File | Purpose |
| --- | --- |
| `index.html`, `app.js`, `app.css` | Storefront: catalogue, search, cart drawer, WhatsApp checkout |
| `data.js` | The catalogue: categories and products (name, price, MRP, rent, photo) |
| `config.js` | Site address and store phone/WhatsApp/email/address |
| `images/` | All photos used on the site |

## Setup

1. In `config.js`, set `store.whatsapp` to the store's WhatsApp number (digits with country code, e.g. `919876543210`). Checkout sends orders there, so the store can't take online orders without it. Add `store.phone` too.
2. Deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). The `tools/` folder doesn't need to be deployed.

## Adding or changing products

Edit the `PRODUCTS` list in `data.js` and put the photo in `images/`. Keep a product's `id` unchanged once it's live, because product links are built from it; a new product just needs any new unique id. Then regenerate the sitemap and redeploy.

## Product links and SEO

Every product has its own shareable link, e.g. `https://ranakdeviceguruareraj.in/?p=samsung-galaxy-s24-5g-14e38b29`. The **Share** button on product cards and product pages copies it or sends it to WhatsApp, Facebook, X, Telegram or email. Links keep working if a product is renamed, and old `#product/<id>` links redirect to the new form.

Each product page sets its own title, description, canonical link and Google Product data. The site address `https://ranakdeviceguruareraj.in/` appears in `config.js` (`siteUrl`), `index.html` (social preview image and store details) and `robots.txt`; change all three if the store uses a different domain.

After adding, renaming or removing products, regenerate the sitemap and redeploy:

```
node tools/build-sitemap.mjs
```

Then submit `https://ranakdeviceguruareraj.in/sitemap.xml` once in [Google Search Console](https://search.google.com/search-console).

## Installable app

The store installs as an app on Android, iPhone and desktop (`manifest.webmanifest`, `sw.js`, icons in `images/icons/`). Visitors always see a **Get App** button in the header and a one-time install banner. In Chrome, Edge and Samsung Internet it installs in one tap; elsewhere (iPhone, Firefox, links opened inside WhatsApp or Instagram) it shows the steps for that device. Once installed it opens full-screen from its own icon, and it keeps working on a weak connection using the last saved pages, photos and catalogue.

Code and page updates reach installed apps automatically the next time they open online. If you change the list of files in `SHELL` at the top of `sw.js`, bump `CACHE` (e.g. `rdg-v2`) so old saved copies are cleared.

## How orders work

Customers fill in their name, mobile number, address and PIN code at checkout, then press **Order on WhatsApp**. WhatsApp opens with the full order (items, buy/rent totals, address and an order reference like `RDG-1A2B3C`) ready to send to the store's number. Payment is cash or UPI on delivery. The store team confirms on a call; customers ask about their order on WhatsApp using the reference.
