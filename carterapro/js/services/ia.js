// Punto de extensión para un asistente de IA. En el MVP no hay proveedor conectado:
// la vista Analista IA usa el diagnóstico local y permite copiar un resumen anónimo.
//
// Para conectar un modelo (por ejemplo, a través de un backend propio que guarde la clave de API):
//   registrarProveedor({ nombre: 'Mi servidor', analizar: async prompt => (await fetch('/api/ia', {...})).text() });
// Nunca pongas una clave de API dentro del código de la PWA: cualquiera podría leerla.
import { obtener } from './datos.js';
import { resumenAnonimo, promptAnalisis } from '../domain/diagnostico.js';
import { getMoneda } from '../core/money.js';

let proveedor = null;

export function registrarProveedor(p) {
  proveedor = p && typeof p.analizar === 'function' ? p : null;
}

export const proveedorActual = () => proveedor;

export async function prepararPrompt(pregunta) {
  const { analisis, hoy } = await obtener();
  const m = getMoneda();
  const resumen = resumenAnonimo({ analisis }, hoy, { moneda: m.codigo, decimales: m.decimales });
  const base = promptAnalisis(resumen);
  return { resumen, prompt: pregunta ? `${pregunta}\n\n${base}` : base };
}

export async function analizar(pregunta) {
  if (!proveedor) throw new Error('No hay un asistente de IA conectado.');
  const { prompt } = await prepararPrompt(pregunta);
  return proveedor.analizar(prompt);
}
