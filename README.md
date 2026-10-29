# Ranak Device Guru

Online store for Ranak Device Guru, Motihari: electronics, home appliances and furniture to **buy or rent**. Plain HTML/CSS/JS with no build step, backed by Supabase.

| File | Purpose |
| --- | --- |
| `index.html`, `app.js`, `app.css` | Storefront: catalogue, search, cart drawer, checkout, order tracking |
| `admin.html`, `admin.js`, `admin.css` | Owner dashboard: orders, products (with photo upload), categories |
| `data.js` | Loads the catalogue from Supabase (falls back to a demo catalogue if not configured) |
| `config.js` | Supabase URL + publishable key, store phone/WhatsApp/email |
| `supabase/schema.sql` | Catalogue tables, security rules, `product-images` bucket, starter products |
| `supabase/orders.sql` | Orders table plus `place_order` / `track_order` functions |

## Setup

1. In Supabase → **SQL Editor**, run `supabase/schema.sql`, then `supabase/orders.sql`.
2. In **Authentication → Users**, add the owner, then make them an admin:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'owner@email.com';
   ```
3. Put the project URL and publishable key in `config.js`, along with the store's phone and WhatsApp number.
4. Deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). The `supabase/` and `tools/` folders don't need to be deployed.

## Product links and SEO

Every product has its own shareable link, e.g. `https://ranakdeviceguruareraj.in/?p=samsung-galaxy-s24-5g-14e38b29`. The **Share** button on product cards and product pages copies it or sends it to WhatsApp, Facebook, X, Telegram or email. Links keep working if a product is renamed, and old `#product/<id>` links redirect to the new form.

Each product page sets its own title, description, canonical link and Google Product data. The site address `https://ranakdeviceguruareraj.in/` appears in `config.js` (`siteUrl`), `index.html` (social preview image and store details) and `robots.txt`; change all three if the store uses a different domain.

After adding, renaming or removing products, regenerate the sitemap and redeploy:

```
node tools/build-sitemap.mjs
```

Then submit `https://ranakdeviceguruareraj.in/sitemap.xml` once in [Google Search Console](https://search.google.com/search-console).

## How orders work

Customers check out with their name, phone and address, and pay by cash or UPI on delivery. `place_order()` re-reads prices from the database, so totals can't be changed in the browser. The owner sees new orders in the dashboard's **Orders** tab, calls the customer to confirm, and updates the status. Customers can follow that status under **Track Order** using their order number and phone number.
