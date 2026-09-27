# ARQUIGEN 360 — Arquitectura (Fase 1 / MVP)

> Principio rector: **la geometría estructurada es la fuente de verdad.**
> Todo lo que se ve (plano 2D, cotas, vista 2.5D, lámina, exportaciones) es una
> *función pura* del objeto `Project`. Ninguna vista inventa geometría propia y la
> IA nunca dibuja: solo propone datos que el motor determinista convierte en geometría.

```
 Instrucción en texto ──► [IA / intérprete] ──► Program + Site (JSON)
                                                     │
 Formulario Terreno / Programa ──────────────────────┤
                                                     ▼
                                   [layout-engine]  (determinista)
                                                     │
                                                     ▼
                              Project { rooms, openings, furniture }  ◄── Editor (drag, muros, inspector)
                                                     │
          ┌──────────────┬──────────────┬────────────┼──────────────┬──────────────┐
          ▼              ▼              ▼            ▼              ▼              ▼
      Muros (walls)   Cotas        Validación     Plano SVG      Vista 2.5D     Lámina → PNG/JPG/PDF/SVG
```

## 1. Estructura de carpetas

```
src/
  geometry/        tipos del modelo, rectángulos, muros, cotas, transformaciones
    types.ts         Site, Program, Room, Opening, FurnitureItem, Project
    rect.ts          solapes, aristas compartidas, snapping, redondeo a 5 cm
    walls.ts         deriva los segmentos de muro desde las habitaciones
    dimensions.ts    cadenas de cotas (generales, parciales, por ambiente)
  layout-engine/   motor de distribución determinista
    catalog.ts       catálogo de ambientes: medidas por defecto, zona, si es cubierto
    rules.ts         reglas de relación espacial (proximidad, zonas, accesos)
    engine.ts        zonificación por bandas + columnas + treemap ordenado
    openings.ts      puertas y ventanas automáticas a partir de adyacencias
    validate.ts      validaciones y cuadro de áreas
  furniture/       biblioteca de mobiliario escalable + amoblado automático
  render/          estilos visuales, PlanSvg (2D), AxoView (2.5D), Sheet (lámina)
  export/          SVG, PNG, JPG, PDF, JSON
  ai/              intérprete de lenguaje natural (local) + interfaz de proveedor LLM
  projects/        persistencia (localStorage + archivo .json)
  components/      UI: barra superior, paneles, editor, inspector
  utils/           ids, formato numérico
  store.ts         estado global (zustand) con historial deshacer/rehacer
```

## 2. Modelo de datos

Sistema de coordenadas: metros, origen en la esquina frontal-izquierda del lote,
`x` a lo ancho (izq → der), `y` a lo largo (frente → fondo). En pantalla el frente
queda abajo, como en una lámina inmobiliaria. Las medidas de ambientes son a eje de muro.

```ts
Site     { width, length, units, floors, access: 'front'|'back'|'left'|'right',
           northAngle, maxOccupancy, setbacks: { front, back, side } }
RoomSpec { id, type, name, minWidth, minLength, minArea, priority, nearTo[] }
Program  { rooms: RoomSpec[], preferences: { socialZone, openKitchen, garageCars } }
Room     { id, specId?, type, name, x, y, width, length }          // ← el JSON pedido
Opening  { id, kind: door|window|garage_door, roomId, wall: S|N|W|E,
           offset, width, swing: in|out, hinge: start|end }         // relativo al ambiente
FurnitureItem { id, roomId, kind, cx, cy, rotation }                // relativo al ambiente
Project  { id, name, site, program, rooms, openings, furniture, style, version }
```

Puertas, ventanas y muebles se guardan **relativos a su ambiente**: al mover o
redimensionar una habitación, todo lo que contiene se mueve con ella.

## 3. Motor geométrico (determinista)

1. **Marco canónico.** Se genera siempre con el acceso "al frente"; al final se
   rota el resultado al lado real de acceso (frontal, posterior, izquierdo, derecho).
2. **Área construible** = lote − retiros (frontal, posterior, laterales).
3. **Clasificación por zonas** (catálogo): garaje, social (sala, comedor, cocina),
   servicio (lavandería, depósito), privada (dormitorios, baños, estudio), exterior.
4. **Bandas en profundidad** según la preferencia: `[social, privada, exterior]`
   o `[privada, social, exterior]`. El garaje siempre va en la primera banda,
   pegado a la calle, en una columna lateral; si sobra fondo detrás del garaje se
   aloja allí el servicio (junto a la cocina).
5. **Zona social**: *treemap* ordenado por filas (sala → comedor → cocina → servicio)
   que conserva el orden de proximidad y busca proporciones cercanas a 1.
6. **Zona privada**: pasillo central (doble crujía) o lateral (lote angosto), con
   dormitorios a cada lado. El dormitorio principal, su baño y vestidor forman un
   bloque en el extremo más privado. Los baños comunes quedan contra el pasillo.
7. **Ajuste de fondo**: si las bandas no caben, se escalan y se reportan los
   ambientes que quedan bajo su mínimo; si sobra, queda como patio libre.
