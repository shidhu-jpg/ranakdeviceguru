-- Ranak Device Guru — catalogue schema
-- Run once in Supabase → SQL Editor. Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(name) between 1 and 60),
  nav_group   text check (nav_group in ('Mobiles', 'Electronics', 'Home Appliances', 'Furniture')),
  image_url   text,
  image_path  text,            -- object path in the product-images bucket, used to delete old files
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references public.categories (id) on delete restrict,
  name            text not null check (length(name) between 1 and 120),
  brand           text,
  detail          text,
  price           integer not null check (price >= 0),
  mrp             integer check (mrp >= 0),
  rent_per_month  integer check (rent_per_month > 0),
  rating          numeric(2, 1) check (rating between 0 and 5),
  reviews         text,
  image_url       text,
  image_path      text,
  is_bestseller   boolean not null default false,
  is_rent_deal    boolean not null default false,
  rent_label      text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);

-- Store owners allowed to edit the catalogue (add a row per owner account)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Row-level security: everyone can read the catalogue, only admins can change it
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.admins     enable row level security;

drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories for select using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "active products readable" on public.products;
create policy "active products readable" on public.products for select
  using (is_active or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins see own row" on public.admins;
create policy "admins see own row" on public.admins for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: public product-images bucket, uploads restricted to admins
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Starter catalogue (the products currently on the site). Images point at the
-- site's own images/ folder until the owner uploads replacements.
-- Ratings are left empty on purpose: add real ones from the dashboard.
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, nav_group, image_url, sort_order) values
  ('mobile-phones',      'Mobile Phones',       'Mobiles',         'images/cat-mobile.jpg',    10),
  ('televisions',        'Televisions',         'Electronics',     'images/cat-tv.jpg',        20),
  ('refrigerators',      'Refrigerators',       'Home Appliances', 'images/cat-fridge.jpg',    30),
  ('washing-machines',   'Washing Machines',    'Home Appliances', 'images/cat-washer.jpg',    40),
  ('air-conditioners',   'Air Conditioners',    'Home Appliances', 'images/cat-ac.jpg',        50),
  ('laptops-computers',  'Laptops & Computers', 'Electronics',     'images/cat-laptop.jpg',    60),
  ('kitchen-appliances', 'Kitchen Appliances',  'Home Appliances', 'images/cat-kitchen.jpg',   70),
  ('furniture',          'Furniture',           'Furniture',       'images/cat-furniture.jpg', 80),
  ('speakers-audio',     'Speakers & Audio',    'Electronics',     'images/cat-speakers.jpg',  90),
  ('other-electronics',  'Other Electronics',   'Electronics',     'images/cat-other.jpg',    100)
on conflict (slug) do nothing;

insert into public.products (category_id, brand, name, detail, price, mrp, rent_per_month, image_url, is_bestseller, is_rent_deal, rent_label, sort_order)
select c.id, v.brand, v.name, v.detail, v.price, v.mrp, v.rent, v.image_url, v.bestseller, v.rent_deal, v.rent_label, v.sort_order
from (values
  ('mobile-phones',      'Samsung',    'Samsung Galaxy S24 5G',               '8GB | 128GB',                            59999,  69999, 1499, 'images/p-s24.jpg',         true,  false, null,              10),
  ('televisions',        'LG',         'LG 43" 4K Smart TV',                  'Ultra HD · webOS · HDR10',               32999,  42999,  799, 'images/p-lgtv.jpg',        true,  false, null,              20),
  ('refrigerators',      'Whirlpool',  'Whirlpool 258L Refrigerator',         'Frost free · Double door · 3 star',      28990,  34999,  799, 'images/p-fridge.jpg',      true,  false, null,              30),
  ('washing-machines',   'IFB',        'IFB 8kg Washing Machine',             'Front load · 5 star · Steam wash',       27990,  33999,  799, 'images/p-washer.jpg',      true,  false, null,              40),
  ('speakers-audio',     'boAt',       'boAt Airdopes 141',                   'Wireless Earbuds',                        1299,   2499,   99, 'images/p-earbuds.jpg',     true,  false, null,              50),
  ('mobile-phones',      'Apple',      'iPhone 15',                           '128GB · Pink',                           69900,  79900, 2499, 'images/rent-iphone.jpg',   false, true,  null,              60),
  ('televisions',        'Sony',       'Sony 55" 4K TV',                      'Bravia · Google TV · Dolby Audio',       57990,  99900, 1899, 'images/rent-tv.jpg',       false, true,  null,              70),
  ('refrigerators',      'Samsung',    'Double Door Refrigerator',            '345L · Convertible · Frost free',        38990,  47990, 1499, 'images/rent-fridge.jpg',   false, true,  null,              80),
  ('washing-machines',   'LG',         'LG 7kg Front Load Washing Machine',   'Inverter direct drive · 5 star',         31990,  38990,  999, 'images/rent-washer.jpg',   false, true,  'Washing Machine', 90),
  ('furniture',          'Ranak Home', 'Office Table & Chair',                'Engineered wood desk · Ergonomic chair', 15999,  24999,  499, 'images/rent-office.jpg',   false, true,  null,             100),
  ('air-conditioners',   'Daikin',     'Daikin 1.5 Ton 5 Star Split AC',      'Inverter · PM 2.5 filter · Copper',      41990,  58400, 1199, 'images/cat-ac.jpg',        false, false, null,             110),
  ('mobile-phones',      'realme',     'realme 5G Smartphone',                '8GB | 256GB · Sky Blue',                 19999,  24999,  699, 'images/cat-mobile.jpg',    false, false, null,             120),
  ('televisions',        'Haier',      'Haier 32" HD Smart TV',               'HD Ready · Android TV',                  13990,  21990,  449, 'images/cat-tv.jpg',        false, false, null,             130),
  ('refrigerators',      'Haier',      'Haier 630L French Door Refrigerator', 'Inverter · Frost free · Glass finish',   74990,  99990, 2199, 'images/cat-fridge.jpg',    false, false, null,             140),
  ('laptops-computers',  'HP',         'HP 15s Laptop',                       'Intel Core i5 · 16GB · 512GB SSD',       54990,  68990, 1599, 'images/cat-laptop.jpg',    false, false, null,             150),
  ('kitchen-appliances', 'Ranak Home', 'Mixer Grinder & Air Fryer Combo',     '750W mixer · 4.2L air fryer',             8999,  13999,  299, 'images/cat-kitchen.jpg',   false, false, null,             160),
  ('furniture',          'Ranak Home', '3-Seater Fabric Sofa',                'Solid wood frame · Beige fabric',        24999,  39999,  999, 'images/cat-furniture.jpg', false, false, null,             170),
  ('speakers-audio',     'boAt',       'Bluetooth Tower Speakers',            '120W · Karaoke mic · RGB lights',        11999,  17999,  449, 'images/cat-speakers.jpg',  false, false, null,             180),
  ('other-electronics',  'Ranak Tech', 'Digital Camera & Smart Gadgets',      'Camera · Smart speaker · Air purifier',  34990,  44990, 1199, 'images/cat-other.jpg',     false, false, null,             190)
) as v(slug, brand, name, detail, price, mrp, rent, image_url, bestseller, rent_deal, rent_label, sort_order)
join public.categories c on c.slug = v.slug
where not exists (select 1 from public.products);

-- ---------------------------------------------------------------------------
-- Make the store owner an admin (run after creating their user in
-- Authentication → Users; replace the email):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'owner@example.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------------
