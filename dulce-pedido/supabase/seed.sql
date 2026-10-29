-- =============================================================================
-- DULCE PEDIDO — tienda de demostración "dulce-pedido-demo"
-- Productos y precios DE EJEMPLO para mostrar el sistema. La tienda queda
-- marcada como demo = true y la app lo anuncia en pantalla. No usar como datos reales.
-- Se puede ejecutar varias veces: si la tienda ya existe, no hace nada.
-- =============================================================================
do $$
declare
  t uuid;
  c_tortas uuid; c_ind uuid; c_brownies uuid; c_galletas uuid; c_cupcakes uuid;
  c_frios uuid; c_trad uuid; c_combos uuid; c_pers uuid;
  p uuid;
begin
  if exists (select 1 from public.dp_tiendas where slug = 'dulce-pedido-demo') then
    return;
  end if;

  insert into public.dp_tiendas (slug, nombre, demo, whatsapp, dias_atencion, dias_max_anticipacion, franjas,
                                 recogida, domicilio, direccion_recogida, contenido)
  values ('dulce-pedido-demo', 'Dulce Pedido', true, '+573126387467', '{1,2,3,4,5,6}', 45,
    '{"Mañana (9:00 a. m. – 12:00 m.)","Tarde (2:00 – 6:00 p. m.)"}', true, true,
    'Punto de entrega en La Estrella, Antioquia (dirección exacta al confirmar el pedido)',
    jsonb_build_object(
      'eslogan', 'Repostería casera hecha con cariño',
      'mensaje_bienvenida', 'Tortas, postres y detalles dulces preparados en casa para tus celebraciones y antojos. Elige lo que te guste y envíanos tu pedido por WhatsApp.',
      'logo_url', '', 'banner_url', '',
      'colores', jsonb_build_object('primario', '#5a3222', 'acento', '#c4673f'),
      'como_pedir', jsonb_build_array(
        'Explora el catálogo y agrega tus productos al carrito.',
        'Elige la fecha, la franja horaria y si recoges o te lo llevamos.',
        'Envía el pedido por WhatsApp con el resumen listo.',
        'Te confirmamos disponibilidad, valor final y forma de pago.'),
      'info_entregas', 'Hacemos domicilios en las zonas que ves al finalizar tu pedido. Si tu barrio no aparece con tarifa, te cotizamos el envío por WhatsApp.',
      'info_anticipacion', 'Todo se prepara por encargo. Las tortas necesitan al menos 2 días de anticipación; los postres individuales, 1 día.',
      'eventos_texto', '¿Cumpleaños, reunión o evento? Cuéntanos la fecha, el número de personas y la idea, y te armamos una propuesta.',
      'faq', jsonb_build_array(
        jsonb_build_object('pregunta', '¿Mi pedido queda confirmado al enviarlo?', 'respuesta', 'Todavía no. Al enviarlo por WhatsApp nos llega tu solicitud; te respondemos para confirmar disponibilidad, el valor final y la forma de pago.'),
        jsonb_build_object('pregunta', '¿Con cuánta anticipación debo pedir?', 'respuesta', 'Depende del producto: en cada uno verás el tiempo mínimo de preparación. El calendario solo te deja elegir fechas posibles.'),
        jsonb_build_object('pregunta', '¿Cuánto cuesta el domicilio?', 'respuesta', 'Depende de tu zona. Si tu zona tiene tarifa, la verás en el total; si no, te la cotizamos por WhatsApp antes de confirmar.'),
        jsonb_build_object('pregunta', '¿Puedo personalizar una torta?', 'respuesta', 'Sí. Escribe tu idea en las observaciones o elige la categoría de productos personalizados y te asesoramos.'),
        jsonb_build_object('pregunta', '¿Cómo pago?', 'respuesta', 'Te enviamos las opciones de pago cuando confirmemos tu pedido.')),
      'testimonios', '[]'::jsonb,
      'ciudad', 'La Estrella, Antioquia',
      'horario_texto', 'Lunes a sábado, 9:00 a. m. a 6:00 p. m.',
      'instagram', '', 'facebook', '', 'tiktok', '', 'correo', '',
      'privacidad', 'Usamos tu nombre, teléfono y dirección únicamente para gestionar y entregar tu pedido, conforme a la Ley 1581 de 2012. No los compartimos con terceros ni los usamos para publicidad sin tu autorización. Puedes pedir que los actualicemos o eliminemos escribiéndonos por WhatsApp. Los datos de pedidos se conservan por un máximo de 12 meses.'
    ))
  returning id into t;

  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Tortas', 1) returning id into c_tortas;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Postres individuales', 2) returning id into c_ind;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Brownies', 3) returning id into c_brownies;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Galletas', 4) returning id into c_galletas;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Cupcakes', 5) returning id into c_cupcakes;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Postres fríos', 6) returning id into c_frios;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Dulces tradicionales', 7) returning id into c_trad;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Combos y cajas de regalo', 8) returning id into c_combos;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Productos personalizados', 9) returning id into c_pers;

  -- Tortas
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      por_encargo, horas_preparacion, sabores, conservacion, orden)
  values (t, c_tortas, 'Torta de chocolate', 'Bizcocho húmedo de chocolate con relleno y cubierta de ganache.', 65000,
      'Redonda, decorada', true, true, 48, '{}', 'Mantener refrigerada. Consumir en 3 días.', 1)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, '1/2 libra · 10 porciones', 65000, 1),
    (t, p, '1 libra · 20 porciones', 115000, 2),
    (t, p, '2 libras · 40 porciones', 210000, 3);

  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, nuevo,
      por_encargo, horas_preparacion, sabores, conservacion, orden)
  values (t, c_tortas, 'Torta de zanahoria', 'Con nueces y frosting de queso crema.', 70000, 'Redonda', true, true, 48, '{}',
      'Mantener refrigerada. Consumir en 4 días.', 2)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, '1/2 libra · 10 porciones', 70000, 1),
    (t, p, '1 libra · 20 porciones', 125000, 2);

  -- Postres individuales
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      horas_preparacion, sabores, conservacion, orden)
  values (t, c_ind, 'Cheesecake individual', 'Base de galleta, crema de queso y salsa de frutos rojos o maracuyá.', 12000,
      'Vaso de 9 oz', true, 24, '{"Frutos rojos","Maracuyá"}', 'Mantener refrigerado.', 1);
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, conservacion, orden)
  values (t, c_ind, 'Tres leches', 'Bizcocho bañado en tres leches con merengue.', 10000, 'Porción individual', 24,
      'Mantener refrigerado.', 2);

  -- Brownies
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      horas_preparacion, cantidad_minima, sabores, sabores_max, orden)
  values (t, c_brownies, 'Brownie artesanal', 'Brownie de chocolate, crocante por fuera y húmedo por dentro.', 5000,
      'Unidad de 7 × 7 cm', true, 24, 6, '{"Clásico","Arequipe","Nutella","Nueces"}', 2, 1);

  -- Galletas (una agotada para mostrar el estado)
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, cantidad_minima, sabores, orden)
  values (t, c_galletas, 'Galletas con chips de chocolate', 'Galletas grandes horneadas el mismo día.', 3500,
      'Unidad de 60 g', 12, 6, '{}', 1);
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, disponible,
      horas_preparacion, orden)
  values (t, c_galletas, 'Galletas de avena y pasas', 'Suaves y especiadas.', 3000, 'Unidad de 50 g', false, 12, 2);

  -- Cupcakes
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, cantidad_minima, sabores, sabores_max, orden)
  values (t, c_cupcakes, 'Cupcakes decorados', 'Con crema de mantequilla y decoración a elección en las observaciones.', 6000,
      'Unidad', 48, 6, '{"Vainilla","Chocolate","Red velvet"}', 3, 1);

  -- Postres fríos
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, sabores, conservacion, orden)
  values (t, c_frios, 'Postre de maracuyá', 'Mousse de maracuyá sobre base de galleta.', 9000, 'Vaso de 7 oz', 24, '{}',
      'Mantener refrigerado.', 1);

  -- Dulces tradicionales
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, orden)
  values (t, c_trad, 'Arequipe casero', 'Preparado en paila, a fuego lento.', 14000, 'Frasco de 250 g', 24, 1);

  -- Combos
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      por_encargo, horas_preparacion, sabores, sabores_max, orden)
  values (t, c_combos, 'Caja de regalo dulce', 'Caja con brownies y galletas surtidas, lista para regalar. Elige hasta 3 sabores.',
      45000, 'Caja con lazo', true, true, 48, '{"Brownie clásico","Brownie de arequipe","Galleta de chips","Alfajor"}', 3, 1)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, 'Caja x 6 unidades', 45000, 1),
    (t, p, 'Caja x 12 unidades', 82000, 2);

  -- Personalizados
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      por_encargo, horas_preparacion, orden)
  values (t, c_pers, 'Torta temática personalizada', 'Para cumpleaños y eventos. El precio indicado es la base: el valor final se confirma según el diseño.',
      150000, 'Desde 20 porciones', true, 120, 1);

  insert into public.dp_zonas (tienda_id, nombre, tarifa, orden) values
    (t, 'La Estrella (casco urbano)', 6000, 1),
    (t, 'Sabaneta e Itagüí', 9000, 2),
    (t, 'Envigado y Medellín sur', 12000, 3),
    (t, 'Otra zona (se cotiza)', null, 4);
end $$;
