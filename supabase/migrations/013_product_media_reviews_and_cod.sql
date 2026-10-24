-- Product galleries, customer review permissions, and variant-aware COD checkout.
-- This migration is additive and does not delete application records.

alter table public.products
  add column if not exists gallery_urls text[] not null default '{}';

comment on column public.products.gallery_urls is
  'Additional product image URLs. image_url remains the primary image.';

create index if not exists reviews_product_approved_created_idx
  on public.reviews(product_id, is_approved, created_at desc);
create index if not exists reviews_auth_user_id_idx
  on public.reviews(auth_user_id, created_at desc);

drop policy if exists "Authenticated users create reviews" on public.reviews;
create policy "Authenticated users create reviews"
on public.reviews for insert to authenticated
with check (auth_user_id = auth.uid() and is_approved = false);

drop policy if exists "Customers read own pending reviews" on public.reviews;
create policy "Customers read own pending reviews"
on public.reviews for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Customers update own pending reviews" on public.reviews;
create policy "Customers update own pending reviews"
on public.reviews for update to authenticated
using (auth_user_id = auth.uid() and is_approved = false)
with check (auth_user_id = auth.uid() and is_approved = false);

alter table public.cart_items
  add column if not exists variant_size text,
  add column if not exists unit_price numeric(12, 2);

alter table public.order_items
  add column if not exists variant_label text;

alter table public.cart_items
  drop constraint if exists cart_items_cart_id_product_id_key;

create unique index if not exists cart_items_cart_product_variant_idx
  on public.cart_items(cart_id, product_id, coalesce(variant_size, ''));

create or replace function public.save_customer_cart(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  active_cart_id uuid;
  inserted_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart items must be a JSON array.';
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
  from jsonb_array_elements(p_items) as item(value)
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
  if inserted_count <> jsonb_array_length(p_items) then
    raise exception 'One or more products or variants are unavailable. Refresh the catalog and try again.';
  end if;

  return active_cart_id;
end;
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
  calculated_shipping numeric(12, 2);
  free_shipping_threshold numeric(12, 2) := 999;
  standard_shipping_amount numeric(12, 2) := 90;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;

  select * into current_customer from public.customers where auth_user_id = current_user_id;
  if not found then raise exception 'Customer profile was not found.'; end if;

  select * into selected_address from public.delivery_addresses
  where id = p_address_id and auth_user_id = current_user_id;
  if not found then raise exception 'Delivery address was not found.'; end if;

  if selected_address.recipient_name !~ '.{2,}'
    or selected_address.phone !~ '^[0-9+() -]{7,20}$'
    or selected_address.postal_code !~ '^[0-9]{6}$'
    or length(trim(selected_address.address_line_1)) < 5
    or length(trim(selected_address.city)) < 2
    or length(trim(selected_address.state)) < 2 then
    raise exception 'The delivery address is incomplete or invalid.';
  end if;

  select carts.id into active_cart_id
  from public.carts
  where auth_user_id = current_user_id and status = 'active'
  for update;
  if active_cart_id is null then raise exception 'Your cart is empty.'; end if;

  perform products.id
  from public.products
  join public.cart_items on cart_items.product_id = products.id
  where cart_items.cart_id = active_cart_id
  order by products.id for update;

  if exists (
    select 1
    from public.cart_items
    join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = active_cart_id
      and (
        not products.is_active
        or (
          cart_items.variant_size is null
          and products.stock_quantity < cart_items.quantity
        )
        or (
          cart_items.variant_size is not null
          and coalesce((
            select (variant.value ->> 'stock')::integer
            from jsonb_array_elements(products.variants) as variant(value)
            where variant.value ->> 'size' = cart_items.variant_size
            limit 1
          ), -1) < cart_items.quantity
        )
      )
  ) then
    raise exception 'One or more products are unavailable in the requested quantity.';
  end if;

  select sum(cart_items.unit_price * cart_items.quantity)
  into calculated_subtotal
  from public.cart_items
  where cart_items.cart_id = active_cart_id;
  if calculated_subtotal is null then raise exception 'Your cart is empty.'; end if;

  select settings.free_shipping_threshold, settings.standard_shipping_amount
  into free_shipping_threshold, standard_shipping_amount
  from public.delivery_settings as settings
  order by settings.updated_at desc limit 1;

  calculated_shipping := case when calculated_subtotal >= free_shipping_threshold then 0 else standard_shipping_amount end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (
    order_number, customer_id, customer_email, shipping_address, status,
    payment_status, payment_method, subtotal, shipping_amount, total
  ) values (
    created_order_number,
    current_customer.id,
    current_customer.email,
    jsonb_build_object(
      'recipient_name', selected_address.recipient_name,
      'phone', selected_address.phone,
      'address_line_1', selected_address.address_line_1,
      'address_line_2', selected_address.address_line_2,
      'city', selected_address.city,
      'state', selected_address.state,
      'postal_code', selected_address.postal_code,
      'country', selected_address.country
    ),
    'pending', 'pending', 'cod', calculated_subtotal, calculated_shipping,
    calculated_subtotal + calculated_shipping
  ) returning id into created_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, variant_label, unit_price, quantity, line_total
  )
  select
    created_order_id,
    products.id,
    products.name,
    cart_items.variant_size,
    cart_items.unit_price,
    cart_items.quantity,
    cart_items.unit_price * cart_items.quantity
  from public.cart_items
  join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = active_cart_id;

  update public.products
  set stock_quantity = products.stock_quantity - quantities.quantity
  from (
    select product_id, sum(quantity)::integer as quantity
    from public.cart_items
    where cart_id = active_cart_id and variant_size is null
    group by product_id
  ) as quantities
  where products.id = quantities.product_id;

  update public.products as product
  set variants = (
    select jsonb_agg(
      case
        when coalesce((
          select sum(cart_items.quantity)::integer
          from public.cart_items
          where cart_items.cart_id = active_cart_id
            and cart_items.product_id = product.id
            and cart_items.variant_size = variant.value ->> 'size'
        ), 0) > 0
        then jsonb_set(
          variant.value,
          '{stock}',
          to_jsonb(greatest(
            0,
            coalesce((variant.value ->> 'stock')::integer, 0) - coalesce((
              select sum(cart_items.quantity)::integer
              from public.cart_items
              where cart_items.cart_id = active_cart_id
                and cart_items.product_id = product.id
                and cart_items.variant_size = variant.value ->> 'size'
            ), 0)
          ))
        )
        else variant.value
      end
    )
    from jsonb_array_elements(product.variants) as variant(value)
  )
  where exists (
    select 1 from public.cart_items
    where cart_items.cart_id = active_cart_id
      and cart_items.product_id = product.id
      and cart_items.variant_size is not null
  );

  update public.products as product
  set stock_quantity = coalesce((
    select sum((variant.value ->> 'stock')::integer)::integer
    from jsonb_array_elements(product.variants) as variant(value)
  ), 0)
  where exists (
    select 1 from public.cart_items
    where cart_items.cart_id = active_cart_id
      and cart_items.product_id = product.id
      and cart_items.variant_size is not null
  );

  update public.carts set status = 'converted', updated_at = now() where id = active_cart_id;
  return created_order_number;
end;
$$;

revoke all on function public.save_customer_cart(jsonb) from public;
revoke all on function public.place_customer_order(uuid) from public;
grant execute on function public.save_customer_cart(jsonb) to authenticated;
grant execute on function public.place_customer_order(uuid) to authenticated;
