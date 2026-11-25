/* ==========================================================================
   Catálogo de DEMOSTRACIÓN
   --------------------------------------------------------------------------
   Productos de ejemplo para probar la tienda. En la fase 2 el catálogo
   vendrá de Supabase y se administrará desde el panel.

   Campos de cada producto:
     id          texto único, sin espacios
     nombre      nombre visible
     categoria   id de una categoría de la lista CATEGORIAS
     precio      número entero en pesos (sin puntos)
     stock       unidades disponibles (0 = agotado)
     activo      true / false (false = no se muestra)
     imagen      ruta o URL de la foto (opcional; si falta se usa el emoji)
     emoji       ícono de respaldo cuando no hay foto
     codigoBarras  EAN-13 impreso en el empaque (para la pistola lectora);
                 los de esta demo son DE PRUEBA, no corresponden a productos reales
     unidad      texto corto: "und", "lb", "paquete x6"...
     descripcion opcional
   ========================================================================== */

// Fotos de REFERENCIA tomadas de Unsplash (licencia gratuita de Unsplash).
// Son solo para la demostración: cada tienda debe reemplazarlas por fotos
// propias de sus productos (ver README, "Personalizar una tienda").
function foto(id) {
  return `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&auto=format&q=70`;
}

window.CATEGORIAS_DEMO = [
  { id: "despensa", nombre: "Despensa", emoji: "🥫" },
  { id: "lacteos", nombre: "Lácteos y huevos", emoji: "🥛" },
  { id: "panaderia", nombre: "Panadería", emoji: "🥖" },
  { id: "bebidas", nombre: "Bebidas", emoji: "🧃" },
  { id: "fruver", nombre: "Frutas y verduras", emoji: "🍌" },
  { id: "aseo", nombre: "Aseo del hogar", emoji: "🧼" },
  { id: "snacks", nombre: "Snacks y dulces", emoji: "🍫" }
];

