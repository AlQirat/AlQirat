-- Admin-configurable multi-product combo offers.
-- Prices are stored in Supabase and recalculated server-side before an order is created.

create table if not exists public.combo_offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text not null,
  subtitle text,
  description text,
  banner_image_url text,
  mobile_banner_image_url text,
  cta_label text not null default 'Shop Combos',
  cta_href text not null default '/combo',
  default_unit_price numeric(12, 2) not null default 180 check (default_unit_price >= 0),
  combo_price numeric(12, 2) not null default 499 check (combo_price >= 0),
  bundle_quantity integer not null default 3 check (bundle_quantity > 0),
  min_quantity integer not null default 3 check (min_quantity > 0),
  max_quantity integer not null default 25 check (max_quantity >= min_quantity),
  max_quantity_per_product integer not null default 25 check (max_quantity_per_product > 0),
  allow_same_product boolean not null default true,
  allow_mixed_products boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.combo_offer_products (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.combo_offers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, product_id)
);

create table if not exists public.cart_combo_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  offer_id uuid not null references public.combo_offers(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, offer_id, product_id)
);

alter table public.orders
  add column if not exists discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0);

alter table public.order_items
  add column if not exists combo_offer_id uuid references public.combo_offers(id) on delete set null;

create index if not exists combo_offer_products_offer_idx
  on public.combo_offer_products(offer_id, is_active, sort_order);
create index if not exists combo_offer_products_product_idx
  on public.combo_offer_products(product_id);
create index if not exists cart_combo_items_cart_idx
  on public.cart_combo_items(cart_id, offer_id);
create index if not exists order_items_combo_offer_idx
  on public.order_items(combo_offer_id);

drop trigger if exists combo_offers_set_updated_at on public.combo_offers;
create trigger combo_offers_set_updated_at before update on public.combo_offers
for each row execute function public.set_updated_at();
drop trigger if exists combo_offer_products_set_updated_at on public.combo_offer_products;
create trigger combo_offer_products_set_updated_at before update on public.combo_offer_products
for each row execute function public.set_updated_at();
drop trigger if exists cart_combo_items_set_updated_at on public.cart_combo_items;
create trigger cart_combo_items_set_updated_at before update on public.cart_combo_items
for each row execute function public.set_updated_at();

alter table public.combo_offers enable row level security;
alter table public.combo_offer_products enable row level security;
alter table public.cart_combo_items enable row level security;

drop policy if exists "Public reads active combo offers" on public.combo_offers;
create policy "Public reads active combo offers" on public.combo_offers
for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "Admins manage combo offers" on public.combo_offers;
create policy "Admins manage combo offers" on public.combo_offers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads active combo products" on public.combo_offer_products;
create policy "Public reads active combo products" on public.combo_offer_products
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.combo_offers
    where combo_offers.id = combo_offer_products.offer_id and combo_offers.is_active
  )
);
drop policy if exists "Admins manage combo products" on public.combo_offer_products;
create policy "Admins manage combo products" on public.combo_offer_products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Customers manage own combo cart items" on public.cart_combo_items;
create policy "Customers manage own combo cart items" on public.cart_combo_items
for all to authenticated
using (exists (select 1 from public.carts where carts.id = cart_combo_items.cart_id and carts.auth_user_id = auth.uid()) or public.is_admin())
with check (exists (select 1 from public.carts where carts.id = cart_combo_items.cart_id and carts.auth_user_id = auth.uid()) or public.is_admin());

grant select on public.combo_offers, public.combo_offer_products to anon, authenticated;
grant insert, update, delete on public.combo_offers, public.combo_offer_products to authenticated;
grant select, insert, update, delete on public.cart_combo_items to authenticated;

insert into public.combo_offers (
  id, slug, name, title, subtitle, description, banner_image_url, mobile_banner_image_url,
  cta_label, cta_href, default_unit_price, combo_price, bundle_quantity, min_quantity,
  max_quantity, max_quantity_per_product, allow_same_product, allow_mixed_products, is_active
)
values (
  '80000000-0000-4000-8000-000000000001',
  'choose-any-3',
  'Choose Any 3 Perfumes',
  'Choose Any 3 Perfumes for ₹499',
  'Build your own fragrance combination from our eligible perfumes.',
  'Select any three perfumes of your choice. Mix different fragrances or repeat a favourite.',
  '/COMBO.png',
  '/COMBO.png',
  'Shop Combos',
  '/combo',
  180,
  499,
  3,
  3,
  25,
  25,
  true,
  true,
  true
)
on conflict (slug) do nothing;

