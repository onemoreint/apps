-- =============================================================================
-- DULCE PEDIDO — fotografías de referencia para la tienda de demostración.
-- Fotos reales de Unsplash (licencia Unsplash: uso comercial libre, sin
-- atribución obligatoria). Créditos en docs/CREDITOS.md. NO son fotos de
-- productos de ninguna vendedora: la tienda demo las marca como «Foto de referencia».
-- Se puede ejecutar varias veces.
-- =============================================================================
do $$
declare
  t uuid;
  q constant text := '?auto=format&fit=crop&w=900&q=75';
  u constant text := 'https://images.unsplash.com/';
begin
  select id into t from public.dp_tiendas where slug = 'dulce-pedido-demo';
  if t is null then
    return;
  end if;

  update public.dp_productos p set fotos = array[u || f.foto || q]
  from (values
    ('Torta de chocolate', 'photo-1607257882338-70f7dd2ae344'),
    ('Torta de zanahoria', 'photo-1773933200726-458f8c64ac29'),
    ('Cheesecake individual', 'photo-1734987408480-c2916b5386bc'),
    ('Tres leches', 'photo-1673974798330-23e8f4c9ae05'),
    ('Brownie artesanal', 'photo-1636743715220-d8f8dd900b87'),
    ('Galletas con chips de chocolate', 'photo-1719384980808-0f3b833a2468'),
    ('Galletas de avena y pasas', 'photo-1668724063394-dc6716fc6bd6'),
    ('Cupcakes decorados', 'photo-1642647369793-1cccf9aa1153'),
    ('Postre de maracuyá', 'photo-1746633570370-2b0c49779a4f'),
    ('Arequipe casero', 'photo-1610360147031-26a1d395726e'),
    ('Caja de regalo dulce', 'photo-1655734940582-3667ebefb516'),
    ('Torta temática personalizada', 'photo-1635822120057-b37c15ce1bef')
  ) as f(nombre, foto)
  where p.tienda_id = t and p.nombre = f.nombre;

  -- Una foto propia por categoría.
  update public.dp_categorias c set foto_url = u || f.foto || q
  from (values
    ('Tortas', 'photo-1464347744102-11db6282f854'),
    ('Postres individuales', 'photo-1734987408480-c2916b5386bc'),
    ('Brownies', 'photo-1636743715220-d8f8dd900b87'),
    ('Galletas', 'photo-1499636136210-6f4ee915583e'),
    ('Cupcakes', 'photo-1642647369793-1cccf9aa1153'),
    ('Postres fríos', 'photo-1746633570370-2b0c49779a4f'),
    ('Dulces tradicionales', 'photo-1610360147031-26a1d395726e'),
    ('Combos y cajas de regalo', 'photo-1655734940582-3667ebefb516'),
    ('Productos personalizados', 'photo-1635822120057-b37c15ce1bef')
  ) as f(nombre, foto)
  where c.tienda_id = t and c.nombre = f.nombre;

  -- Portada y ubicación (Urbanización Felicity, La Estrella).
  update public.dp_tiendas set
    direccion_recogida = 'Urbanización Felicity, La Estrella, Antioquia (te confirmamos torre y apartamento por WhatsApp)',
    contenido = contenido || jsonb_build_object(
      'banner_url', u || 'photo-1505252827206-b0ef670590f6?auto=format&fit=crop&w=1600&q=75',
      'direccion', 'Urbanización Felicity, La Estrella, Antioquia',
      'mapa_lat', 6.1526068,
      'mapa_lng', -75.6518412)
  where id = t;
end $$;
