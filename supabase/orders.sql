-- Ranak Device Guru — orders (run after schema.sql). Safe to re-run.
-- Customers never write to the orders table directly: they call place_order(), which
-- re-reads prices from public.products so totals can't be tampered with in the browser.

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  customer_name       text not null,
  phone               text not null,
  address             text not null,
  pincode             text not null,
  notes               text,
  items               jsonb not null,
  purchase_total      integer not null default 0,
  monthly_rent_total  integer not null default 0,
  status              text not null default 'new'
                      check (status in ('new', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;

drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders for select using (public.is_admin());
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders admin delete" on public.orders;
create policy "orders admin delete" on public.orders for delete using (public.is_admin());

-- Rental pricing must match rentPrice() in app.js: 3 months +30%, 6 months +12%, 12 months base rate.
create or replace function public.place_order(p_customer jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name    text := btrim(coalesce(p_customer ->> 'name', ''));
  v_phone   text := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\D', '', 'g');
  v_address text := btrim(coalesce(p_customer ->> 'address', ''));
  v_pin     text := btrim(coalesce(p_customer ->> 'pincode', ''));
  v_notes   text := left(btrim(coalesce(p_customer ->> 'notes', '')), 500);
  v_item    jsonb;
  v_product public.products%rowtype;
  v_mode    text;
  v_tenure  integer;
  v_qty     integer;
  v_unit    integer;
  v_lines   jsonb := '[]'::jsonb;
  v_buy     integer := 0;
  v_rent    integer := 0;
  v_number  text;
begin
  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Please enter your full name.';
  end if;
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then
    v_phone := right(v_phone, 10);
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'Please enter a valid 10-digit mobile number.';
  end if;
  if length(v_address) < 10 or length(v_address) > 400 then
    raise exception 'Please enter your full delivery address.';
  end if;
  if v_pin !~ '^[1-9][0-9]{5}$' then
    raise exception 'Please enter a valid 6-digit PIN code.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;
  if jsonb_array_length(p_items) > 25 then
    raise exception 'Too many items in one order. Please split it into smaller orders.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      select * into v_product from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active;
    exception when invalid_text_representation then
      raise exception 'A product in your cart is no longer available. Please refresh the page.';
    end;
    if not found then
      raise exception 'A product in your cart is no longer available. Please refresh the page.';
    end if;

    v_mode := coalesce(v_item ->> 'mode', 'buy');
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Quantity must be between 1 and 10.';
    end if;

    if v_mode = 'rent' then
      v_tenure := (v_item ->> 'tenure')::integer;
      if v_product.rent_per_month is null or v_tenure is null or v_tenure not in (3, 6, 12) then
        raise exception '% is not available on rent for that plan.', v_product.name;
      end if;
      v_unit := round(v_product.rent_per_month * case v_tenure when 3 then 1.3 when 6 then 1.12 else 1 end);
      v_rent := v_rent + v_unit * v_qty;
    elsif v_mode = 'buy' then
      v_tenure := null;
      v_unit := v_product.price;
      v_buy := v_buy + v_unit * v_qty;
    else
      raise exception 'Invalid item in cart.';
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'image_url', v_product.image_url,
      'mode', v_mode, 'tenure', v_tenure, 'quantity', v_qty, 'unit_price', v_unit);
  end loop;

  loop
    v_number := 'RDG-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.orders o where o.order_number = v_number);
  end loop;

  insert into public.orders (order_number, customer_name, phone, address, pincode, notes, items, purchase_total, monthly_rent_total)
  values (v_number, v_name, v_phone, v_address, v_pin, nullif(v_notes, ''), v_lines, v_buy, v_rent);

  return jsonb_build_object('order_number', v_number, 'purchase_total', v_buy, 'monthly_rent_total', v_rent);
end $$;

-- Customers look up their own order with order number + the phone number used to place it.
create or replace function public.track_order(p_order_number text, p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'order_number', o.order_number, 'status', o.status, 'created_at', o.created_at,
    'items', o.items, 'purchase_total', o.purchase_total, 'monthly_rent_total', o.monthly_rent_total)
  from public.orders o
  where o.order_number = upper(btrim(p_order_number))
    and o.phone = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
  limit 1;
$$;

revoke all on function public.place_order(jsonb, jsonb) from public;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
