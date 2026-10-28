alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists shiprocket_order_id text,
  add column if not exists shiprocket_shipment_id text,
  add column if not exists shiprocket_awb text,
  add column if not exists shiprocket_courier_name text,
  add column if not exists shiprocket_status text,
  add column if not exists shiprocket_status_id integer,
  add column if not exists shiprocket_label_url text,
  add column if not exists shiprocket_tracking_url text,
  add column if not exists shiprocket_last_event jsonb,
  add column if not exists shiprocket_last_event_at timestamptz,
  add column if not exists fulfillment_error text,
  add column if not exists fulfillment_updated_at timestamptz;

create unique index if not exists orders_shiprocket_order_id_uidx
  on public.orders(shiprocket_order_id)
  where shiprocket_order_id is not null;

create unique index if not exists orders_shiprocket_shipment_id_uidx
  on public.orders(shiprocket_shipment_id)
  where shiprocket_shipment_id is not null;

create unique index if not exists orders_shiprocket_awb_uidx
  on public.orders(shiprocket_awb)
  where shiprocket_awb is not null;

notify pgrst, 'reload schema';
