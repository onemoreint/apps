# Fórmulas del motor de cálculo

Todas las funciones devuelven `CalcResult<T>` = `{ value, formula, variables, assumptions, validations }`.
Unidades internas: W, Wh, V, A, m, kg, °C (`core/units.ts`). Redondeo solo al presentar (`core/precision.ts`).

El motor **no trae valores normativos por defecto**. Performance ratio, umbrales, rangos DC/AC, tasas de impuestos y factores de emisión llegan como parámetros desde la configuración. Si falta uno, el resultado lo declara con `REVIEW_REQUIRED` en lugar de suponer.

## Energía (`energy`)

| Cálculo | Fórmula |
|---|---|
| Promedio mensual | Σ kWh / n (meses **con dato**; los ausentes se excluyen, nunca cuentan como 0) |
| Promedio diario | Σ kWh / Σ días reales, o promedio mensual / (365/12) |
| Anual | promedio mensual × 12 (extrapolación declarada si hay < 12 meses) |
| Variación | (máx − mín) / promedio; coeficiente de variación = σ / promedio |
| Energía de una carga | Potencia (W) × Cantidad × Horas/día × Días/mes × Factor de uso ÷ 1000 |
| Declarado vs cargas | \|calculado − declarado\| / declarado > umbral configurable → advertencia |

## Dimensionamiento FV (`solar`)

```
potencia_sistema_kwp = (consumo_diario_kwh × cobertura) / (horas_solares_pico × performance_ratio)
paneles              = ⌈potencia_sistema_kwp × 1000 / potencia_panel_w⌉
kWp_instalado        = paneles × potencia_panel_w / 1000
producción_diaria    = kWp_instalado × HSP × PR
producción_mensual   = producción_diaria × 365/12
cobertura_alcanzada  = producción_diaria / consumo_diario
```

Recurso solar con método `ESTIMATE` → advertencia de resultado preliminar. Escenarios: `buildScenarios` los titula *ESCENARIOS TÉCNICOS COMPARABLES* y no marca ninguno como recomendado.

## Strings (`strings`)

```
X(T)         = X_STC × (1 + β/100 × (T − 25 °C))
Voc_frío     = Voc(Tmín_ambiente) × n            → debe ser ≤ V_DC_máx del inversor   (ERROR)
Vmp_STC      = Vmp × n                           → debe estar en [MPPT_mín, MPPT_máx]  (ERROR)
Vmp_caliente = Vmp(Tcelda_máx) × n               → < MPPT_mín                          (ADVERTENCIA)
Vmp_frío     = Vmp(Tmín) × n                     → > MPPT_máx                          (ADVERTENCIA)
I_op_MPPT    = Imp × strings                     → > I_entrada_máx                     (ADVERTENCIA: limitación)
I_cc_MPPT    = Isc × (1 + βIsc × (Tcelda−25)) × strings → > I_cc_máx                  (ERROR)
n_máx        = ⌊V_DC_máx / Voc_frío_panel⌋
n_mín        = ⌈MPPT_mín / Vmp_caliente_panel⌉
```

Sin coeficientes térmicos o temperaturas del sitio → `REVIEW_REQUIRED` y se usan valores STC. Sin coeficiente de Vmp se aproxima con el de Voc (supuesto declarado).

## Inversor (`inverter`)

`relación DC/AC = kWp_instalado × 1000 / P_AC_nominal`, validada contra la regla configurada (`dcAcRule`). Fases distintas al sitio → ERROR; voltaje distinto → revisión.

## Baterías (`battery`)

```
energía_requerida   = consumo_diario × autonomía_h / 24
capacidad_nominal   = energía_requerida / (DoD × eficiencia)
cantidad            = ⌈capacidad_nominal / capacidad_batería⌉
útil                = cantidad × capacidad × DoD
disponible          = útil × eficiencia
autonomía_lograda   = disponible / consumo_diario × 24
Ah                  = kWh × 1000 / V_nominal
```

## BOM (`bom`)

`cantidad = ⌈base(regla) × factor⌉`, con base ∈ {por panel, string, inversor, batería, kWp, metro DC, metro AC, fijo}. Las reglas las define cada empresa. Líneas sin precio o en otra moneda no suman y se marcan.

## Cotización con desglose (`quote`)

```
material_i        = ⌈base(regla_i) × factor_i⌉ × precio_i          (una línea por componente)
mano_de_obra_j    = base(regla_j) × factor_j × tarifa_j              (una línea por actividad)
transporte        = km × viajes × tarifa_km
ingeniería, otros = cantidad × valor                                 (líneas globales)
indirectos        = % × (materiales + mano de obra + transporte + ingeniería)
COSTO TOTAL       = Σ de las seis categorías → utilidad → impuestos → precio de venta
```

Bases posibles: por panel, string, inversor, batería, kWp, metro DC, metro AC o fija. Un material sin precio no suma y queda señalado.

## Costos y precio (`costs`, `pricing`)

```
COSTO TOTAL = MATERIALES + MANO DE OBRA + TRANSPORTE + INGENIERÍA + COSTOS INDIRECTOS + OTROS

MARKUP:        utilidad = costo × m
GROSS_MARGIN:  utilidad = costo / (1 − m) − costo
subtotal       = costo + utilidad
impuestos      = Σ subtotal × tasa_i
precio_final   = subtotal + impuestos
```

Se guardan `costo_total, margen, utilidad, impuestos, precio_final` y la versión redondeada según los decimales de la moneda.

## ROI (`roi`)

```
producción_n = P₁ × (1 − degradación)^(n−1)
tarifa_n     = T₁ × (1 + incremento)^(n−1)
ahorro_n     = producción_n × autoconsumo × tarifa_n
neto_n       = ahorro_n − mantenimiento_n − otros − reemplazos_n
recuperación_simple   = inversión / neto_1
recuperación_acumulada = año fraccional en que Σ neto − inversión ≥ 0
```

Horizontes 5/10/15/20 años (null si superan la vida útil). Sin descuento del dinero en el tiempo. Siempre incluye: *"Proyección financiera estimada… No constituye una garantía."*

## Moneda local (`currency`)

```
tasa_aplicada      = tasa_oficial (BCV) + recargo_por_dólar   (por defecto 200 Bs, configurable por empresa)
precio_final_Bs    = precio_final_USD × tasa_aplicada
```

La conversión se hace sobre el precio final en USD **sin redondear**; solo el resultado en Bs se redondea a los decimales del bolívar. Si la tasa no es del día de la cotización → advertencia. Si no hay tasa registrada → `REVIEW_REQUIRED` y no se muestra precio en Bs.

Colombia: `COP` con 0 decimales; el precio final se redondea a peso entero.

## CO₂ (`environmental`)

`CO₂ evitado = energía_anual × factor_emisión_red` — el factor se configura por país con fuente. Sin factor → `null` + "No hay información suficiente para determinar este valor."
