// Textos traducibles. Español es el idioma base: si una clave no existe en el idioma
// elegido, se usa el texto en español. Para traducir una pantalla, reemplaza sus textos
// fijos por t('clave') y agrega la clave en cada archivo de js/core/locales/.
import es from './locales/es.js';
import en from './locales/en.js';
import pt from './locales/pt.js';

export const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português' };
const TEXTOS = { es, en, pt };
let actual = 'es';

export function setIdioma(codigo) {
  actual = TEXTOS[codigo] ? codigo : 'es';
  if (typeof document !== 'undefined') document.documentElement.lang = actual;
}

export const getIdioma = () => actual;

/** t('nav.inicio') · t('saludo', { nombre: 'Ana' }) con {nombre} en el texto. */
export function t(clave, vars) {
  const texto = TEXTOS[actual][clave] ?? es[clave] ?? clave;
  return vars ? texto.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : texto;
}
