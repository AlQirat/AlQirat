insert into public.delivery_settings (id, free_shipping_threshold, standard_shipping_amount, currency_code, delivery_message)
values ('40000000-0000-4000-8000-000000000001', 999, 90, 'INR', 'Fast & Secure Delivery')
on conflict (id) do nothing;

insert into public.hero_slides (id, title, subtitle, desktop_image_url, mobile_image_url, cta_label, cta_href, sort_order, is_active)
values ('50000000-0000-4000-8000-000000000001', 'Fragrance of Luxury', 'Discover premium perfumes and attars from Al Qirat Perfumes — the hallmark of refined taste.', '/images/hero1.png', '/images/heromobile.png', 'Shop Collection', '/shop', 0, true)
on conflict (id) do nothing;

insert into public.announcements (id, message, sort_order, is_active)
values
  ('60000000-0000-4000-8000-000000000001', 'Free Shipping on orders above ₹999', 0, true),
  ('60000000-0000-4000-8000-000000000002', '100% Authentic Premium Perfumes', 1, true),
  ('60000000-0000-4000-8000-000000000003', 'Alcohol Free • Long Lasting Fragrances', 2, true)
on conflict (id) do nothing;

insert into public.faqs (id, question, answer, sort_order, is_active)
values
  ('70000000-0000-4000-8000-000000000001', 'Are Al Qirat Perfumes products authentic?', 'Yes. Every fragrance is sourced from trusted suppliers and checked before dispatch.', 0, true),
  ('70000000-0000-4000-8000-000000000002', 'How long does delivery take?', 'Delivery times depend on the destination. Your order status is updated by our team as it moves through fulfilment.', 1, true)
on conflict (id) do nothing;

create or replace function public.refresh_product_review_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set
    rating = coalesce((select round(avg(reviews.rating)::numeric, 1) from public.reviews where reviews.product_id = affected_product_id and reviews.is_approved), 0),
    review_count = (select count(*) from public.reviews where reviews.product_id = affected_product_id and reviews.is_approved)
  where id = affected_product_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_product_summary on public.reviews;
create trigger reviews_refresh_product_summary
after insert or update or delete on public.reviews
for each row execute function public.refresh_product_review_summary();

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
  select * into selected_address from public.delivery_addresses where id = p_address_id and auth_user_id = current_user_id;
  if not found then raise exception 'Delivery address was not found.'; end if;
  select carts.id into active_cart_id from public.carts where auth_user_id = current_user_id and status = 'active' for update;
  if active_cart_id is null then raise exception 'Your cart is empty.'; end if;

  perform products.id from public.products
  join public.cart_items on cart_items.product_id = products.id
  where cart_items.cart_id = active_cart_id
  order by products.id for update;

  if exists (
    select 1 from public.cart_items
    join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = active_cart_id and (not products.is_active or products.stock_quantity < cart_items.quantity)
  ) then raise exception 'One or more products are unavailable in the requested quantity.'; end if;

  select sum(products.price * cart_items.quantity) into calculated_subtotal
  from public.cart_items join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = active_cart_id;
  if calculated_subtotal is null then raise exception 'Your cart is empty.'; end if;

  select settings.free_shipping_threshold, settings.standard_shipping_amount
  into free_shipping_threshold, standard_shipping_amount
  from public.delivery_settings as settings order by settings.updated_at desc limit 1;
  calculated_shipping := case when calculated_subtotal >= free_shipping_threshold then 0 else standard_shipping_amount end;
  created_order_number := 'ALQ-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  insert into public.orders (order_number, customer_id, customer_email, shipping_address, payment_method, subtotal, shipping_amount, total)
  values (created_order_number, current_customer.id, current_customer.email, jsonb_build_object('recipient_name', selected_address.recipient_name, 'phone', selected_address.phone, 'address_line_1', selected_address.address_line_1, 'address_line_2', selected_address.address_line_2, 'city', selected_address.city, 'state', selected_address.state, 'postal_code', selected_address.postal_code, 'country', selected_address.country), 'cod', calculated_subtotal, calculated_shipping, calculated_subtotal + calculated_shipping)
  returning id into created_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
  select created_order_id, products.id, products.name, products.price, cart_items.quantity, products.price * cart_items.quantity
  from public.cart_items join public.products on products.id = cart_items.product_id where cart_items.cart_id = active_cart_id;

  update public.products set stock_quantity = products.stock_quantity - quantities.quantity
  from (select product_id, sum(quantity)::integer as quantity from public.cart_items where cart_id = active_cart_id group by product_id) as quantities
  where products.id = quantities.product_id;
  update public.carts set status = 'converted', updated_at = now() where id = active_cart_id;
  return created_order_number;
end;
$$;

revoke all on function public.place_customer_order(uuid) from public;
grant execute on function public.place_customer_order(uuid) to authenticated;