insert into public.combo_offer_products (offer_id, product_id, unit_price, sort_order)
select offers.id, products.id, offers.default_unit_price, row_number() over (order by products.created_at, products.id) - 1
from public.combo_offers as offers
cross join public.products
where offers.slug = 'choose-any-3'
  and products.is_active
  and not exists (
    select 1 from public.combo_offer_products as existing
    where existing.offer_id = offers.id and existing.product_id = products.id
  );

-- The existing combo hero slide remains managed from Hero Slides, but now opens the offer page.
update public.hero_slides
set cta_label = 'Shop Combos', cta_href = '/combo'
where desktop_image_url = '/COMBO.png';

create or replace function public.combo_cart_lines(p_cart_id uuid)
returns table (
  offer_id uuid,
  product_id uuid,
  quantity integer,
  effective_unit_price numeric,
  line_total numeric,
  regular_line_total numeric
)
language sql
security definer
set search_path = ''
as $$
  with source as (
    select
      cart_items.offer_id,
      cart_items.product_id,
      cart_items.quantity,
      offer_products.unit_price,
      offers.combo_price,
      offers.bundle_quantity,
      sum(cart_items.quantity) over (partition by cart_items.offer_id)::integer as total_quantity
    from public.cart_combo_items as cart_items
    join public.combo_offers as offers on offers.id = cart_items.offer_id
    join public.combo_offer_products as offer_products
      on offer_products.offer_id = cart_items.offer_id
      and offer_products.product_id = cart_items.product_id
      and offer_products.is_active
    where cart_items.cart_id = p_cart_id
  ),
  ordered as (
    select
      source.*,
      coalesce(sum(source.quantity) over (
        partition by source.offer_id order by source.product_id
        rows between unbounded preceding and 1 preceding
      ), 0)::integer as cumulative_start,
      sum(source.quantity) over (
        partition by source.offer_id order by source.product_id
        rows between unbounded preceding and current row
      )::integer as cumulative_end
    from source
  ),
  allocated as (
    select
      ordered.*,
      (ordered.total_quantity - mod(ordered.total_quantity, ordered.bundle_quantity))::integer as bundle_units,
      (
        greatest(0, ordered.cumulative_end - (ordered.total_quantity - mod(ordered.total_quantity, ordered.bundle_quantity)))
        - greatest(0, ordered.cumulative_start - (ordered.total_quantity - mod(ordered.total_quantity, ordered.bundle_quantity)))
      )::integer as extra_quantity
    from ordered
  ),
  raw_lines as (
    select
      allocated.*,
      (
        (allocated.quantity - allocated.extra_quantity)::numeric * allocated.combo_price / allocated.bundle_quantity
        + allocated.extra_quantity::numeric * allocated.unit_price
      ) as raw_line_total,
      (
        floor(allocated.total_quantity::numeric / allocated.bundle_quantity) * allocated.combo_price
        + sum(allocated.extra_quantity::numeric * allocated.unit_price) over (partition by allocated.offer_id)
      ) as offer_total
    from allocated
  ),
  rounded_lines as (
    select
      raw_lines.*,
      round(raw_lines.raw_line_total, 2) as rounded_line_total,
      sum(round(raw_lines.raw_line_total, 2)) over (partition by raw_lines.offer_id) as rounded_offer_total,
      row_number() over (partition by raw_lines.offer_id order by raw_lines.product_id desc) as reverse_position
    from raw_lines
  ),
  adjusted_lines as (
    select
      rounded_lines.*,
      round(
        rounded_lines.rounded_line_total
        + case when rounded_lines.reverse_position = 1
          then rounded_lines.offer_total - rounded_lines.rounded_offer_total
          else 0 end,
        2
      ) as adjusted_line_total
    from rounded_lines
  )
  select
    adjusted_lines.offer_id,
    adjusted_lines.product_id,
    adjusted_lines.quantity,
    round(adjusted_lines.adjusted_line_total / adjusted_lines.quantity, 2),
    adjusted_lines.adjusted_line_total,
    round(adjusted_lines.unit_price * adjusted_lines.quantity, 2)
  from adjusted_lines;
$$;

