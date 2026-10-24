-- Moves the default storefront content (seeded by 011) from placeholder copy to the Al Qirat landing page.
update public.hero_slides
set title = 'Fragrances That Define You',
    subtitle = 'A curated collection of premium perfumes and traditional attars for every occasion.',
    desktop_image_url = '/images/home/hero.jpg',
    mobile_image_url = '/images/home/hero-mobile.jpg',
    cta_label = 'Explore Collection',
    cta_href = '/shop'
where id = '50000000-0000-4000-8000-000000000001';

update public.announcements
set message = 'Imported Luxury • Long Lasting Fragrances'
where id = '60000000-0000-4000-8000-000000000003';
