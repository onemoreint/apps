# Arquitectura

## Decisión: opción B preparada para C

| Opción | Por qué no / por qué sí |
|---|---|
| A. Estático + WhatsApp | Sin panel real ni registro de pedidos; editar exige tocar código. Se conserva como **modo demostración**. |
| **B. Backend + panel autenticado** | **Elegida.** Panel con login real, RLS, precios validados en servidor, fotos subidas por la dueña. Costo $0 en planes gratuitos. |
| C. SaaS multiempresa completo | Registro automático, cobro de suscripciones, subdominios. No se construye aún, pero los datos ya están separados por `tienda_id`, así que la evolución es agregar pantallas, no reescribir. |

## Componentes

```
Cliente ──► Tienda (estáticos en CDN) ──fetch──► Supabase REST
                                                  ├─ rpc dp_tienda_publica   (anon)
                                                  └─ rpc dp_crear_pedido     (anon)
Propietaria ──► #/admin (chunk aparte, supabase-js) ──► Auth + tablas dp_* (RLS) + Storage
```

- La tienda pública **no** carga la librería de Supabase (usa `fetch` directo): pesa menos en celulares. El panel se descarga solo al entrar a `#/admin` y no se precachea en la PWA de los clientes.
- Proyecto Supabase de producción: el de MesaQR (`nkzjjrbzdfyppsxvcvbg`). Se eligió así porque los dos proyectos gratuitos de la cuenta ya están en uso; todas las tablas llevan prefijo `dp_` y el bucket es `dulce-pedido`, así que no se mezclan con MesaQR. Para mover Dulce Pedido a un proyecto propio basta con ejecutar `supabase/setup.sql` en el nuevo y cambiar URL/clave en `scripts/build-pages.mjs`.

## Datos (`supabase/migrations`)

| Tabla | Qué guarda |
|---|---|
| `dp_tiendas` | Configuración de cada negocio: slug, nombre, WhatsApp, días, franjas, recogida/domicilio, `contenido` (textos, colores, FAQ, testimonios, redes, privacidad), límite anti-abuso, retención, consecutivo |
| `dp_miembros` / `dp_invitaciones` | Quién administra cada tienda (`propietaria` o `equipo`); invitaciones por correo |
| `dp_categorias`, `dp_productos`, `dp_variantes` | Catálogo. Precios en COP enteros. `activo` = visible; `disponible` = no agotado |
| `dp_zonas`, `dp_fechas_bloqueadas` | Domicilios (tarifa `null` = se cotiza) y fechas cerradas |
| `dp_pedidos`, `dp_pedido_items` | Solicitudes con copia de precios del momento y autorización de datos |

## Seguridad

- **RLS en todas las tablas.** `anon` no tiene ningún permiso sobre tablas. `authenticated` solo ve y edita filas de las tiendas donde es miembro (`dp_es_miembro`).
- Supabase concede por defecto todo a `anon`/`authenticated` en objetos nuevos; las migraciones lo retiran explícitamente y las pruebas simulan ese comportamiento para detectar olvidos.
- **Precios en servidor:** `dp_crear_pedido` ignora cualquier precio enviado; toma precios, variantes, sabores, mínimos y tarifas de la base de datos; valida fecha (zona horaria del negocio), días, bloqueos, tiempo de preparación y franja; limita 5 solicitudes por teléfono por hora.
- Desde el panel, un pedido solo admite cambios de `estado` y `notas_internas` (permiso por columna). La propietaria no puede cambiar consecutivo, límite, `activa` ni `demo` de su tienda.
- Fotos: lectura pública; escritura solo en la carpeta `{tienda_id}/` de la propia tienda.
- Triggers impiden asociar variantes o categorías de otra tienda.
- Sin secretos en el código: URL y clave **publicable** son públicas por diseño. La `service_role` nunca se usa en la app.

## Privacidad (Ley 1581 de 2012)

- Datos mínimos: nombre, teléfono y, solo si hay domicilio, dirección y barrio.
- Casilla de autorización obligatoria (no se recuerda entre pedidos) y fecha de autorización guardada.
- Política editable por la propietaria (`#/privacidad`), con responsable y derechos.
- Retención configurable (meses) y botón «Anonimizar pedidos vencidos» (`dp_anonimizar_pedidos`): borra datos personales y conserva totales para estadísticas.
- Los visitantes nunca ven teléfonos, direcciones ni pedidos de otros.
- Nota: la propietaria es responsable del tratamiento; quien administra el servicio actúa como encargado. Revisar si al negocio le aplica el registro en el RNBD.

## Costos (verificar antes de vender)

| Servicio | Plan | Límites relevantes | Estado |
|---|---|---|---|
| GitHub Pages | Gratis | Sitio estático público | En uso |
| Cloudflare Pages | Gratis | 500 compilaciones/mes, 100 dominios por proyecto, 20.000 archivos | Verificado en su documentación (oct 2026) |
| Supabase | Gratis | 2 proyectos activos, 500 MB BD, 1 GB archivos, 5 GB salida; **pausa tras 1 semana sin actividad**; sin respaldos descargables | Según CostBench (jul 2026); confirmar en supabase.com/pricing |
| Supabase Pro | Pago | ~USD 25/mes (no verificado) | Confirmar |
| Dominio .com | Anual | ~COP 50.000–70.000 | Estimado |

**Riesgo principal del plan gratuito:** la pausa por inactividad y la falta de respaldos. Con varias tiendas en un mismo proyecto la actividad suele mantenerlo despierto; para clientas que pagan, pasar a Pro. Respaldo manual: Supabase → Database → Backups o `pg_dump` (ver PUBLICAR.md).

## Ruta de evolución

1. **Ahora:** una tienda por cliente en el mismo proyecto, alta por SQL (`dp_crear_tienda`).
2. **Siguiente:** pantalla de «superadministrador» para crear tiendas y ver uso; subdominio por tienda.
3. **SaaS:** registro autoservicio, cobro de suscripción, límites por plan.
4. **Opcional:** WhatsApp Business Platform vía proveedor autorizado — el mensaje ya se genera en `src/core/whatsapp.ts` y la solicitud ya queda registrada; bastaría una Edge Function que lo envíe al número de la tienda.
5. **Opcional:** pagos en línea (Wompi, Bold, Mercado Pago) solo si el negocio lo pide; hoy el pago se coordina por WhatsApp a propósito.
