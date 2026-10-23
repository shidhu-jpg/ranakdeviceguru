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
4. Deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). The `supabase/` folder doesn't need to be deployed.

## How orders work

Customers check out with their name, phone and address, and pay by cash or UPI on delivery. `place_order()` re-reads prices from the database, so totals can't be changed in the browser. The owner sees new orders in the dashboard's **Orders** tab, calls the customer to confirm, and updates the status. Customers can follow that status under **Track Order** using their order number and phone number.