create or replace function public.validate_customer_cart(p_cart_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  combo_row record;
begin
  if p_cart_id is null then raise exception 'Your cart is empty.'; end if;

  if not exists (select 1 from public.carts where id = p_cart_id and status = 'active') then
    raise exception 'Your cart is empty.';
  end if;

  if exists (
    select 1
    from public.cart_items as items
    join public.products on products.id = items.product_id
    where items.cart_id = p_cart_id
      and (
        not products.is_active
        or items.unit_price is null
        or (items.variant_size is null and products.stock_quantity < items.quantity)
        or (
          items.variant_size is not null
          and coalesce((
            select (variant.value ->> 'stock')::integer
            from jsonb_array_elements(products.variants) as variant(value)
            where variant.value ->> 'size' = items.variant_size
            limit 1
          ), -1) < items.quantity
        )
      )
  ) then
    raise exception 'One or more products are unavailable in the requested quantity.';
  end if;

  if exists (
    select 1
    from public.cart_combo_items as combo_items
    left join public.combo_offers as offers on offers.id = combo_items.offer_id and offers.is_active
    left join public.combo_offer_products as offer_products
      on offer_products.offer_id = combo_items.offer_id
      and offer_products.product_id = combo_items.product_id
      and offer_products.is_active
    left join public.products on products.id = combo_items.product_id and products.is_active
    where combo_items.cart_id = p_cart_id
      and (offers.id is null or offer_products.product_id is null or products.id is null)
  ) then
    raise exception 'The combo offer or one of its products changed. Please refresh and select your perfumes again.';
  end if;

  for combo_row in
    select
      offers.id as offer_id,
      offers.bundle_quantity,
      offers.min_quantity,
      offers.max_quantity,
      offers.max_quantity_per_product,
      offers.allow_same_product,
      offers.allow_mixed_products,
      sum(combo_items.quantity)::integer as total_quantity
    from public.cart_combo_items as combo_items
    join public.combo_offers as offers on offers.id = combo_items.offer_id and offers.is_active
    where combo_items.cart_id = p_cart_id
    group by offers.id, offers.bundle_quantity, offers.min_quantity, offers.max_quantity,
      offers.max_quantity_per_product, offers.allow_same_product, offers.allow_mixed_products
  loop
    if combo_row.total_quantity < combo_row.min_quantity or combo_row.total_quantity > combo_row.max_quantity then
      raise exception 'The combo selection must contain between % and % perfumes.', combo_row.min_quantity, combo_row.max_quantity;
    end if;
    if not combo_row.allow_same_product and exists (
      select 1 from public.cart_combo_items
      where cart_id = p_cart_id and offer_id = combo_row.offer_id and quantity > 1
    ) then
      raise exception 'This combo does not allow repeated perfumes.';
    end if;
    if not combo_row.allow_mixed_products and (
      select count(*) from public.cart_combo_items
      where cart_id = p_cart_id and offer_id = combo_row.offer_id
    ) > 1 then
      raise exception 'This combo allows only one perfume.';
    end if;
    if exists (
      select 1 from public.cart_combo_items
      where cart_id = p_cart_id and offer_id = combo_row.offer_id
        and quantity > combo_row.max_quantity_per_product
    ) then
      raise exception 'One perfume exceeds the maximum allowed quantity for this combo.';
    end if;
  end loop;

  if exists (
    with requested as (
      select product_id, sum(quantity)::integer as quantity
      from public.cart_combo_items
      where cart_id = p_cart_id
      group by product_id
      union all
      select product_id, sum(quantity)::integer
      from public.cart_items
      where cart_id = p_cart_id and variant_size is null
      group by product_id
    ), totals as (
      select product_id, sum(quantity)::integer as quantity
      from requested group by product_id
    )
    select 1
    from totals
    join public.products on products.id = totals.product_id
    where products.stock_quantity < totals.quantity
  ) then
    raise exception 'One or more products are unavailable in the requested quantity.';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = p_cart_id)
    and not exists (select 1 from public.cart_combo_items where cart_id = p_cart_id) then
    raise exception 'Your cart is empty.';
  end if;
end;
$$;

