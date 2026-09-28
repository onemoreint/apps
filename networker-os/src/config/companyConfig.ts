// Configuración de la empresa. Cambiar este objeto (o su versión guardada en Configuración)
// permite usar NETWORKER OS con cualquier compañía de venta directa.

export interface CompanyProduct {
  name: string;
  category: string;
  priceClient: number;
  priceDistributor: number;
}

export interface CompanyConfig {
  id: string;
  name: string;
  shortName: string;
  logoText: string;
  colors: { accent: string; accent2: string };
  country: string;
  currency: string;
  locale: string;
  productCategory: string; // cómo se nombra el producto en los mensajes
  products: CompanyProduct[];
  commercialInfo: string;
  links: { label: string; url: string }[];
  complianceNote: string;
}

export const DEFAULT_COMPANY: CompanyConfig = {
  id: 'one-more-international',
  name: 'One More International',
  shortName: 'One More',
  logoText: 'ONE MORE',
  colors: { accent: '#E6B55C', accent2: '#5B8CFF' },
  country: 'Colombia',
  currency: 'USD',
  locale: 'es-CO',
  productCategory: 'productos de bienestar transdérmicos',
  products: [
    { name: 'PNG', category: 'Bienestar', priceClient: 79, priceDistributor: 64 },
    { name: 'Slim Style', category: 'Bienestar', priceClient: 43, priceDistributor: 32 },
    { name: 'Dekamin', category: 'Bienestar', priceClient: 43, priceDistributor: 32 },
    { name: 'Melatonin Plus', category: 'Bienestar', priceClient: 47, priceDistributor: 35 },
    { name: 'B12 Plus', category: 'Bienestar', priceClient: 47, priceDistributor: 35 },
    { name: 'Omevia', category: 'Bienestar', priceClient: 49, priceDistributor: 39 },
    { name: 'GlutaNAD+', category: 'Bienestar', priceClient: 79, priceDistributor: 67 },
  ],
  commercialInfo:
    'Empresa de productos de bienestar con presencia en Latinoamérica. Los resultados del negocio dependen del esfuerzo y la constancia de cada persona.',
  links: [{ label: 'Sitio de la empresa', url: 'https://onemoreint.github.io/' }],
  complianceNote:
    'Los productos no son medicamentos y no reemplazan tratamientos médicos. Los ingresos del negocio no están garantizados y dependen del trabajo de cada persona.',
};
