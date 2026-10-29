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
  '50000000-0000-4000-8000-000000000002',
  'The Perfect Fragrance Combo',
  'Explore curated perfume combinations crafted to make every moment unforgettable.',
  '/COMBO.png',
  '/COMBO.png',
  'Shop Combos',
  '/shop',
  1,
  true
)
on conflict (id) do nothing;
