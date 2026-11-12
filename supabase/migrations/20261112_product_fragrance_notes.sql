alter table public.products
  add column if not exists fragrance_notes jsonb not null
  default '{"top": [], "heart": [], "base": []}'::jsonb;

do $$
begin
  alter table public.products
    add constraint products_fragrance_notes_shape_check
    check (
      jsonb_typeof(fragrance_notes) = 'object'
      and jsonb_typeof(fragrance_notes -> 'top') = 'array'
      and jsonb_typeof(fragrance_notes -> 'heart') = 'array'
      and jsonb_typeof(fragrance_notes -> 'base') = 'array'
    );
exception
  when duplicate_object then null;
end $$;

update public.products as product
set fragrance_notes = case product.slug
  when 'black-tobacco' then jsonb_build_object('top', array['Saffron', 'Cinnamon', 'Incense', 'Nutmeg', 'White Peach', 'White Pear', 'Green Apple', 'Agarwood (Oud)'], 'heart', array['Patchouli Leaves', 'Jasmine'], 'base', array['Precious Tobacco', 'Madagascar Vanilla', 'Amber', 'Sandalwood', 'Guaiac Wood', 'White Musk', 'Haitian Vetiver'])
  when 'oud-legacy' then jsonb_build_object('top', array['Passionfruit', 'Fruity Notes', 'Saffron', 'Turkish Rose'], 'heart', array['Agarwood (Oud)', 'Laos Benzoin', 'Indonesian Patchouli'], 'base', array['Leather', 'Akigalawood', 'Amber', 'Labdanum', 'Cistus Absolute', 'Vanilla'])
  when 'honey-oud' then jsonb_build_object('top', array['Honey', 'Saffron', 'Bergamot'], 'heart', array['Rose', 'Amber', 'Oud'], 'base', array['Vanilla', 'Musk', 'Sandalwood'])
  when 'golden-citrus' then jsonb_build_object('top', array['Pineapple', 'Lemon', 'Fruity Notes'], 'heart', array['Citrus Blossom', 'Green Notes', 'Tropical Fruits'], 'base', array['Sandalwood', 'Amber', 'Musk'])
  when 'red-velocity' then jsonb_build_object('top', array['Bergamot', 'Orange', 'Lemon Verbena', 'Mint', 'Green Accords', 'Citrus Accords'], 'heart', array['Jasmine', 'Geranium', 'Nutmeg', 'Orris'], 'base', array['Cedarwood', 'Sandalwood', 'Moss', 'Vanilla', 'Musk'])
  when 'cambodia-copper' then jsonb_build_object('top', array['Saffron', 'Pink Pepper', 'Bergamot'], 'heart', array['Coppery Amber Accord', 'Spices', 'Soft Woods'], 'base', array['Oud', 'Cedarwood', 'Musk', 'Warm Amber'])
  when 'domingo-africa' then jsonb_build_object('top', array['Black Pepper', 'Bergamot'], 'heart', array['Saffron', 'Black Rose', 'Jasmine'], 'base', array['Agarwood (Oud)', 'Leather', 'Tobacco Leaf'])
  when 'roses-and-oud' then jsonb_build_object('top', array['Fresh Rose'], 'heart', array['Oud', 'Saffron', 'Spices'], 'base', array['Amber', 'Oud', 'Smoky Accords'])
  when 'or-qirat-valley' then jsonb_build_object('top', array['Bergamot', 'Green Notes', 'Citrus', 'Floral Notes'], 'heart', array['Jasmine', 'Herbal Notes', 'Woody Accord'], 'base', array['Musk', 'Vanilla', 'Amber', 'Woody Notes'])
  when 'arabi-oud-woody' then jsonb_build_object('top', array['Oud', 'Saffron', 'Spices'], 'heart', array['Oud Wood', 'Rose', 'Jasmine'], 'base', array['Amber', 'Woody Notes', 'Musk'])
  when 'moon-paris' then jsonb_build_object('top', array['Strawberry', 'Raspberry', 'Bergamot'], 'heart', array['Peony', 'Datura', 'Jasmine'], 'base', array['White Musk', 'Amber', 'Patchouli'])
  when 'woody-leather' then jsonb_build_object('top', array['Cardamom'], 'heart', array['Black Leather', 'Jasmine Sambac', 'Violet Leaf'], 'base', array['Amber', 'Patchouli', 'Moss'])
  when 'signature-waha' then jsonb_build_object('top', array['Bergamot', 'Yuzu', 'Juniper', 'Ginger'], 'heart', array['Cucumber', 'Sea Salt Accord', 'Sage', 'Iris'], 'base', array['Vanilla', 'Tonka Bean', 'Musk', 'Ambrofix', 'Akigalawood'])
  when 'arabi-tonka' then jsonb_build_object('top', array['Saffron', 'Bergamot', 'Orange'], 'heart', array['Oud', 'Bulgarian Rose', 'Sugar Cane'], 'base', array['Tonka Bean', 'Amber', 'Vanilla', 'White Musk'])
  when 'street-woman' then jsonb_build_object('top', array['Orange Blossom', 'Raspberry'], 'heart', array['Tuberose', 'Jasmine Sambac'], 'base', array['Creamy Milky Accord'])
  when 'gold-digger' then jsonb_build_object('top', array['Pear', 'Lavender', 'Mint', 'Bergamot'], 'heart', array['Cinnamon', 'Clary Sage'], 'base', array['Vanilla', 'Amber', 'Cedarwood', 'Patchouli'])
  when 'coastal-london' then jsonb_build_object('top', array['Lime', 'Mint', 'Woody Notes', 'Bubble Gummy'], 'heart', array['Coconut Water', 'Bubble Gummy'], 'base', array['Tonka Bean', 'Warm Vanilla', 'Almond', 'Woody Notes'])
  when 'qayron-italian' then jsonb_build_object('top', array['Citron', 'Calabrian Bergamot', 'Sicilian Orange'], 'heart', array['Tunisian Neroli', 'Nigerian Ginger', 'Ceylon Cinnamon'], 'base', array['Chinese Black Tea', 'Ambroxan', 'Guaiac Wood', 'Olibanum (Frankincense)'])
  when 'african-leather' then jsonb_build_object('top', array['Guatemalan Cardamom', 'Egyptian Geranium Absolute', 'Pink Pepper CO2 Extract', 'Bergamot', 'Saffron'], 'heart', array['Indonesian Patchouli', 'Rose Essence', 'Cinnamon Essence', 'Cumin Accord'], 'base', array['Leather', 'Agarwood (Oud)', 'Amber', 'Vetiver', 'Musk'])
  when 'sweet-wind' then jsonb_build_object('top', array['Lemon', 'Bergamot', 'Melon', 'Fresh Spices', 'Rose', 'Baie Rose', 'Pink Pepper'], 'heart', array['Aquatic Notes', 'Marine Notes', 'Spicy Accords', 'Woody Tones', 'Apple', 'Geranium', 'Jasmine', 'Lily-of-the-Valley'], 'base', array['Cedarwood', 'Amber', 'Musk'])
  when 'arabi-absolute-woman' then jsonb_build_object('top', array['Blackberry', 'Pink Pepper', 'Bergamot'], 'heart', array['Cypress', 'Bulgarian Rose', 'Woody Notes', 'Vetiver'], 'base', array['Indian Patchouli', 'Amber'])
  when 'tobacco-oud' then jsonb_build_object('top', array['Tobacco Leaf', 'Spicy Notes', 'Saffron'], 'heart', array['Oud', 'Leather', 'Jasmine'], 'base', array['Amber', 'Woody Notes', 'Patchouli', 'Vanilla'])
  when 'wild-kobra' then jsonb_build_object('top', array['Bergamot', 'Ginger', 'Green Tea'], 'heart', array['Neroli', 'Cinnamon'], 'base', array['Amber', 'Musk', 'Woody Notes'])
  when 'blush-women' then jsonb_build_object('top', array['Bergamot', 'Bitter Almond'], 'heart', array['Peony', 'Ylang-Ylang'], 'base', array['Vanilla', 'Coumarin'])
  when 'majestic-musk' then jsonb_build_object('top', array['Milk Accord', 'Bergamot', 'Freesia'], 'heart', array['Jasmine', 'White Floral Notes', 'Coconut'], 'base', array['Musk', 'Vanilla', 'Sandalwood'])
  when 'mafia-oud' then jsonb_build_object('top', array['Saffron', 'Bergamot'], 'heart', array['Rose', 'Agarwood (Oud)', 'Spices', 'Patchouli'], 'base', array['Smoky Accords'])
  when 'mr-md' then jsonb_build_object('top', array['Cinnamon', 'Nutmeg', 'Bergamot'], 'heart', array['Dates', 'Praline', 'Tuberose', 'Mahonial'], 'base', array['Vanilla', 'Tonka Bean', 'Amber', 'Myrrh', 'Agarwood (Oud)'])
  when 'aqua-breez' then jsonb_build_object('top', array['Grapefruit'], 'heart', array['Aquatic Notes'], 'base', array['Woody Amber'])
  when 'dark-afghano' then jsonb_build_object('top', array['Cannabis', 'Green Notes', 'Davana', 'Saffron', 'Thyme'], 'heart', array['Resins', 'Woody Notes', 'Tobacco', 'Coffee', 'Raspberry', 'Cinnamon', 'Violet'], 'base', array['Oud', 'Incense', 'Amber', 'Animalic Notes', 'Guaiac Wood', 'Musk', 'Cedar', 'Tonka Bean', 'Gurjan Balsam', 'Ambroxan', 'Vanilla'])
  when 'pacific-chill' then jsonb_build_object('top', array['Orange', 'Citron', 'Lemon', 'Mint', 'Black Currant', 'Coriander'], 'heart', array['Apricot', 'Basil', 'May Rose', 'Carrot Seeds'], 'base', array['Fig', 'Ambrette', 'Dates'])
  when 'qirat-wave' then jsonb_build_object('top', array['Orange', 'Grapefruit'], 'heart', array['Pepper', 'Pelargonium', 'Flint'], 'base', array['Patchouli', 'Cedar', 'Vetiver', 'Benzoin'])
  when 'stronger-with-you' then jsonb_build_object('top', array['Cardamom', 'Pink Pepper', 'Mint', 'Violet Leaf', 'Crystallized Chestnut', 'Sugar'], 'heart', array['Sage', 'Lavender'], 'base', array['Vanilla', 'Chestnut', 'Cedar', 'Amberwood', 'Smoky Woods'])
  when 'royal-oud' then jsonb_build_object('top', array['Pink Pepper', 'Lemon', 'Sicilian Bergamot', 'Lime'], 'heart', array['Cedarwood', 'Angelica Root', 'Galbanum', 'Cardamom', 'Clove'], 'base', array['Sandalwood', 'Agarwood (Oud)', 'Musk', 'Frankincense', 'Ambergris', 'Guaiac Wood'])
  when 'qirat-aventus-premium' then jsonb_build_object('top', array['Calabrian Bergamot', 'Sicilian Lemon', 'Blackcurrant Leaf', 'Apple', 'Royal Pineapple'], 'heart', array['Pink Pepper', 'Jasmine', 'Patchouli'], 'base', array['Birch', 'Musk', 'Oakmoss', 'Ambergris', 'Vanilla'])
  when 'qirat-purple-oud' then jsonb_build_object('top', array['Sweet Orange'], 'heart', array['Pink Peppercorn', 'Saffron'], 'base', array['Agarwood (Oud)'])
  when 'signature-qahwa' then jsonb_build_object('top', array['Cinnamon', 'Cardamom', 'Ginger'], 'heart', array['Praline', 'Candied Fruits', 'White Flowers'], 'base', array['Arabica Coffee', 'Vanilla', 'Tonka Bean', 'Benzoin', 'Musk'])
  else product.fragrance_notes
end
where product.slug in (
  'black-tobacco', 'oud-legacy', 'honey-oud', 'golden-citrus', 'red-velocity', 'cambodia-copper',
  'domingo-africa', 'roses-and-oud', 'or-qirat-valley', 'arabi-oud-woody', 'moon-paris', 'woody-leather',
  'signature-waha', 'arabi-tonka', 'street-woman', 'gold-digger', 'coastal-london', 'qayron-italian',
  'african-leather', 'sweet-wind', 'arabi-absolute-woman', 'tobacco-oud', 'wild-kobra', 'blush-women',
  'majestic-musk', 'mafia-oud', 'mr-md', 'aqua-breez', 'dark-afghano', 'pacific-chill', 'qirat-wave',
  'stronger-with-you', 'royal-oud', 'qirat-aventus-premium', 'qirat-purple-oud', 'signature-qahwa'
);

comment on column public.products.fragrance_notes is
  'Structured fragrance composition with top, heart, and base note arrays.';

notify pgrst, 'reload schema';