8. **Redondeo a 5 cm** sobre coordenadas acumuladas, así las aristas compartidas
   coinciden exactamente (sin huecos ni solapes).
9. **Aberturas**: cada ambiente recibe su puerta sobre la arista compartida con su
   destino según reglas (dormitorio → pasillo, baño privado → dormitorio principal,
   lavandería → cocina, garaje → calle + interior). Ventanas solo en muros que dan
   a retiro o patio de al menos 1 m (no en medianeras).
10. **Mobiliario automático** contra muros sin puertas, sin invadir el barrido.

**Validaciones**: solapes, fuera del área construible, bajo mínimo (ancho, largo, área),
ocupación máxima, dormitorios sin ventana, ambientes sin puerta, baño sin acceso
desde circulación, garaje sin frente a la calle, cocina lejos del comedor.

## 4. Cotas

Se derivan de la geometría en cada render (nunca se guardan):
- **Generales**: ancho y largo del lote.
- **Parciales**: se toman todos los bordes `x` e `y` de los ambientes cubiertos,
  más los bordes del lote; se ordenan, se fusionan los < 10 cm y se dibuja la
  cadena (incluye retiros).
- **Por ambiente**: rótulo `ancho × largo` y área; cotas interiores del ambiente
  seleccionado; ancho de cada puerta y ventana.

## 5. Editor

SVG con `viewBox` en metros (1 unidad = 1 m), lo que hace la exportación vectorial
directa. Interacciones:
- **Mover ambiente**: arrastre con *snap* a 5 cm e imán a bordes vecinos (15 cm).
  Si la posición produce solape, se intenta deslizar en un eje; si no, se detiene.
- **Mover muro**: se arrastra un borde del ambiente seleccionado; los ambientes
  al otro lado del mismo muro se ajustan (uno crece, el otro se reduce).
- **Inspector numérico**: nombre, x, y, ancho, largo. Si una edición causa solape,
  se marca en rojo y se ofrece "Redistribuir con estas medidas", que vuelve a
  correr el motor usando las medidas actuales como mínimos.
- Puertas/ventanas: agregar por muro, desplazar, ancho, sentido y bisagra.
- Mobiliario: agregar desde la biblioteca, arrastrar dentro del ambiente, rotar.
- Deshacer/rehacer (Ctrl+Z / Ctrl+Y), Supr para eliminar, flechas para ajustar.

Se eligió **SVG** frente a Canvas/Konva/Fabric: la geometría es rectilínea y de
pocos cientos de elementos, se exporta a SVG sin conversión y se inspecciona en el DOM.

## 6. Vista 2.5D

Proyección ortográfica (rotación en planta θ + elevación φ) de la misma geometría:
losa del lote, pisos por ambiente, muros extruidos desde los segmentos de
`walls.ts` con recortes de puertas y antepechos de ventanas, y mobiliario como
volúmenes. Orden de pintado por profundidad y sombreado por cara según una luz fija.
Corte de muros regulable ("maqueta cortada"). En la fase de render avanzado se
sustituye por React Three Fiber consumiendo exactamente los mismos datos.

## 7. Integración de IA

`ai/provider.ts` define `AIProvider.interpret(texto) → { site?, program }`.
- MVP: `LocalRuleProvider`, un intérprete en español basado en reglas
  ("casa de 8 x 16", "3 habitaciones", "2 baños", "cocina abierta", "garaje para 2").
- Siguiente fase: `LLMProvider` (Claude u otro) detrás de un backend propio que
  guarda la clave; debe devolver JSON validado contra el esquema de `Program`.

La IA **solo** produce `Site` y `Program`. El motor produce la geometría. Una vez
generada, la IA no puede modificar dimensiones: cualquier cambio posterior pasa
por el editor o por una nueva generación explícita.

## 8. Determinista vs IA

| Parte | Tipo |
|---|---|
| Interpretar texto libre → programa y restricciones | IA (con validación de esquema) |
| Sugerencias de estilo / nombres del proyecto (futuro) | IA |
| Distribución, muros, puertas, ventanas, cotas, áreas, validaciones | Determinista |
| Editor, 2.5D, lámina, exportación | Determinista |
| Render fotorrealista (fase futura) | IA de imagen *condicionada* por la geometría exportada |

## 9. MVP incluido

Terreno · programa por ambientes con medidas · preferencias de zonificación ·
generación · plano con muros, puertas, ventanas, mobiliario y 4 estilos ·
mover ambientes y muros · editar medidas · cotas automáticas · validación y cuadro
de áreas · vista 2.5D preliminar · lámina · guardar/abrir/duplicar/eliminar ·
exportar PNG, JPG, PDF, SVG y JSON · asistente de texto local.

Pendiente para fases siguientes: varios pisos (el campo existe; el MVP genera la
planta baja), unidades en pies, más estilos (premium, tropical, minimalista,
contemporáneo), render 3D con R3F, proveedor LLM real, cotas editables arrastrando.
