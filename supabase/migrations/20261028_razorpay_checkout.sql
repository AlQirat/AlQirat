-- Razorpay checkout state and payment finalization.
-- Payment orders stay pending until a verified captured payment is received.

alter table public.orders
  add column if not exists cart_id uuid references public.carts(id) on delete set null,
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_failure_reason text;

create unique index if not exists orders_razorpay_order_id_uidx
  on public.orders(razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists orders_razorpay_payment_id_uidx
  on public.orders(razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists orders_one_pending_razorpay_cart_uidx
  on public.orders(cart_id)
  where cart_id is not null
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending';

create index if not exists orders_payment_status_method_idx
  on public.orders(payment_method, payment_status, created_at desc);

comment on column public.orders.razorpay_order_id is
  'Razorpay order id created by the server for this order.';
comment on column public.orders.razorpay_payment_id is
  'Razorpay payment id accepted after server-side signature and status verification.';

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
  calculated_shipping numeric(12, 2);
  free_shipping_threshold numeric(12, 2) := 999;
  standard_shipping_amount numeric(12, 2) := 90;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select * into current_customer
  from public.customers
  where auth_user_id = current_user_id
  for update;
  if not found then raise exception 'Customer profile was not found.'; end if;

  select * into selected_address
  from public.delivery_addresses
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
  where carts.auth_user_id = current_user_id and carts.status = 'active'
  for update;
  if active_cart_id is null then raise exception 'Your cart is empty.'; end if;

  select * into existing_order
  from public.orders
  where orders.cart_id = active_cart_id
    and orders.payment_method = 'razorpay'
    and orders.payment_status = 'pending'
    and orders.status = 'pending'
  for update;

  if found then
    return jsonb_build_object(
      'order_id', existing_order.id,
      'order_number', existing_order.order_number,
      'razorpay_order_id', existing_order.razorpay_order_id,
      'amount', round(existing_order.total * 100)::bigint,
      'currency', 'INR'
    );
  end if;

  perform products.id
  from public.products
  join public.cart_items on cart_items.product_id = products.id
  where cart_items.cart_id = active_cart_id
  order by products.id
  for update;

  if exists (
    select 1
    from public.cart_items
    join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = active_cart_id
      and (
        not products.is_active
        or cart_items.unit_price is null
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
  order by settings.updated_at desc
  limit 1;
  if not found then
    free_shipping_threshold := 999;
    standard_shipping_amount := 90;
  end if;

  calculated_shipping := case
    when calculated_subtotal >= free_shipping_threshold then 0
    else standard_shipping_amount
  end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (
    order_number, customer_id, customer_email, shipping_address, cart_id,
    status, payment_status, payment_method, subtotal, shipping_amount, total
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
    active_cart_id,
    'pending', 'pending', 'razorpay', calculated_subtotal,
    calculated_shipping, calculated_subtotal + calculated_shipping
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

  return jsonb_build_object(
    'order_id', created_order_id,
    'order_number', created_order_number,
    'razorpay_order_id', null,
    'amount', round((calculated_subtotal + calculated_shipping) * 100)::bigint,
    'currency', 'INR'
  );
end;
$$;

create or replace function public.set_customer_razorpay_order_id(
  p_order_id uuid,
  p_razorpay_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_order public.orders%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_razorpay_order_id is null or p_razorpay_order_id !~ '^order_[A-Za-z0-9]+$' then
    raise exception 'Invalid Razorpay order id.';
  end if;

  update public.orders
  set razorpay_order_id = p_razorpay_order_id,
      updated_at = now()
  where id = p_order_id
    and customer_id = (select customers.id from public.customers where auth_user_id = current_user_id)
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending'
    and (razorpay_order_id is null or razorpay_order_id = p_razorpay_order_id)
  returning * into saved_order;

  if not found then raise exception 'Razorpay order could not be attached to the customer order.'; end if;

  return jsonb_build_object(
    'order_id', saved_order.id,
    'order_number', saved_order.order_number,
    'razorpay_order_id', saved_order.razorpay_order_id,
    'amount', round(saved_order.total * 100)::bigint,
    'currency', 'INR'
  );
end;
$$;

create or replace function public.cancel_pending_razorpay_orders_for_customer()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;

  update public.orders
  set status = 'cancelled',
      payment_status = 'failed',
      payment_failure_reason = 'Customer chose cash on delivery.',
      updated_at = now()
  where customer_id = (select customers.id from public.customers where auth_user_id = current_user_id)
    and payment_method = 'razorpay'
    and payment_status = 'pending'
    and status = 'pending';
end;
$$;

create or replace function public.mark_razorpay_payment(
  p_razorpay_order_id text,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_order public.orders%rowtype;
begin
  if p_razorpay_order_id is null or p_payment_id is null then
    raise exception 'Razorpay order and payment ids are required.';
  end if;

  select * into payment_order
  from public.orders
  where razorpay_order_id = p_razorpay_order_id
  for update;
  if not found then raise exception 'Order not found for Razorpay payment.'; end if;
  if payment_order.payment_method <> 'razorpay' then raise exception 'Order is not a Razorpay order.'; end if;

  if payment_order.payment_status = 'paid' then
    if payment_order.razorpay_payment_id <> p_payment_id then
      raise exception 'A different payment is already recorded for this order.';
    end if;
    return jsonb_build_object('order_id', payment_order.id, 'order_number', payment_order.order_number);
  end if;

  perform products.id
  from public.products
  join public.order_items on order_items.product_id = products.id
  where order_items.order_id = payment_order.id
  order by products.id
  for update;

  if exists (
    select 1
    from public.order_items
    join public.products on products.id = order_items.product_id
    where order_items.order_id = payment_order.id
      and (
        (order_items.variant_label is null and products.stock_quantity < order_items.quantity)
        or (
          order_items.variant_label is not null
          and coalesce((
            select (variant.value ->> 'stock')::integer
            from jsonb_array_elements(products.variants) as variant(value)
            where variant.value ->> 'size' = order_items.variant_label
            limit 1
          ), -1) < order_items.quantity
        )
      )
  ) then
    raise exception 'Payment received, but one or more products are now out of stock. Contact support before fulfilment.';
  end if;

  update public.products
  set stock_quantity = products.stock_quantity - quantities.quantity
  from (
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = payment_order.id and variant_label is null
    group by product_id
  ) as quantities
  where products.id = quantities.product_id;

  update public.products as product
  set variants = (
    select jsonb_agg(
      case
        when coalesce((
          select sum(order_items.quantity)::integer
          from public.order_items
          where order_items.order_id = payment_order.id
            and order_items.product_id = product.id
            and order_items.variant_label = variant.value ->> 'size'
        ), 0) > 0
        then jsonb_set(
          variant.value,
          '{stock}',
          to_jsonb(greatest(
            0,
            coalesce((variant.value ->> 'stock')::integer, 0) - coalesce((
              select sum(order_items.quantity)::integer
              from public.order_items
              where order_items.order_id = payment_order.id
                and order_items.product_id = product.id
                and order_items.variant_label = variant.value ->> 'size'
            ), 0)
          ))
        )
        else variant.value
      end
    )
    from jsonb_array_elements(product.variants) as variant(value)
  )
  where exists (
    select 1 from public.order_items
    where order_items.order_id = payment_order.id
      and order_items.product_id = product.id
      and order_items.variant_label is not null
  );

  update public.products as product
  set stock_quantity = coalesce((
    select sum((variant.value ->> 'stock')::integer)::integer
    from jsonb_array_elements(product.variants) as variant(value)
  ), 0)
  where exists (
    select 1 from public.order_items
    where order_items.order_id = payment_order.id
      and order_items.product_id = product.id
      and order_items.variant_label is not null
  );

  update public.orders
  set payment_status = 'paid',
      status = 'confirmed',
      razorpay_payment_id = p_payment_id,
      payment_verified_at = now(),
      payment_failure_reason = null,
      updated_at = now()
  where id = payment_order.id;

  update public.carts
  set status = 'converted', updated_at = now()
  where id = payment_order.cart_id and status = 'active';

  return jsonb_build_object('order_id', payment_order.id, 'order_number', payment_order.order_number);
end;
$$;

create or replace function public.mark_razorpay_payment_failed(
  p_razorpay_order_id text,
  p_payment_id text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
  set payment_status = case when payment_status = 'paid' then payment_status else 'failed' end,
      status = case when payment_status = 'paid' then status else 'cancelled' end,
      razorpay_payment_id = case when payment_status = 'paid' then razorpay_payment_id else coalesce(razorpay_payment_id, p_payment_id) end,
      payment_failure_reason = case when payment_status = 'paid' then payment_failure_reason else left(coalesce(p_reason, 'Razorpay payment failed.'), 500) end,
      updated_at = now()
  where razorpay_order_id = p_razorpay_order_id
    and payment_status <> 'paid';
end;
$$;

revoke all on function public.prepare_customer_razorpay_order(uuid) from public;
revoke all on function public.set_customer_razorpay_order_id(uuid, text) from public;
revoke all on function public.cancel_pending_razorpay_orders_for_customer() from public;
revoke all on function public.mark_razorpay_payment(text, text) from public;
revoke all on function public.mark_razorpay_payment_failed(text, text, text) from public;
grant execute on function public.prepare_customer_razorpay_order(uuid) to authenticated;
grant execute on function public.set_customer_razorpay_order_id(uuid, text) to authenticated;
grant execute on function public.cancel_pending_razorpay_orders_for_customer() to authenticated;
grant execute on function public.mark_razorpay_payment(text, text) to service_role;
grant execute on function public.mark_razorpay_payment_failed(text, text, text) to service_role;

notify pgrst, 'reload schema';
