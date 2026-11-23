-- Special Edition and Gift Set collections.
-- Each collection has its own categories and products, managed from its own admin tab and shown on its own
-- storefront page (/special-editions, /gift-sets). Rows with collection IS NULL are the regular shop catalog,
-- so existing categories and products are unaffected and collection items never appear in /shop.

alter table public.categories
  add column if not exists collection text
  check (collection is null or collection in ('special-edition', 'gift-set'));

alter table public.products
  add column if not exists collection text
  check (collection is null or collection in ('special-edition', 'gift-set'));

create index if not exists categories_collection_idx on public.categories(collection);
create index if not exists products_collection_idx on public.products(collection, is_active);

-- Third hero slide: Special Edition. Replace the image, text and link anytime under Admin > Hero Slides.
insert into public.hero_slides (
  id,
  title,
  subtitle,
  desktop_image_url,
  mobile_image_url,
  cta_label,
  cta_href,
  sort_order,
  is_active
)
values (
  '50000000-0000-4000-8000-000000000003',
  'Special Edition',
  'Exclusive, limited-run fragrances crafted for true connoisseurs.',
  '/images/home/category-special-editions.jpg',
  '/images/home/category-special-editions.jpg',
  'Shop Special Edition',
  '/special-editions',
  2,
  true
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