window.PRODUCTOS_DEMO = [
  { id: "arroz-1kg", codigoBarras: "7709990000016", nombre: "Arroz blanco 1 kg", categoria: "despensa", precio: 4800, stock: 30, activo: true, imagen: foto("1536304993881-ff6e9eefa2a6"), emoji: "🍚", unidad: "bolsa" },
  { id: "aceite-1l", codigoBarras: "7709990000023", nombre: "Aceite vegetal 1 L", categoria: "despensa", precio: 11500, stock: 12, activo: true, imagen: foto("1552592074-ea7a91b851b3"), emoji: "🫗", unidad: "botella" },
  { id: "panela", codigoBarras: "7709990000030", nombre: "Panela redonda", categoria: "despensa", precio: 3200, stock: 20, activo: true, imagen: foto("1788238025855-55581a2ed354"), emoji: "🟫", unidad: "und" },
  { id: "cafe-250", codigoBarras: "7709990000047", nombre: "Café molido 250 g", categoria: "despensa", precio: 9900, stock: 3, activo: true, imagen: foto("1511920170033-f8396924c348"), emoji: "☕", unidad: "paquete" },
  { id: "atun", codigoBarras: "7709990000054", nombre: "Atún en agua 170 g", categoria: "despensa", precio: 6500, stock: 0, activo: true, imagen: foto("1741275169345-17b56cb5d7a6"), emoji: "🐟", unidad: "lata" },
  { id: "leche-1l", codigoBarras: "7709990000061", nombre: "Leche entera 1 L", categoria: "lacteos", precio: 4200, stock: 40, activo: true, imagen: foto("1634141510639-d691d86f47be"), emoji: "🥛", unidad: "bolsa" },
  { id: "huevos-30", codigoBarras: "7709990000078", nombre: "Huevos AA x30", categoria: "lacteos", precio: 18500, stock: 8, activo: true, imagen: foto("1506976785307-8732e854ad03"), emoji: "🥚", unidad: "panal" },
  { id: "queso", codigoBarras: "7709990000085", nombre: "Queso campesino 500 g", categoria: "lacteos", precio: 12000, stock: 6, activo: true, imagen: foto("1624806992066-5ffcf7ca186b"), emoji: "🧀", unidad: "und" },
  { id: "pan-tajado", codigoBarras: "7709990000092", nombre: "Pan tajado", categoria: "panaderia", precio: 6900, stock: 10, activo: true, imagen: foto("1549931319-a545dcf3bc73"), emoji: "🍞", unidad: "paquete" },
  { id: "pandebono", codigoBarras: "7709990000108", nombre: "Pandebono", categoria: "panaderia", precio: 1500, stock: 25, activo: true, imagen: foto("1559141680-d0bd7bc5af84"), emoji: "🥯", unidad: "und", descripcion: "Horneado cada mañana." },
  { id: "gaseosa-15", codigoBarras: "7709990000115", nombre: "Gaseosa 1,5 L", categoria: "bebidas", precio: 5500, stock: 18, activo: true, imagen: foto("1782292016930-74679437f72b"), emoji: "🥤", unidad: "botella" },
  { id: "agua-600", codigoBarras: "7709990000122", nombre: "Agua sin gas 600 ml", categoria: "bebidas", precio: 2000, stock: 50, activo: true, imagen: foto("1616118132534-381148898bb4"), emoji: "💧", unidad: "botella" },
  { id: "jugo-caja", codigoBarras: "7709990000139", nombre: "Jugo en caja 1 L", categoria: "bebidas", precio: 4900, stock: 14, activo: true, imagen: foto("1600271886742-f049cd451bba"), emoji: "🧃", unidad: "caja" },
  { id: "banano", codigoBarras: "7709990000146", nombre: "Banano", categoria: "fruver", precio: 2500, stock: 20, activo: true, imagen: foto("1603833665858-e61d17a86224"), emoji: "🍌", unidad: "lb" },
  { id: "tomate", codigoBarras: "7709990000153", nombre: "Tomate chonto", categoria: "fruver", precio: 3000, stock: 15, activo: true, imagen: foto("1582284540020-8acbe03f4924"), emoji: "🍅", unidad: "lb" },
  { id: "aguacate", codigoBarras: "7709990000160", nombre: "Aguacate", categoria: "fruver", precio: 3500, stock: 9, activo: true, imagen: foto("1523049673857-eb18f1d7b578"), emoji: "🥑", unidad: "und" },
  { id: "papel-hig", codigoBarras: "7709990000177", nombre: "Papel higiénico x4", categoria: "aseo", precio: 8900, stock: 16, activo: true, imagen: foto("1583496597549-0fd8b25e34e2"), emoji: "🧻", unidad: "paquete" },
  { id: "jabon-loza", codigoBarras: "7709990000184", nombre: "Jabón lavaloza 500 g", categoria: "aseo", precio: 5200, stock: 11, activo: true, imagen: foto("1590610994353-7b0e7546e681"), emoji: "🧽", unidad: "und" },
  { id: "detergente", codigoBarras: "7709990000191", nombre: "Detergente en polvo 1 kg", categoria: "aseo", precio: 13900, stock: 7, activo: true, imagen: foto("1582735689369-4fe89db7114c"), emoji: "🧺", unidad: "bolsa" },
  { id: "papas", codigoBarras: "7709990000207", nombre: "Papas fritas 115 g", categoria: "snacks", precio: 4500, stock: 22, activo: true, imagen: foto("1783332488482-8df54e4fc24c"), emoji: "🥔", unidad: "paquete" },
  { id: "chocolatina", codigoBarras: "7709990000214", nombre: "Chocolatina", categoria: "snacks", precio: 2200, stock: 30, activo: true, imagen: foto("1623660053975-cf75a8be0908"), emoji: "🍫", unidad: "und" },
  { id: "helado", codigoBarras: "7709990000221", nombre: "Helado paleta", categoria: "snacks", precio: 3500, stock: 0, activo: false, imagen: foto("1528826058331-d59e395cfe43"), emoji: "🍦", unidad: "und" }
];
