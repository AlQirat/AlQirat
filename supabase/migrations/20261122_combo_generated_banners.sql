-- Set the generated 16:9 desktop and 9:16 mobile luxury combo banners on the combo offer and hero slide.

update public.combo_offers
set banner_image_url = '/combo-banner-desktop.jpg',
    mobile_banner_image_url = '/combo-banner-mobile.jpg',
    updated_at = now()
where slug = 'choose-any-3'
  and (banner_image_url is null or banner_image_url = '/COMBO.png' or banner_image_url = '');

update public.hero_slides
set desktop_image_url = '/combo-banner-desktop.jpg',
    mobile_image_url = '/combo-banner-mobile.jpg',
    updated_at = now()
where (desktop_image_url = '/COMBO.png' or cta_href in ('/combo', '/combos'));
