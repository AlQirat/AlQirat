-- Allow administrators to turn Cash on Delivery on or off from Delivery Settings.

alter table public.delivery_settings
  add column if not exists cod_enabled boolean not null default true;

create or replace function public.enforce_cod_enabled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cod_available boolean := true;
begin
  if new.payment_method = 'cod' then
    select settings.cod_enabled
    into cod_available
    from public.delivery_settings as settings
    order by settings.updated_at desc
    limit 1;

    if not found or not coalesce(cod_available, true) then
      raise exception 'Cash on delivery is currently unavailable.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_cod_enabled on public.orders;
create trigger orders_enforce_cod_enabled
before insert on public.orders
for each row execute function public.enforce_cod_enabled();

notify pgrst, 'reload schema';