create or replace function public.customer_cart_totals(p_cart_id uuid)
returns table (regular_subtotal numeric, subtotal numeric, discount_amount numeric)
language sql
security definer
set search_path = ''
as $$
  with normal_totals as (
    select coalesce(sum(items.unit_price * items.quantity), 0) as regular_total
    from public.cart_items as items
    where items.cart_id = p_cart_id
  ), combo_totals as (
    select
      coalesce(sum(lines.regular_line_total), 0) as regular_total,
      coalesce(sum(lines.line_total), 0) as combo_total
    from public.combo_cart_lines(p_cart_id) as lines
  )
  select
    normal_totals.regular_total + combo_totals.regular_total,
    normal_totals.regular_total + combo_totals.combo_total,
    greatest(0, normal_totals.regular_total - normal_totals.regular_total + combo_totals.regular_total - combo_totals.combo_total)
  from normal_totals cross join combo_totals;
$$;

create or replace function public.save_customer_cart_v2(p_items jsonb, p_combo_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  active_cart_id uuid;
  inserted_count integer;
  requested_count integer;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_combo_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Cart items must be JSON arrays.';
  end if;

  select carts.id into active_cart_id
  from public.carts
  where carts.auth_user_id = current_user_id and carts.status = 'active'
  for update;

  if active_cart_id is null then
    insert into public.carts (auth_user_id) values (current_user_id)
    returning id into active_cart_id;
  end if;

  delete from public.cart_items where cart_id = active_cart_id;
  delete from public.cart_combo_items where cart_id = active_cart_id;

  insert into public.cart_items (cart_id, product_id, quantity, variant_size, unit_price)
  select
    active_cart_id,
    products.id,
    least(25, greatest(1, (item.value ->> 'quantity')::integer)),
    nullif(trim(item.value ->> 'variant_size'), ''),
    case
      when nullif(trim(item.value ->> 'variant_size'), '') is null then products.price
      else (
        select (variant.value ->> 'price')::numeric
        from jsonb_array_elements(products.variants) as variant(value)
        where variant.value ->> 'size' = nullif(trim(item.value ->> 'variant_size'), '')
        limit 1
      )
    end
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item(value)
  join public.products on products.slug = item.value ->> 'slug'
  where products.is_active
    and (
      nullif(trim(item.value ->> 'variant_size'), '') is null
      or exists (
        select 1 from jsonb_array_elements(products.variants) as variant(value)
        where variant.value ->> 'size' = nullif(trim(item.value ->> 'variant_size'), '')
      )
    );

  get diagnostics inserted_count = row_count;
  if inserted_count <> jsonb_array_length(coalesce(p_items, '[]'::jsonb)) then
    raise exception 'One or more products or variants are unavailable. Refresh the catalog and try again.';
  end if;

  select count(*) into requested_count
  from (
    select item.offer_id, item.product_id
    from jsonb_to_recordset(coalesce(p_combo_items, '[]'::jsonb)) as item(offer_id uuid, product_id uuid, quantity integer)
    group by item.offer_id, item.product_id
  ) as requested;

  insert into public.cart_combo_items (cart_id, offer_id, product_id, quantity, unit_price)
  select active_cart_id, requested.offer_id, requested.product_id, sum(requested.quantity)::integer, offer_products.unit_price
  from (
    select item.offer_id, item.product_id, item.quantity
    from jsonb_to_recordset(coalesce(p_combo_items, '[]'::jsonb)) as item(offer_id uuid, product_id uuid, quantity integer)
  ) as requested
  join public.combo_offers as offers on offers.id = requested.offer_id and offers.is_active
  join public.combo_offer_products as offer_products
    on offer_products.offer_id = requested.offer_id
    and offer_products.product_id = requested.product_id
    and offer_products.is_active
  join public.products on products.id = requested.product_id and products.is_active
  where requested.quantity > 0
  group by requested.offer_id, requested.product_id, offer_products.unit_price;

  get diagnostics inserted_count = row_count;
  if inserted_count <> requested_count then
    raise exception 'One or more combo products are no longer eligible. Refresh the offer and try again.';
  end if;

  perform public.validate_customer_cart(active_cart_id);
  return active_cart_id;
end;
$$;

create or replace function public.save_customer_cart(p_items jsonb)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.save_customer_cart_v2(p_items, '[]'::jsonb);
$$;

create or replace function public.place_customer_order(p_address_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_customer public.customers%rowtype;
  selected_address public.delivery_addresses%rowtype;
  active_cart_id uuid;
  created_order_id uuid;
  created_order_number text;
  calculated_subtotal numeric(12, 2);
  calculated_regular_subtotal numeric(12, 2);
  calculated_discount numeric(12, 2);
  calculated_shipping numeric(12, 2);
  free_shipping_threshold numeric(12, 2) := 999;
  standard_shipping_amount numeric(12, 2) := 90;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into current_customer from public.customers where auth_user_id = current_user_id;
  if not found then raise exception 'Customer profile was not found.'; end if;
  select * into selected_address from public.delivery_addresses where id = p_address_id and auth_user_id = current_user_id;
  if not found then raise exception 'Delivery address was not found.'; end if;
  select carts.id into active_cart_id from public.carts where auth_user_id = current_user_id and status = 'active' for update;
  perform public.validate_customer_cart(active_cart_id);

  select totals.regular_subtotal, totals.subtotal, totals.discount_amount
  into calculated_regular_subtotal, calculated_subtotal, calculated_discount
  from public.customer_cart_totals(active_cart_id) as totals;
  if calculated_subtotal is null or calculated_subtotal <= 0 then raise exception 'Your cart is empty.'; end if;

  select settings.free_shipping_threshold, settings.standard_shipping_amount
  into free_shipping_threshold, standard_shipping_amount
  from public.delivery_settings as settings order by settings.updated_at desc limit 1;
  calculated_shipping := case when calculated_subtotal >= free_shipping_threshold then 0 else standard_shipping_amount end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (
    order_number, customer_id, customer_email, shipping_address, cart_id,
    status, payment_status, payment_method, subtotal, discount_amount, shipping_amount, total
  ) values (
    created_order_number, current_customer.id, current_customer.email,
    jsonb_build_object('recipient_name', selected_address.recipient_name, 'phone', selected_address.phone,
      'address_line_1', selected_address.address_line_1, 'address_line_2', selected_address.address_line_2,
      'city', selected_address.city, 'state', selected_address.state, 'postal_code', selected_address.postal_code,
      'country', selected_address.country), active_cart_id, 'pending', 'pending', 'cod', calculated_subtotal,
    calculated_discount, calculated_shipping, calculated_subtotal + calculated_shipping
  ) returning id into created_order_id;

  insert into public.order_items (order_id, product_id, product_name, variant_label, unit_price, quantity, line_total)
  select created_order_id, products.id, products.name, cart_items.variant_size, cart_items.unit_price,
    cart_items.quantity, round(cart_items.unit_price * cart_items.quantity, 2)
  from public.cart_items join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = active_cart_id;

  insert into public.order_items (order_id, product_id, product_name, variant_label, unit_price, quantity, line_total, combo_offer_id)
  select created_order_id, products.id, products.name, null, lines.effective_unit_price, lines.quantity,
    lines.line_total, lines.offer_id
  from public.combo_cart_lines(active_cart_id) as lines
  join public.products on products.id = lines.product_id;

  if exists (select 1 from public.order_items where order_id = created_order_id and variant_label is null) then
    update public.products
    set stock_quantity = products.stock_quantity - quantities.quantity
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items where order_id = created_order_id and variant_label is null group by product_id
    ) as quantities
    where products.id = quantities.product_id;
  end if;

  update public.products as product
  set variants = (
    select jsonb_agg(case when coalesce((select sum(order_items.quantity)::integer from public.order_items where order_items.order_id = created_order_id and order_items.product_id = product.id and order_items.variant_label = variant.value ->> 'size'), 0) > 0
      then jsonb_set(variant.value, '{stock}', to_jsonb(greatest(0, coalesce((variant.value ->> 'stock')::integer, 0) - coalesce((select sum(order_items.quantity)::integer from public.order_items where order_items.order_id = created_order_id and order_items.product_id = product.id and order_items.variant_label = variant.value ->> 'size'), 0))))
      else variant.value end)
    from jsonb_array_elements(product.variants) as variant(value)
  )
  where exists (select 1 from public.order_items where order_items.order_id = created_order_id and order_items.product_id = product.id and order_items.variant_label is not null);

  update public.products as product
  set stock_quantity = coalesce((select sum((variant.value ->> 'stock')::integer)::integer from jsonb_array_elements(product.variants) as variant(value)), 0)
  where exists (select 1 from public.order_items where order_items.order_id = created_order_id and order_items.product_id = product.id and order_items.variant_label is not null);

  update public.carts set status = 'converted', updated_at = now() where id = active_cart_id;
  return created_order_number;
end;
$$;

create or replace function public.prepare_customer_razorpay_order(p_address_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_customer public.customers%rowtype;
  selected_address public.delivery_addresses%rowtype;
  active_cart_id uuid;
  existing_order public.orders%rowtype;
  created_order_id uuid;
  created_order_number text;
  calculated_subtotal numeric(12, 2);
  calculated_regular_subtotal numeric(12, 2);
  calculated_discount numeric(12, 2);
  calculated_shipping numeric(12, 2);
  free_shipping_threshold numeric(12, 2) := 999;
  standard_shipping_amount numeric(12, 2) := 90;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into current_customer from public.customers where auth_user_id = current_user_id for update;
  if not found then raise exception 'Customer profile was not found.'; end if;
  select * into selected_address from public.delivery_addresses where id = p_address_id and auth_user_id = current_user_id;
  if not found then raise exception 'Delivery address was not found.'; end if;
  select carts.id into active_cart_id from public.carts where carts.auth_user_id = current_user_id and carts.status = 'active' for update;
  if active_cart_id is null then raise exception 'Your cart is empty.'; end if;

  select * into existing_order from public.orders where orders.cart_id = active_cart_id and orders.payment_method = 'razorpay' and orders.payment_status = 'pending' and orders.status = 'pending' for update;
  if found then
    return jsonb_build_object('order_id', existing_order.id, 'order_number', existing_order.order_number, 'razorpay_order_id', existing_order.razorpay_order_id, 'amount', round(existing_order.total * 100)::bigint, 'currency', 'INR');
  end if;

  perform public.validate_customer_cart(active_cart_id);
  select totals.regular_subtotal, totals.subtotal, totals.discount_amount
  into calculated_regular_subtotal, calculated_subtotal, calculated_discount
  from public.customer_cart_totals(active_cart_id) as totals;
  select settings.free_shipping_threshold, settings.standard_shipping_amount into free_shipping_threshold, standard_shipping_amount from public.delivery_settings as settings order by settings.updated_at desc limit 1;
  calculated_shipping := case when calculated_subtotal >= free_shipping_threshold then 0 else standard_shipping_amount end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (order_number, customer_id, customer_email, shipping_address, cart_id, status, payment_status, payment_method, subtotal, discount_amount, shipping_amount, total)
  values (created_order_number, current_customer.id, current_customer.email,
    jsonb_build_object('recipient_name', selected_address.recipient_name, 'phone', selected_address.phone, 'address_line_1', selected_address.address_line_1, 'address_line_2', selected_address.address_line_2, 'city', selected_address.city, 'state', selected_address.state, 'postal_code', selected_address.postal_code, 'country', selected_address.country),
    active_cart_id, 'pending', 'pending', 'razorpay', calculated_subtotal, calculated_discount, calculated_shipping, calculated_subtotal + calculated_shipping
  ) returning id into created_order_id;

  insert into public.order_items (order_id, product_id, product_name, variant_label, unit_price, quantity, line_total)
  select created_order_id, products.id, products.name, cart_items.variant_size, cart_items.unit_price, cart_items.quantity, round(cart_items.unit_price * cart_items.quantity, 2)
  from public.cart_items join public.products on products.id = cart_items.product_id where cart_items.cart_id = active_cart_id;
  insert into public.order_items (order_id, product_id, product_name, variant_label, unit_price, quantity, line_total, combo_offer_id)
  select created_order_id, products.id, products.name, null, lines.effective_unit_price, lines.quantity, lines.line_total, lines.offer_id
  from public.combo_cart_lines(active_cart_id) as lines join public.products on products.id = lines.product_id;

  return jsonb_build_object('order_id', created_order_id, 'order_number', created_order_number, 'razorpay_order_id', null, 'amount', round((calculated_subtotal + calculated_shipping) * 100)::bigint, 'currency', 'INR');
end;
$$;

revoke all on function public.combo_cart_lines(uuid) from public;
revoke all on function public.validate_customer_cart(uuid) from public;
revoke all on function public.customer_cart_totals(uuid) from public;
revoke all on function public.save_customer_cart_v2(jsonb, jsonb) from public;
grant execute on function public.save_customer_cart_v2(jsonb, jsonb) to authenticated;
grant execute on function public.save_customer_cart(jsonb) to authenticated;
grant execute on function public.place_customer_order(uuid) to authenticated;
grant execute on function public.prepare_customer_razorpay_order(uuid) to authenticated;

notify pgrst, 'reload schema';
