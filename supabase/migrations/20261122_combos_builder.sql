-- Combo / Gift Set Builder enhancements:
-- 1. Allow combo-exclusive products (show_in_shop = false) without requiring a shop category.
-- 2. Add variant_label (e.g. '6ml', '50ml') and shop menu showcase fields for the /combos builder.

alter table public.products
  alter column category_id drop not null;

alter table public.products
  add column if not exists show_in_shop boolean not null default true;

alter table public.products
  add column if not exists variant_label text;

create index if not exists products_show_in_shop_idx
  on public.products(show_in_shop, is_active);

alter table public.combo_offers
  add column if not exists showcase_badge text not null default 'Combo Set',
  add column if not exists showcase_heading text not null default 'Build Your Own Combo',
  add column if not exists showcase_description text not null default 'Pick any bottles of your choice at a special combo price.';

alter table public.combo_offers
  alter column cta_href set default '/combos';

alter table public.combo_offer_products
  add column if not exists variant_label text;

update public.combo_offers
set cta_href = '/combos',
    updated_at = now()
where slug = 'choose-any-3'
  and cta_href = '/combo';

update public.hero_slides
set cta_href = '/combos',
    updated_at = now()
where cta_href = '/combo';

notify pgrst, 'reload schema';
