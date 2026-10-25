-- Converts an accepted custom perfume quotation into a normal COD order.
-- Requests remain enquiries until the customer explicitly accepts a quotation.

alter table public.orders
  add column if not exists custom_perfume_request_id uuid;

do $$
begin
  alter table public.orders
    add constraint orders_custom_perfume_request_id_fkey
    foreign key (custom_perfume_request_id)
    references public.custom_perfume_requests(id)
    on delete set null;
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists orders_custom_perfume_request_idx
  on public.orders(custom_perfume_request_id)
  where custom_perfume_request_id is not null;

comment on column public.orders.custom_perfume_request_id is
  'The accepted custom perfume quotation that created this order, when applicable.';

create or replace function public.accept_custom_perfume_quote(p_request_id uuid, p_address_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  scent_request public.custom_perfume_requests%rowtype;
  customer_profile public.customers%rowtype;
  delivery_address public.delivery_addresses%rowtype;
  existing_order public.orders%rowtype;
  created_order_id uuid;
  created_order_number text;
  calculated_shipping numeric(12, 2) := 90;
  free_shipping_threshold numeric(12, 2) := 999;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select * into scent_request
  from public.custom_perfume_requests
  where id = p_request_id and auth_user_id = current_user_id
  for update;

  if not found then
    raise exception 'Custom perfume request was not found.';
  end if;

  select * into existing_order
  from public.orders
  where custom_perfume_request_id = p_request_id
  for update;

  if found then
    return existing_order.order_number;
  end if;

  if scent_request.status <> 'quoted'
    or scent_request.quotation_amount is null
    or length(trim(scent_request.quotation_details)) = 0 then
    raise exception 'This request does not have an active quotation.';
  end if;

  select * into delivery_address
  from public.delivery_addresses
  where id = p_address_id and auth_user_id = current_user_id
  for update;

  if not found then
    raise exception 'Delivery address was not found.';
  end if;

  if length(trim(delivery_address.recipient_name)) < 2
    or delivery_address.phone !~ '^[0-9+() -]{7,20}$'
    or length(trim(delivery_address.address_line_1)) < 5
    or length(trim(delivery_address.city)) < 2
    or length(trim(delivery_address.state)) < 2
    or delivery_address.postal_code !~ '^[0-9]{6}$' then
    raise exception 'The delivery address is incomplete or invalid.';
  end if;

  select * into customer_profile
  from public.customers
  where auth_user_id = current_user_id
  for update;

  if not found then
    insert into public.customers (auth_user_id, full_name, email, phone)
    values (current_user_id, scent_request.contact_name, scent_request.contact_email, delivery_address.phone)
    returning * into customer_profile;
  else
    update public.customers
    set full_name = delivery_address.recipient_name,
        phone = delivery_address.phone,
        updated_at = now()
    where id = customer_profile.id;
  end if;

  select settings.free_shipping_threshold, settings.standard_shipping_amount
  into free_shipping_threshold, calculated_shipping
  from public.delivery_settings as settings
  order by settings.updated_at desc
  limit 1;

  if not found then
    free_shipping_threshold := 999;
    calculated_shipping := 90;
  end if;

  calculated_shipping := case
    when scent_request.quotation_amount >= free_shipping_threshold then 0
    else calculated_shipping
  end;

  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (
    order_number, customer_id, customer_email, shipping_address,
    custom_perfume_request_id, status, payment_status, payment_method,
    subtotal, shipping_amount, total
  ) values (
    created_order_number,
    customer_profile.id,
    scent_request.contact_email,
    jsonb_build_object(
      'recipient_name', delivery_address.recipient_name,
      'phone', delivery_address.phone,
      'address_line_1', delivery_address.address_line_1,
      'address_line_2', delivery_address.address_line_2,
      'city', delivery_address.city,
      'state', delivery_address.state,
      'postal_code', delivery_address.postal_code,
      'country', delivery_address.country
    ),
    p_request_id,
    'pending', 'pending', 'cod',
    scent_request.quotation_amount,
    calculated_shipping,
    scent_request.quotation_amount + calculated_shipping
  ) returning id into created_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, variant_label, unit_price, quantity, line_total
  ) values (
    created_order_id,
    null,
    'Custom perfume — ' || scent_request.reference_name,
    'Similar fragrance profile · ' || scent_request.bottle_size || ' ml',
    scent_request.quotation_amount,
    1,
    scent_request.quotation_amount
  );

  update public.custom_perfume_requests
  set status = 'in_progress', version = version + 1, updated_at = now()
  where id = p_request_id;

  return created_order_number;
end;
$$;

revoke all on function public.accept_custom_perfume_quote(uuid, uuid) from public, anon;
grant execute on function public.accept_custom_perfume_quote(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
