import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, campo, mostrarErrores, avatar } from '../ui/componentes.js';
import { confirmar, toast } from '../ui/dialogos.js';
import * as clientes from '../services/clientes.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';

/** Reduce la foto a 320px JPEG para no llenar el almacenamiento. */
function comprimirFoto(archivo, lado = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto')); };
    img.src = url;
  });
}

export async function render(el, { id }, query) {
  const existente = id ? await clientes.obtener(id) : null;
  if (id && !existente) { ir('/clientes', { reemplazar: true }); return; }
  const c = existente || {};
  const inicio = query.inicio === '1';
  let foto = c.foto || null;

  const volver = existente ? `#/clientes/${id}` : (query.volver === 'credito' ? '#/creditos/nuevo' : inicio ? '#/configuracion?inicio=1' : '#/clientes');
  montar(el, html`
    ${encabezado(existente ? 'Editar cliente' : 'Nuevo cliente', { atras: volver, subtitulo: inicio ? 'Paso 2 de 3 · Registra a tu primer cliente' : '' })}
    <form class="formulario" novalidate>
      <div class="tarjeta">
        <div class="foto-campo">
          <span id="foto-vista">${avatar({ ...c, foto }, true)}</span>
          <label class="btn btn-sec btn-sm">${icono('camara')}<span>${foto ? 'Cambiar foto' : 'Agregar foto'}</span>
            <input type="file" accept="image/*" id="foto" class="oculto-visual"></label>
          <small class="campo-ayuda">Opcional</small>
        </div>
        ${campo({ etiqueta: 'Nombre completo', nombre: 'nombreCompleto', valor: c.nombreCompleto, requerido: true, attrs: 'autocomplete="name" maxlength="120"' })}
        <div class="rejilla-2">
          ${campo({ etiqueta: 'Teléfono', nombre: 'telefono', valor: c.telefono, tipo: 'tel', requerido: true, attrs: 'autocomplete="tel" inputmode="tel"' })}
          ${campo({ etiqueta: 'WhatsApp', nombre: 'whatsapp', valor: c.whatsapp && c.whatsapp !== c.telefono ? c.whatsapp : '', tipo: 'tel', ayuda: 'Déjalo vacío si es el mismo teléfono.', attrs: 'inputmode="tel"' })}
        </div>
        ${campo({ etiqueta: 'Documento de identidad', nombre: 'documento', valor: c.documento, attrs: 'maxlength="25"' })}
        <div class="rejilla-2">
          ${campo({ etiqueta: 'Dirección', nombre: 'direccion', valor: c.direccion, attrs: 'autocomplete="street-address"' })}
          ${campo({ etiqueta: 'Ciudad', nombre: 'ciudad', valor: c.ciudad, attrs: 'autocomplete="address-level2"' })}
        </div>
        ${campo({ etiqueta: 'Referencia', nombre: 'referencia', valor: c.referencia, ayuda: 'Quién lo recomendó, dónde trabaja o cómo ubicarlo.' })}
        ${campo({ etiqueta: 'Notas', nombre: 'notas', valor: c.notas, tipo: 'textarea' })}
      </div>
      <div class="barra-acciones">
        <a class="btn btn-sec btn-lg" href="${volver}">Cancelar</a>
        <button class="btn btn-pri btn-lg" type="submit">${existente ? 'Guardar cambios' : 'Guardar cliente'}</button>
      </div>
    </form>`);

  const form = $('form', el);
  $('#foto', el).addEventListener('change', async e => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      foto = await comprimirFoto(archivo);
      montar($('#foto-vista', el), avatar({ ...c, foto }, true));
    } catch {
      toast('No pudimos leer esa imagen. Prueba con otra.', 'error');
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = { ...Object.fromEntries(new FormData(form)), foto };
    delete datos[''];
    const { cliente, errores, duplicados } = await clientes.revisar(datos, id);
    mostrarErrores(form, errores);
    if (Object.keys(errores).length) return;

    let ok;
    if (duplicados.length) {
      const d = duplicados[0];
      ok = await confirmar({
        titulo: 'Posible cliente repetido',
        mensaje: `Ya existe "${d.cliente.nombreCompleto}" con el mismo ${d.motivos.join(' y ')}. ¿Quieres guardar este cliente de todas formas?`,
        aceptar: 'Guardar de todas formas', cancelar: 'Revisar',
      });
    } else {
      ok = await confirmar({
        titulo: existente ? '¿Guardar los cambios?' : '¿Guardar este cliente?',
        detalle: html`<div class="resumen-confirmacion"><strong>${cliente.nombreCompleto}</strong><span>${cliente.telefono}${cliente.documento ? ` · Doc. ${cliente.documento}` : ''}</span></div>`,
        aceptar: 'Guardar',
      });
    }
    if (!ok) return;

    const guardado = await intentar(() => clientes.guardar(datos, id), 'guardar el cliente');
    toast(existente ? 'Cliente actualizado.' : 'Cliente guardado.');
    if (inicio) ir(`/creditos/nuevo?cliente=${guardado.id}&inicio=1`);
    else if (query.volver === 'credito') ir(`/creditos/nuevo?cliente=${guardado.id}`);
    else ir(`/clientes/${guardado.id}`);
  });
}
