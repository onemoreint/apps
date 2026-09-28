# Lista de precios de referencia

Consultada el **28 de septiembre de 2026**. Es la lista que trae el cotizador de `demo/`. En la plataforma, cada empresa carga su propio catálogo (Módulo 5); estos valores sirven como punto de partida y deben revisarse antes de cotizar.

Los precios son de tienda y **incluyen IVA cuando la tienda lo indica**, por eso el cotizador usa 0 % de impuesto por defecto.

## Colombia (COP)

### Materiales

| Componente | Precio | Cómo se cuenta | Fuente |
|---|---:|---|---|
| Panel bifacial 620 W N-Type Tensite | 558.000 | por panel | [Autosolar](https://autosolar.co/paneles-solares) |
| Estructura cubierta metálica KH915 (rieles y grapas incluidos) | 98.442 | por panel (kit de 4 a 393.769) | [Autosolar](https://autosolar.co/estructura-cubierta-metalica/estructura-cubierta-metalica-4-paneles-kh915) |
| Batería litio Tensite TS-L5000/LV 4,8 kWh | 5.052.690 | por batería | [Autosolar](https://autosolar.co/baterias-de-litio-48v) |
| Cable solar 6 mm² | 8.500 / m | 2 conductores por metro de recorrido DC | [Ineldec](https://www.ineldec.com.co/MCO-858515413-cable-solar-6mm-6mm2-fotovoltaico-procables-metro-_JM) |
| Cable N°10 AWG Centelsa | 4.099 / m | 3 conductores por metro de recorrido AC (rollo 100 m a 409.900) | [Homecenter](https://www.homecenter.com.co/homecenter-co/product/274228/cable-n10-100m-blanco-centelsa/274228/) |
| Conectores MC4 1500 V (par) | 5.760 | 2 pares por string | [Emergente](https://www.emergente.com.co/producto/conector-mc4-para-paneles-solares-1500v-con-retie-cable-4-6mm) |
| Breaker DC 2×16 A 800 V Suntree | 103.229 | por string | [Autosolar](https://autosolar.co/breakers-dc) |
| DPS DC 1000 V tipo 2 Moreday | 145.920 | 1 por sistema | [Emergente](https://www.emergente.com.co/producto/dps-3p-moreday-1000vdc-tipo-2) |
| Breaker AC enchufable 2×40 A | 35.000 | 1 por sistema | [Ineldec](https://www.ineldec.com.co/MCO-864498419-breaker-electrico-enchufable-2x40-amp-breaker-de-luz-_JM) |
| Tablero 12 puestos riel DIN IP65 | 140.160 | 1 por sistema | [Emergente](https://www.emergente.com.co/producto/caja-de-breaker-de-12-circuitos-riel-din-moreday-ip65) |
| Kit varilla de cobre 2,4 m × 5/8 con grapa | 179.900 | 1 por sistema | [Homecenter](https://www.homecenter.com.co/homecenter-co/product/234576/kit-varilla-puesta-tierra-cobre-24m-x-5-8-grapa/234576/) |
| Tubo EMT 3/4" | 12.530 / m | por metro de recorrido AC (tubo de 3 m a 37.590) | [Easy](https://www.easy.com.co/tubo-conduit-emt-34-pg-x-3mt/p) |
| Etiquetado y señalización | 60.000 | global | Estimado |

**DPS AC:** no se encontró precio publicado; no está incluido.

### Inversores on-grid Growatt

| Modelo | Potencia | Precio | Fuente |
|---|---:|---:|---|
| MIN 2500TL-X2 | 2,5 kW | 2.295.095 | [Autosolar](https://autosolar.co/inversores-on-grid/growatt) |
| MIN 4200TL-X2 | 4,2 kW | 2.166.892 | Autosolar |
| MIN 6000TL-X2 | 6 kW | 2.230.769 | Autosolar |
| MIN 10000TL-X2 | 10 kW | 3.916.831 | Autosolar |

El cotizador elige el inversor más pequeño de la lista cuya potencia cubra `kWp instalado ÷ relación DC/AC máxima`. La relación es un criterio configurable (1,2 por defecto), no una regla normativa.

### Mano de obra, transporte, ingeniería y trámites

| Concepto | Valor | Fuente |
|---|---:|---|
| Instalación de paneles y estructura | 120.000 / panel | Estimado |
| Instalación de inversor | 350.000 / und | Estimado |
| Instalación de baterías | 150.000 / und | Estimado |
| Cableado DC y AC | 6.000 / m de recorrido | Estimado |
| Puesta a tierra | 250.000 global | Estimado |
| Configuración y puesta en marcha | 400.000 global | Estimado |
| Transporte | 2.500 / km, 2 viajes | Estimado |
| Diseño, planos y memoria de cálculo | 800.000 global | Estimado |
| Legalización con el operador de red y certificación RETIE | 1.200.000 global | Dentro del 5–10 % que reporta [OPS Colombia](https://www.opscolombia.com/blog/cuanto-cuesta-realmente-un-sistema-solar-en-colombia) |

La mano de obra estimada se calibró para quedar dentro del 15–20 % del costo del proyecto que reporta OPS Colombia.

### Referencias de control

- Costo de mercado de un sistema residencial conectado a red: **3,5 a 5 millones COP por kWp** ([OPS Colombia](https://www.opscolombia.com/blog/cuanto-cuesta-realmente-un-sistema-solar-en-colombia)). Con esta lista, un sistema de 4,34 kWp sale en unos 4,05 millones por kWp.
- Tarifa EPM residencial estrato 4, agosto 2026: **960 COP/kWh** ([OPS Colombia](https://www.opscolombia.com/tarifas-energia)).

## Venezuela (USD → Bs)

- **Precios en USD** = lista colombiana ÷ TRM. TRM del 28-sep-2026: **3.306,86 COP/USD** ([Noticias Caracol](https://www.noticiascaracol.com/economia/dolar-hoy-28-de-septiembre-de-2026-como-esta-la-trm-lunes-en-colombia-so35)).
- **Precio final en bolívares** = precio USD × (tasa BCV + 200). Tasa BCV del 28-sep-2026: **857,0058 Bs/USD** ([Finanzas Digital](https://finanzasdigital.com/tasa-de-cambio-bcv-28-septiembre-2026/)); tasa aplicada 1.057,01 Bs/USD.
- La conversión **no incluye fletes ni aranceles** de importación: el precio real puesto en Venezuela probablemente sea mayor.
- La tarifa eléctrica de Venezuela del cotizador (0,05 USD/kWh) es de ejemplo; debe usarse la del cliente.

## Cómo actualizar

1. Editar las listas `CO` (materiales, inversores, mano de obra, transporte, ingeniería, otros) y las constantes `TRM_DEFAULT` y `BCV_DEFAULT` en `demo/cotizador.src.html`.
2. Ejecutar `demo/build.sh`.
3. Actualizar la fecha y las fuentes de este archivo.
