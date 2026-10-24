create table if not exists public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Default',
  recipient_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  country text not null default 'India',
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, label)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_customer_idx
on public.carts(auth_user_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index if not exists delivery_addresses_auth_user_id_idx on public.delivery_addresses(auth_user_id);
create index if not exists carts_auth_user_id_idx on public.carts(auth_user_id);
create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);

drop trigger if exists delivery_addresses_set_updated_at on public.delivery_addresses;
create trigger delivery_addresses_set_updated_at before update on public.delivery_addresses
for each row execute function public.set_updated_at();
drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();
drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (auth_user_id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_customer on auth.users;
create trigger on_auth_user_created_create_customer
after insert on auth.users
for each row execute function public.handle_new_customer();

insert into public.customers (auth_user_id, full_name, email)
select
  users.id,
  coalesce(nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''), split_part(users.email, '@', 1)),
  users.email
from auth.users as users
where users.email is not null
on conflict (auth_user_id) do nothing;

alter table public.delivery_addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "Customers create own profile" on public.customers;
create policy "Customers create own profile" on public.customers for insert to authenticated
with check (auth_user_id = auth.uid());
drop policy if exists "Customers update own profile" on public.customers;
create policy "Customers update own profile" on public.customers for update to authenticated
using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists "Customers manage own addresses" on public.delivery_addresses;
create policy "Customers manage own addresses" on public.delivery_addresses for all to authenticated
using (auth_user_id = auth.uid() or public.is_admin())
with check (auth_user_id = auth.uid() or public.is_admin());

drop policy if exists "Customers manage own carts" on public.carts;
create policy "Customers manage own carts" on public.carts for all to authenticated
using (auth_user_id = auth.uid() or public.is_admin())
with check (auth_user_id = auth.uid() or public.is_admin());

drop policy if exists "Customers manage own cart items" on public.cart_items;
create policy "Customers manage own cart items" on public.cart_items for all to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id and carts.auth_user_id = auth.uid()
  )
)
with check (
  public.is_admin() or exists (
    select 1 from public.carts
    where carts.id = cart_items.cart_id and carts.auth_user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.delivery_addresses, public.carts, public.cart_items to authenticated;

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

  insert into public.cart_items (cart_id, product_id, quantity)
  select
    active_cart_id,
    products.id,
    least(25, greatest(1, (item.value ->> 'quantity')::integer))
  from jsonb_array_elements(p_items) as item(value)
  join public.products on products.slug = item.value ->> 'slug'
  where products.is_active;

  get diagnostics inserted_count = row_count;
  if inserted_count <> jsonb_array_length(p_items) then
    raise exception 'One or more products are unavailable. Refresh the catalog and try again.';
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
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select * into current_customer from public.customers where auth_user_id = current_user_id;
  if not found then raise exception 'Customer profile was not found.'; end if;

  select * into selected_address from public.delivery_addresses
  where id = p_address_id and auth_user_id = current_user_id;
  if not found then raise exception 'Delivery address was not found.'; end if;

  select carts.id into active_cart_id from public.carts
  where auth_user_id = current_user_id and status = 'active'
  for update;
  if active_cart_id is null then raise exception 'Your cart is empty.'; end if;

  select sum(products.price * cart_items.quantity)
  into calculated_subtotal
  from public.cart_items
  join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = active_cart_id and products.is_active;
  if calculated_subtotal is null then raise exception 'Your cart is empty.'; end if;

  calculated_shipping := case when calculated_subtotal >= 999 then 0 else 90 end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (
    order_number, customer_id, customer_email, shipping_address, payment_method,
    subtotal, shipping_amount, total
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
    'cod', calculated_subtotal, calculated_shipping, calculated_subtotal + calculated_shipping
  ) returning id into created_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  select created_order_id, products.id, products.name, products.price, cart_items.quantity, products.price * cart_items.quantity
  from public.cart_items
  join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = active_cart_id and products.is_active;

  update public.carts set status = 'converted', updated_at = now() where id = active_cart_id;
  return created_order_number;
end;
$$;

revoke all on function public.save_customer_cart(jsonb) from public;
revoke all on function public.place_customer_order(uuid) from public;
grant execute on function public.save_customer_cart(jsonb) to authenticated;
grant execute on function public.place_customer_order(uuid) to authenticated;
