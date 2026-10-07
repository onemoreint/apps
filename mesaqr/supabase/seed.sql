-- =============================================================================
-- MesaQR — MENÚ INICIAL (tomado de los menús impresos del restaurante, oct. 2026)
-- Precios en USD tal como aparecen en el menú. Fotos referenciales de Unsplash (licencia libre).
-- Datos confirmados por el negocio (7 oct. 2026): nombre Lorenz Express,
-- WhatsApp 0424-323.01.13, tasa inicial 900 Bs./USD, precios de Granjeros.
-- La tasa se actualiza a diario desde el panel (/dashboard).
-- Se puede ejecutar más de una vez: si el negocio "lorenz-express" ya existe, no hace nada.
-- =============================================================================
do $$
declare
  b uuid;
  c_burger uuid; c_pepito uuid; c_ternerito uuid; c_polaco uuid; c_salchi uuid; c_shawarma uuid;
  c_club uuid; c_granjero uuid; c_ensalada uuid; c_racion uuid; c_kids uuid;
  g_prot_burger uuid; g_prot uuid; g_prot_igual uuid; g_quitar uuid;
  p uuid;
begin
  if exists (select 1 from public.businesses where slug = 'lorenz-express') then
    raise notice 'El negocio ya existe; no se cargan datos.';
    return;
  end if;

  insert into public.businesses (slug, name, description, address, whatsapp, show_bs, exchange_rate, exchange_rate_updated_at, primary_color)
  values ('lorenz-express', 'Lorenz Express', 'Comida rápida en Maracay.', 'Maracay, Aragua',
          '+584243230113', true, 900.0000, now(), '#D62828')
  returning id into b;

  -- ─── Categorías (orden del menú) ───
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Hamburguesas', '🍔', 1)  returning id into c_burger;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Pepitos', '🥖', 2)       returning id into c_pepito;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Terneritos', '🌭', 3)    returning id into c_ternerito;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Polacos', '🌭', 4)       returning id into c_polaco;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Salchipapas', '🍟', 5)   returning id into c_salchi;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Shawarmas', '🥙', 6)     returning id into c_shawarma;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Club House', '🥪', 7)    returning id into c_club;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Granjeros', '🍗', 8)     returning id into c_granjero;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Ensaladas', '🥗', 9)     returning id into c_ensalada;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Raciones', '🥔', 10)     returning id into c_racion;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Menú Kids', '🧒', 11)    returning id into c_kids;

  -- ─── Opciones ───
  -- Hamburguesas: Carne y Pollo al precio base; Crispy y Mixta +$2,50 (según la tabla del menú)
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 1) returning id into g_prot_burger;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot_burger, 'Carne', 0, 1), (g_prot_burger, 'Pollo', 0, 2),
    (g_prot_burger, 'Pollo crispy', 2.50, 3), (g_prot_burger, 'Mixta', 2.50, 4);

  -- Pepitos y Shawarma clásico: Carne o Pollo al precio base; Mixto +$2
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 2) returning id into g_prot;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot, 'Carne', 0, 1), (g_prot, 'Pollo', 0, 2), (g_prot, 'Mixto', 2.00, 3);

  -- Terneritos: Carne, Pollo o Mixto al mismo precio
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 3) returning id into g_prot_igual;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot_igual, 'Carne', 0, 1), (g_prot_igual, 'Pollo', 0, 2), (g_prot_igual, 'Mixto', 0, 3);

  -- Quitar ingredientes (sin costo)
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Quitar ingredientes', 'multiple', 0, 4, 4) returning id into g_quitar;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_quitar, 'Sin cebolla', 0, 1), (g_quitar, 'Sin tomate', 0, 2),
    (g_quitar, 'Sin lechuga', 0, 3), (g_quitar, 'Sin salsas', 0, 4);

  insert into public.category_option_groups (category_id, group_id, business_id, sort_order) values
    (c_burger, g_prot_burger, b, 1), (c_burger, g_quitar, b, 2),
    (c_pepito, g_prot, b, 1),        (c_pepito, g_quitar, b, 2),
    (c_ternerito, g_prot_igual, b, 1), (c_ternerito, g_quitar, b, 2),
    (c_polaco, g_quitar, b, 1),
    (c_shawarma, g_quitar, b, 2),
    (c_club, g_quitar, b, 1),
    (c_granjero, g_quitar, b, 1);

  -- ─── Hamburguesas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_burger, 'Hamburguesa Clásica', 'Pan Whopper, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&h=480&fit=crop&auto=format&q=70', 7.50, false, 1),
    (b, c_burger, 'Hamburguesa con Queso', 'Pan Whopper, queso, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=640&h=480&fit=crop&auto=format&q=70', 8.00, false, 2),
    (b, c_burger, 'Hamburguesa con Queso y Tocineta', 'Pan Whopper, queso, tocineta, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=640&h=480&fit=crop&auto=format&q=70', 8.50, false, 3),
    (b, c_burger, 'Hamburguesa con Queso, Tocineta y Huevo', 'Pan Whopper, queso, tocineta, huevo, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=640&h=480&fit=crop&auto=format&q=70', 9.00, true, 4);

  -- ─── Pepitos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_pepito, 'Pepito Clásico', 'Pan de 40 cm, 400 g de proteína, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 1),
    (b, c_pepito, 'Pepito con Queso', 'Pan de 40 cm, 400 g de proteína, queso, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1700937314577-898450cafe35?w=640&h=480&fit=crop&auto=format&q=70', 16.00, false, 2),
    (b, c_pepito, 'Pepito con Queso y Tocineta', 'Pan de 40 cm, 400 g de proteína, queso, tocineta, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1699728088600-6d684acbeada?w=640&h=480&fit=crop&auto=format&q=70', 17.00, false, 3),
    (b, c_pepito, 'Pepito con Queso, Tocineta y Huevo', 'Pan de 40 cm, 400 g de proteína, queso, tocineta, huevo, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1702119614788-bae35a7be313?w=640&h=480&fit=crop&auto=format&q=70', 17.00, true, 4);

  -- ─── Terneritos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_ternerito, 'Ternerito Clásico', 'Lechuga, tomate, cebolla, lluvia de queso amarillo y papitas ralladas.', 'https://images.unsplash.com/photo-1613482084286-41f25b486fa2?w=640&h=480&fit=crop&auto=format&q=70', 5.00, false, 1),
    (b, c_ternerito, 'Ternerito de la Casa', 'Lechuga, tomate, cebolla, pepinillo, lluvia de queso amarillo, tocineta, maíz y papitas ralladas.', 'https://images.unsplash.com/photo-1627054248949-21f77275a15f?w=640&h=480&fit=crop&auto=format&q=70', 7.00, true, 2);

  -- ─── Polacos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_polaco, 'Polaco Clásico', 'Salchicha polaca, lluvia de queso amarillo, ensalada rallada, cebolla, papitas ralladas y salsas.', 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=640&h=480&fit=crop&auto=format&q=70', 5.00, false, 1),
    (b, c_polaco, 'Polaco de la Casa', 'Salchicha polaca, lluvia de queso amarillo, tocineta, maíz, pepinillo, ensalada rallada, cebolla, papitas ralladas y salsas.', 'https://images.unsplash.com/photo-1678033382919-fa907632fdda?w=640&h=480&fit=crop&auto=format&q=70', 7.00, true, 2);

  -- ─── Salchipapas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_salchi, 'Salchipapa Clásica', 'Papas fritas, salchicha polaca, lluvia de queso amarillo y salsas.', 'https://images.unsplash.com/photo-1762284513031-3d7ad15562bc?w=640&h=480&fit=crop&auto=format&q=70', 8.50, false, 1),
    (b, c_salchi, 'Salchipapa de la Casa', 'Papas fritas, doble salchicha polaca, lluvia de queso amarillo, doble tocineta, cubos de pollo crispy y salsas.', 'https://images.unsplash.com/photo-1767065626950-8c7372c08811?w=640&h=480&fit=crop&auto=format&q=70', 12.00, true, 2);

  -- ─── Shawarmas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order)
  values (b, c_shawarma, 'Shawarma Clásico', '250 g de proteína, lechuga, tomate, cebolla, perejil y pimentón.', 'https://images.unsplash.com/photo-1719282431565-3b30bb7d2658?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 1)
  returning id into p;
  insert into public.product_option_groups (product_id, group_id, business_id, sort_order) values (p, g_prot, b, 1);
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_shawarma, 'Shawarma de la Casa (Falafel)', 'Falafel con lechuga, tomate, cebolla, perejil y pimentón. Con papas fritas.', 'https://images.unsplash.com/photo-1699728088614-7d1d4277414b?w=640&h=480&fit=crop&auto=format&q=70', 13.00, true, 2);

  -- ─── Club House (todos con papas fritas) ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_club, 'Club House Doble Pollo', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=640&h=480&fit=crop&auto=format&q=70', 13.00, false, 1),
    (b, c_club, 'Club House Doble Carne', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1712746784291-e29d5d2694d4?w=640&h=480&fit=crop&auto=format&q=70', 14.00, false, 2),
    (b, c_club, 'Club House Mixto', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1496113269490-84ffe1a410cb?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 3),
    (b, c_club, 'Club House Triple', 'Carne, pollo y pollo crispy con huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=640&h=480&fit=crop&auto=format&q=70', 17.00, false, 4),
    (b, c_club, 'Club House de la Casa', 'Lluvia de pollo crispy, ensalada César, huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1676300184084-de35d56a9a70?w=640&h=480&fit=crop&auto=format&q=70', 19.00, true, 5);

  -- ─── Granjeros ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_granjero, 'Granjero 15 cm', 'Pollo empanizado, tomate, lechuga y salsa tártara. Con papas fritas.', 'https://images.unsplash.com/photo-1705131186176-1c7cdb830815?w=640&h=480&fit=crop&auto=format&q=70', 7.00, false, 1),
    (b, c_granjero, 'Granjero 35 cm', 'Pollo empanizado, tomate, lechuga y salsa tártara. Con papas fritas.', 'https://images.unsplash.com/photo-1703219342329-fce8488cf443?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 2);

  -- ─── Ensaladas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_ensalada, 'Ensalada César de Pollo', 'Lechuga romana, pollo, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1782839577893-da9383e55c96?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 1),
    (b, c_ensalada, 'Ensalada César de Carne', 'Lechuga romana, carne, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 2),
    (b, c_ensalada, 'Ensalada César Mixta', 'Lechuga romana, carne y pollo, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1746211108786-ca20c8f80ecd?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 3),
    (b, c_ensalada, 'Ensalada César de Pollo Crispy', 'Lechuga romana, pollo crispy, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1746211224437-8340316b288d?w=640&h=480&fit=crop&auto=format&q=70', 13.00, true, 4);

  -- ─── Raciones (se sugieren para completar el pedido) ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, upsell, sort_order) values
    (b, c_racion, 'Papas Fritas + 2 Salsas', 'Ración de papas fritas con dos salsas.', 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=640&h=480&fit=crop&auto=format&q=70', 4.50, true, 1),
    (b, c_racion, 'Papas con Tocineta y Queso', 'Papas fritas con lluvia de tocineta y queso amarillo.', 'https://images.unsplash.com/photo-1639744210631-209fce3e256c?w=640&h=480&fit=crop&auto=format&q=70', 6.00, true, 2);

  -- ─── Menú Kids ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, sort_order) values
    (b, c_kids, 'Nuggets de Pollo con Papas', 'Nuggets de pollo con papas fritas.', 'https://images.unsplash.com/photo-1627662055487-551888db3aa8?w=640&h=480&fit=crop&auto=format&q=70', 7.00, 1),
    (b, c_kids, 'Tenders de Pollo con Papas', 'Tenders de pollo con papas fritas.', 'https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?w=640&h=480&fit=crop&auto=format&q=70', 7.00, 2),
    (b, c_kids, 'Hamburguesa de Carne con Queso', 'Hamburguesa infantil de carne con queso.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=640&h=480&fit=crop&auto=format&q=70', 4.00, 3);

end;
$$;
