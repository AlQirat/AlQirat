-- Fourth hero slide: Gift Set. Replace the image, text and link anytime under Admin > Hero Slides.
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
  '50000000-0000-4000-8000-000000000004',
  'Gift Sets',
  'Beautifully presented fragrance gift sets for every occasion.',
  '/images/home/category-gift-sets.jpg',
  '/images/home/category-gift-sets.jpg',
  'Shop Gift Sets',
  '/gift-sets',
  3,
  true
)
on conflict (id) do nothing;
