/**
 * Datos ficticios del demo de menú digital («Fogón Urbano»).
 * Las fotos se cargan desde Unsplash (licencia libre) con tamaño reducido y carga diferida.
 * Si alguna imagen no carga, el componente muestra un respaldo ilustrado.
 */

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
}

export interface MenuProduct {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  emoji: string;
  tag?: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&h=360&q=60`;

export const menuBusiness = {
  name: "Fogón Urbano",
  slogan: "Cocina de barrio, sabor de autor",
  currency: "COP",
  deliveryFee: 5000,
  /** El demo envía el pedido al WhatsApp de la agencia para que el visitante vea el mensaje generado. */
  paymentMethods: ["Efectivo", "Transferencia", "Nequi / Daviplata", "Tarjeta al recibir"],
};

export const menuCategories: MenuCategory[] = [
  { id: "burgers", name: "Hamburguesas", emoji: "🍔" },
  { id: "pizzas", name: "Pizzas", emoji: "🍕" },
  { id: "compartir", name: "Para compartir", emoji: "🍟" },
  { id: "saludable", name: "Saludable", emoji: "🥗" },
  { id: "bebidas", name: "Bebidas", emoji: "🥤" },
  { id: "postres", name: "Postres", emoji: "🍰" },
];

export const menuProducts: MenuProduct[] = [
  { id: "b1", category: "burgers", name: "Clásica del Fogón", description: "Carne de res a la parrilla, queso cheddar, tomate, lechuga y salsa de la casa.", price: 22000, image: img("photo-1568901346375-23c9450c58cd"), emoji: "🍔", tag: "Favorita" },
  { id: "b2", category: "burgers", name: "Doble Ahumada", description: "Doble carne, tocineta crocante, cebolla caramelizada y salsa BBQ ahumada.", price: 29000, image: img("photo-1553979459-d2229ba7433b"), emoji: "🍔" },
  { id: "b3", category: "burgers", name: "Pollo Crispy", description: "Pechuga apanada, pepinillos, repollo morado y mayonesa de ajo.", price: 24000, image: img("photo-1606755962773-d324e0a13086"), emoji: "🍗" },
  { id: "p1", category: "pizzas", name: "Margarita al horno", description: "Salsa de tomate, mozzarella y albahaca fresca. Personal.", price: 26000, image: img("photo-1513104890138-7c749659a591"), emoji: "🍕" },
  { id: "p2", category: "pizzas", name: "Pepperoni Fuego", description: "Pepperoni, mozzarella y un toque de ají. Personal.", price: 30000, image: img("photo-1628840042765-356cda07504e"), emoji: "🍕", tag: "Picante" },
  { id: "c1", category: "compartir", name: "Papas rústicas", description: "Papas en casco con paprika, queso fundido y tocineta.", price: 16000, image: img("photo-1573080496219-bb080dd4f877"), emoji: "🍟" },
  { id: "c2", category: "compartir", name: "Tacos de la casa (3)", description: "Tortilla de maíz, carne desmechada, pico de gallo y guacamole.", price: 21000, image: img("photo-1565299585323-38d6b0865b47"), emoji: "🌮" },
  { id: "s1", category: "saludable", name: "Bowl verde", description: "Mix de hojas, aguacate, quinoa, tomate cherry y vinagreta cítrica.", price: 23000, image: img("photo-1512621776951-a57141f2eefd"), emoji: "🥗" },
  { id: "d1", category: "bebidas", name: "Limonada de coco", description: "Limón natural, crema de coco y hielo frappé. 16 oz.", price: 9000, image: img("photo-1556679343-c7306c1976bc"), emoji: "🥥" },
  { id: "d2", category: "bebidas", name: "Malteada de vainilla", description: "Helado de vainilla, leche y crema batida. 16 oz.", price: 13000, image: img("photo-1572490122747-3968b75cc699"), emoji: "🥤" },
  { id: "d3", category: "bebidas", name: "Café latte", description: "Espresso doble con leche texturizada.", price: 7000, image: img("photo-1509042239860-f550ce710b93"), emoji: "☕" },
  { id: "t1", category: "postres", name: "Torta de chocolate", description: "Bizcocho húmedo con ganache de chocolate semiamargo.", price: 12000, image: img("photo-1578985545062-69928b1d9587"), emoji: "🍰" },
  { id: "t2", category: "postres", name: "Brownie con helado", description: "Brownie tibio, bola de helado y salsa de chocolate.", price: 14000, image: img("photo-1606313564200-e75d5e30476c"), emoji: "🍫", tag: "Nuevo" },
];
