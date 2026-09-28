# SOLARPRO 360

## MÓDULO 0 — ARQUITECTURA, MODELO DE DATOS, SEGURIDAD Y REGLAS DEL SISTEMA

**Nombre de trabajo:** SOLARPRO 360
**Propuesta de valor:** Dimensiona · Costea · Cotiza · Instala
**Tipo de producto:** Plataforma web SaaS para prefactibilidad, dimensionamiento, cálculo de materiales, costos, presupuestos y propuestas técnico-comerciales de sistemas solares fotovoltaicos.

---

# 1. VISIÓN DEL PRODUCTO

SOLARPRO 360 será una plataforma profesional destinada inicialmente a:

* Instaladores solares.
* Ingenieros.
* Empresas de energía.
* Empresas comercializadoras.
* Vendedores y asesores comerciales.
* Profesionales independientes.

El sistema debe permitir pasar desde los datos iniciales del cliente hasta una propuesta técnico-comercial.

El flujo principal será:

**Empresa → Cliente → Proyecto → Diagnóstico → Dimensionamiento → Equipos → Materiales → Costos → Precio de venta → Propuesta PDF**

La plataforma debe diseñarse desde el comienzo como un sistema:

* Multiempresa.
* Multiusuario.
* Multipaís.
* Multimoneda.
* Configurable.
* Escalable.
* Seguro.
* Preparado para SaaS.

---

# 2. PRINCIPIO ARQUITECTÓNICO FUNDAMENTAL

No construir una simple calculadora solar.

Construir un sistema modular donde cada responsabilidad esté separada.

## Arquitectura conceptual

```text
USUARIO
   ↓
INTERFAZ WEB
   ↓
API / SERVICIOS
   ↓
MOTOR DE NEGOCIO
   ├── Diagnóstico energético
   ├── Motor fotovoltaico
   ├── Motor de baterías
   ├── Motor de materiales
   ├── Motor de costos
   ├── Motor de precios
   └── Motor de escenarios
   ↓
BASE DE DATOS
   ↓
DOCUMENTACIÓN / PDF
```

La IA será una capa adicional:

```text
MOTOR MATEMÁTICO
       ↓
RESULTADOS VERIFICADOS
       ↓
SOLARAI
       ↓
EXPLICACIÓN AL USUARIO
```

La IA NO será responsable de inventar cálculos.

---

# 3. MÓDULOS PRINCIPALES

La arquitectura inicial debe contemplar:

```text
SOLARPRO 360
│
├── Dashboard
├── Empresas
├── Usuarios
├── Clientes
├── Proyectos
├── Diagnóstico energético
├── Dimensionamiento
├── Catálogo
│   ├── Paneles
│   ├── Inversores
│   ├── Baterías
│   ├── Estructuras
│   ├── Cables
│   ├── Protecciones
│   └── Otros
├── Costos
├── Mano de obra
├── Presupuestos
├── Propuestas
├── PDF
├── Reportes
├── Normativa
├── Configuración
└── SolarAI
```

---

# 4. MODELO MULTIEMPRESA

Toda información comercial debe pertenecer a una empresa.

Ejemplo:

```text
Empresa A
 ├── Usuarios
 ├── Clientes
 ├── Proyectos
 ├── Catálogo
 ├── Costos
 ├── Mano de obra
 ├── Presupuestos
 └── Configuración

Empresa B
 ├── Usuarios
 ├── Clientes
 ├── Proyectos
 ├── Catálogo
 ├── Costos
 ├── Mano de obra
 ├── Presupuestos
 └── Configuración
```

Un usuario jamás debe poder acceder a información perteneciente a otra empresa salvo que tenga permisos explícitos de administración global.

El `company_id` debe formar parte de todas las entidades comerciales relevantes.

---

# 5. ROLES DE USUARIO

Implementar inicialmente:

## SUPER_ADMIN

Control total de la plataforma.

Puede:

* Crear empresas.
* Administrar países.
* Administrar normativa.
* Administrar catálogos globales.
* Administrar usuarios.
* Ver métricas generales.

## ADMIN_EMPRESA

Administrador de una empresa.

Puede:

* Configurar empresa.
* Crear usuarios.
* Administrar clientes.
* Administrar proyectos.
* Administrar catálogos.
* Configurar precios.
* Generar propuestas.

## INGENIERO

Puede:

* Crear proyectos.
* Ejecutar diagnósticos.
* Dimensionar sistemas.
* Revisar compatibilidad.
* Generar documentación técnica.

## VENDEDOR

Puede:

* Crear clientes.
* Crear diagnósticos preliminares.
* Crear escenarios.
* Generar presupuestos.
* Generar propuestas.

No debe modificar reglas técnicas críticas salvo autorización.

## CONSULTA

Solo lectura.

---

# 6. PAÍSES

La arquitectura debe comenzar preparada para:

```text
COLOMBIA
VENEZUELA
```

Pero NO codificar las reglas directamente dentro del motor.

Usar:

```text
country
   ↓
regulatory_profile
   ↓
technical_rules
   ↓
calculations
```

La incorporación de nuevos países debe poder realizarse posteriormente sin reconstruir el sistema.

---

# 7. IDENTIFICACIÓN DE EMPRESA

## Colombia

Campos:

* Razón social.
* Nombre comercial.
* NIT.
* Dirección.
* Ciudad.
* Teléfono.
* WhatsApp.
* Email.
* Sitio web.
* Representante.
* Logo.
* Firma.

## Venezuela

Campos:

* Razón social.
* Nombre comercial.
* RIF.
* Dirección.
* Estado.
* Ciudad.
* Teléfono.
* WhatsApp.
* Email.
* Logo.
* Representante.
* Firma.

---

# 8. CONFIGURACIÓN COMERCIAL

Cada empresa tendrá:

* Moneda.
* Impuestos.
* Margen predeterminado.
* Vigencia de cotización.
* Forma de pago.
* Garantía.
* Tiempo de entrega.
* Condiciones comerciales.
* Términos y condiciones.

Nunca colocar estos valores directamente en el código.

---

# 9. MODELO DE DATOS

Crear entidades como mínimo para:

```text
companies
users
roles
permissions
clients
projects
energy_diagnostics
energy_consumption
equipment_loads
solar_scenarios
solar_panels
inverters
batteries
structures
cables
protections
components
labor_items
costs
project_materials
budgets
budget_items
proposals
proposal_versions
countries
currencies
tax_rules
regulatory_profiles
technical_rules
audit_logs
```

---

# 10. CLIENTES

Un cliente debe contener:

* Nombre.
* Tipo de cliente.
* Documento.
* Teléfono.
* WhatsApp.
* Email.
* Dirección.
* Ciudad.
* País.
* Coordenadas.
* Observaciones.

Tipos:

```text
Residencial
Comercial
Industrial
Rural
Institucional
Otro
```

---

# 11. PROYECTOS

Cada proyecto tendrá:

* Cliente.
* Empresa.
* País.
* Ciudad.
* Ubicación.
* Coordenadas.
* Tipo de instalación.
* Estado.
* Responsable.
* Fecha de creación.
* Fecha de actualización.
* Notas.

Estados:

```text
BORRADOR
DIAGNÓSTICO
DIMENSIONAMIENTO
PRESUPUESTO
PROPUESTA
EN REVISIÓN
APROBADO
RECHAZADO
INSTALACIÓN
FINALIZADO
CANCELADO
```

---

# 12. DIAGNÓSTICO ENERGÉTICO

Debe aceptar dos métodos.

## Método A — Factura

Entrada:

* PDF.
* Fotografía.
* Imagen.

Datos a extraer cuando estén disponibles:

* Consumo mensual.
* Valor facturado.
* Periodo.
* Tarifa.
* Demanda.
* Histórico.
* Otros datos relevantes.

La extracción automática debe marcar cada dato como:

```text
EXTRAÍDO
CONFIRMADO
REVISAR
NO DISPONIBLE
```

Nunca asumir que un dato ausente es cero.

---

# 13. MÉTODO B — INTRODUCCIÓN MANUAL

Tabla:

```text
Mes | Consumo kWh
```

El sistema debe calcular:

* Promedio mensual.
* Promedio diario.
* Consumo anual.
* Mínimo mensual.
* Máximo mensual.
* Variación mensual.

---

# 14. INVENTARIO DE CARGAS

Cada carga tendrá:

```text
Nombre
Categoría
Potencia W
Cantidad
Horas/día
Días/mes
Factor de uso
```

Ejemplo:

```text
Aire acondicionado
Potencia: 1200 W
Cantidad: 2
Horas/día: 8
Días/mes: 30
```

Fórmula base:

```text
Energía mensual =
Potencia × Cantidad × Horas/día × Días/mes ÷ 1000
```

El sistema debe comparar:

```text
Consumo declarado
VS
Consumo calculado
```

Si existe una diferencia significativa, mostrar:

**"Existe una diferencia entre el consumo declarado y el consumo estimado mediante cargas. Revise los datos introducidos."**

El umbral de diferencia debe ser configurable.

---

# 15. RECURSO SOLAR

El proyecto debe almacenar:

* Latitud.
* Longitud.
* País.
* Ciudad.
* Horas solares pico.
* Radiación solar.
* Fuente del dato.
* Fecha de actualización.
* Método utilizado.

Nunca presentar un dato estimado como si fuera medición real.

---

# 16. MOTOR FOTOVOLTAICO

El motor debe trabajar con variables explícitas.

Variables mínimas:

```text
consumo_mensual_kwh
consumo_diario_kwh
horas_solares_pico
potencia_panel_w
performance_ratio
potencia_sistema_kwp
```

La fórmula utilizada debe quedar registrada.

El sistema debe mostrar al usuario:

* Variables utilizadas.
* Fórmula.
* Resultado.
* Supuestos.

---

# 17. PANEL SOLAR

Campos:

```text
Marca
Modelo
Potencia W
Voc
Vmp
Isc
Imp
Dimensiones
Peso
Tecnología
Eficiencia
Precio
Moneda
Garantía
País
Estado
```

Debe permitirse:

* Crear.
* Editar.
* Duplicar.
* Desactivar.

No eliminar físicamente productos utilizados en proyectos históricos.

---

# 18. INVERSORES

Campos:

```text
Marca
Modelo
Potencia nominal
Potencia máxima
MPPT
Voltaje mínimo MPPT
Voltaje máximo MPPT
Corriente máxima
Número de MPPT
Fases
Voltaje
Precio
Moneda
Garantía
País
Estado
```

El motor debe validar compatibilidad entre:

```text
Panel
↓
String
↓
MPPT
↓
Inversor
```

---

# 19. VALIDACIÓN DE STRINGS

El sistema debe calcular y verificar:

* Cantidad de paneles por string.
* Voltaje del string.
* Corriente.
* Voc.
* Vmp.
* Condiciones extremas cuando los datos disponibles permitan evaluarlas.
* Compatibilidad con rango MPPT.
* Compatibilidad con corriente máxima.
* Distribución de strings por MPPT.

Si una configuración no cumple una regla técnica configurada:

```text
ERROR TÉCNICO
```

Si es técnicamente posible pero requiere revisión:

```text
ADVERTENCIA
```

---

# 20. BATERÍAS

Campos:

```text
Marca
Modelo
Tecnología
Capacidad kWh
Voltaje
Capacidad Ah
DoD
Eficiencia
Ciclos
Potencia máxima
Precio
Moneda
Garantía
Estado
```

Cálculos:

```text
Capacidad útil
Autonomía
Cantidad de baterías
Energía disponible
```

Ejemplo conceptual:

```text
Capacidad nominal necesaria =
Energía requerida /
(DoD × eficiencia)
```

Las unidades y conversiones deben estar normalizadas.

---

# 21. BOM — BILL OF MATERIALS

El sistema debe generar automáticamente la lista de materiales.

Categorías:

```text
Paneles
Inversor
Baterías
Estructura
Rieles
Grapas
Tornillería
Cable DC
Cable AC
Conectores
Protecciones DC
Protecciones AC
Tableros
Breakers
DPS
Puesta a tierra
Canalizaciones
Tubería
Etiquetado
Medición
Comunicaciones
Monitoreo
Otros
```

Cada elemento debe tener:

```text
Producto
Cantidad
Unidad
Costo unitario
Costo total
Proveedor
Observación
```

---

# 22. MANO DE OBRA

Debe ser configurable por empresa.

Ejemplos:

```text
Instalación de panel
Instalación de estructura
Instalación de inversor
Instalación de batería
Cableado DC
Cableado AC
Instalación de tablero
Puesta a tierra
Configuración
Ingeniería
Transporte
```

Unidades:

```text
Unidad
Metro
Hora
Global
Km
```

---

# 23. ESTRUCTURA DE COSTOS

Separar obligatoriamente:

```text
MATERIALES
+
MANO DE OBRA
+
TRANSPORTE
+
INGENIERÍA
+
COSTOS INDIRECTOS
+
OTROS
```

Después:

```text
COSTO TOTAL
+
UTILIDAD
+
IMPUESTOS
=
PRECIO DE VENTA
```

Nunca confundir costo con precio de venta.

---

# 24. UTILIDAD

La empresa puede definir:

```text
Margen predeterminado
```

Pero cada presupuesto debe permitir modificarlo.

Guardar siempre:

```text
costo_total
margen
utilidad
impuestos
precio_final
```

---

# 25. ESCENARIOS

El sistema debe permitir crear varios escenarios técnicos.

Ejemplo:

```text
ESCENARIO A
Cobertura aproximada 50 %

ESCENARIO B
Cobertura aproximada 80 %

ESCENARIO C
Cobertura aproximada 100 % + almacenamiento
```

Estos escenarios deben presentarse como:

**ESCENARIOS TÉCNICOS COMPARABLES**

No etiquetarlos automáticamente como "mejor", "recomendado" o "ideal" sin que exista una regla técnica explícita y verificable.

Cada escenario debe mostrar:

* Potencia instalada.
* Paneles.
* Inversor.
* Baterías.
* Producción estimada.
* Cobertura.
* Inversión.
* Ahorro estimado.
* Recuperación simple estimada.
* Vida útil asumida.
* CO₂ evitado estimado.

---

# 26. ROI / RECUPERACIÓN

El sistema debe permitir calcular:

```text
Inversión
Ahorro mensual
Ahorro anual
Recuperación simple
Ahorro acumulado
```

Debe permitir visualizar:

```text
5 años
10 años
15 años
20 años
```

Los resultados deben incluir los supuestos utilizados.

No presentar una proyección financiera como garantía.

Variables configurables:

* Tarifa.
* Incremento tarifario.
* Degradación.
* Producción.
* Mantenimiento.
* Costos adicionales.
* Financiación.
* Vida útil.
* Reemplazos.

---

# 27. NORMATIVA

La normativa debe ser un módulo independiente.

Arquitectura:

```text
COUNTRY
   ↓
REGULATORY PROFILE
   ↓
VERSION
   ↓
TECHNICAL RULES
   ↓
VALIDATIONS
```

Nunca mezclar automáticamente reglas de Colombia y Venezuela.

---

# 28. COLOMBIA

El sistema debe permitir configurar:

```text
País: Colombia
Identificación: NIT
```

El módulo normativo debe contemplar el marco aplicable configurado por versión.

Importante:

La aplicación NO debe afirmar:

> "El proyecto cumple RETIE"

como una conclusión automática.

Debe utilizar expresiones como:

> "Criterio técnico verificado"

> "Advertencia normativa"

> "Requiere revisión profesional"

> "Documentación requerida según configuración normativa"

La validación y certificación correspondiente seguirá dependiendo de los profesionales y organismos competentes.

---

# 29. VENEZUELA

Crear un perfil normativo independiente.

```text
País: Venezuela
Identificación: RIF
```

No reutilizar automáticamente las reglas colombianas.

---

# 30. CONTROL DE VERSIONES NORMATIVO

Cada normativa debe tener:

```text
País
Nombre
Versión
Fecha de vigencia
Fecha de publicación
Estado
Fuente
Descripción
Reglas
```

Estados:

```text
BORRADOR
VIGENTE
REEMPLAZADA
ARCHIVADA
```

Los proyectos históricos deben conservar la versión normativa utilizada durante su elaboración.

---

# 31. AUDITORÍA

Registrar:

```text
Usuario
Empresa
Acción
Entidad
ID entidad
Fecha
Hora
IP cuando corresponda
Valor anterior
Valor nuevo
```

Acciones:

```text
CREATE
UPDATE
DELETE
LOGIN
LOGOUT
EXPORT
GENERATE_PDF
APPROVE
REJECT
```

---

# 32. SEGURIDAD

Implementar:

* Autenticación segura.
* Control de sesiones.
* Autorización por roles.
* Aislamiento por empresa.
* Validación de entrada.
* Protección de API.
* Protección contra acceso horizontal.
* Cifrado de información sensible cuando corresponda.
* Backups.
* Logs.
* Rate limiting.
* Gestión segura de secretos.
* Variables de entorno.
* No almacenar contraseñas en texto plano.

---

# 33. VERSIONADO DE PROYECTOS

Un presupuesto o propuesta no debe cambiar silenciosamente después de haber sido generado.

Crear:

```text
Proposal v1
Proposal v2
Proposal v3
```

Cada versión debe conservar:

* Configuración.
* Equipos.
* Precios.
* Costos.
* Impuestos.
* Margen.
* Fecha.
* Usuario.
* Supuestos.

---

# 34. PDF

La propuesta debe generar un documento profesional.

Contenido mínimo:

```text
LOGO
EMPRESA
DATOS EMPRESA

CLIENTE
PROYECTO
UBICACIÓN

DIAGNÓSTICO

RESUMEN DEL SISTEMA

POTENCIA INSTALADA
PANELES
INVERSOR
BATERÍAS

PRODUCCIÓN ESTIMADA
COBERTURA

MATERIALES
INGENIERÍA
INSTALACIÓN
TRANSPORTE
OTROS

SUBTOTAL
IMPUESTOS
TOTAL

GARANTÍAS
CONDICIONES
VIGENCIA

FIRMA
```

---

# 35. CONFIGURACIÓN DE DOCUMENTOS

Cada empresa podrá configurar:

* Logo.
* Firma.
* Encabezado.
* Pie de página.
* Términos.
* Condiciones.
* Datos bancarios.
* Garantías.
* Vigencia.

---

# 36. MODO VENDEDOR

Crear una interfaz simplificada para uso desde teléfono.

Entrada mínima:

```text
Consumo mensual
Ciudad
Tipo de proyecto
Objetivo
```

Resultado:

```text
Diagnóstico preliminar

Sistema estimado
Potencia
Paneles
Inversor
Producción
Cobertura
Inversión estimada
Ahorro estimado
```

Botón:

# GENERAR COTIZACIÓN

La cotización preliminar debe identificarse claramente como preliminar cuando todavía no exista información técnica suficiente.

---

# 37. SOLARAI

SolarAI será una capa de explicación.

Ejemplos:

> ¿Por qué necesito 12 paneles?

> ¿Qué pasa si agrego otro aire acondicionado?

> ¿Cuánto cambia el presupuesto si agrego baterías?

> ¿Qué ocurre si quiero 24 horas de autonomía?

> ¿Cuál es la diferencia entre estos escenarios?

La IA debe consultar los datos y resultados del proyecto.

No debe modificar silenciosamente los cálculos.

Arquitectura:

```text
DATOS
 ↓
MOTOR MATEMÁTICO
 ↓
RESULTADOS
 ↓
SOLARAI
 ↓
EXPLICACIÓN
```

No:

```text
SOLARAI
 ↓
CÁLCULO
```

---

# 38. REGLA DE TRANSPARENCIA DE LA IA

Cuando SolarAI responda, debe poder indicar:

```text
Datos utilizados
Supuestos
Resultado
Advertencias
```

Si no existe suficiente información:

> "No hay información suficiente para determinar este valor."

Nunca inventar datos.

---

# 39. MOTOR DE CÁLCULO

Crear una capa independiente:

```text
/calculation-engine
```

Separar:

```text
energy
solar
strings
inverter
battery
bom
costs
pricing
roi
environmental
```

Los cálculos deben ser testeables sin depender de la interfaz.

---

# 40. UNIDADES

Establecer un sistema interno normalizado.

Ejemplos:

```text
Potencia → W / kW
Energía → Wh / kWh
Voltaje → V
Corriente → A
Distancia → m / km
Peso → kg
Precio → moneda configurada
```

Las conversiones deben realizarse en una capa central.

No repetir conversiones manualmente en diferentes módulos.

---

# 41. PRECISIÓN

Definir reglas de redondeo.

Por ejemplo:

* Cálculos internos con precisión completa.
* Resultados técnicos mostrados con precisión configurable.
* Moneda con número de decimales definido por país.
* Nunca redondear prematuramente antes de realizar cálculos posteriores.

---

# 42. ESTADOS DE VALIDACIÓN

Cada cálculo importante puede tener:

```text
OK
WARNING
ERROR
REVIEW_REQUIRED
```

Ejemplo:

```text
Inversor
✓ Potencia compatible

Strings
✓ Voltaje compatible

Corriente
⚠ Requiere revisión

Normativa
⚠ Revisión profesional requerida
```

---

# 43. BASE DE DATOS DE PRODUCTOS

Los productos deben poder tener:

```text
activo
inactivo
```

No borrar productos que hayan sido utilizados históricamente.

Si cambia un precio, el proyecto histórico debe conservar el precio utilizado en ese momento.

---

# 44. PROVEEDORES

Preparar arquitectura para:

```text
Proveedor
Contacto
País
Moneda
Producto
Costo
Fecha
Disponibilidad
```

Esto permitirá posteriormente construir inventario y compras.

---

# 45. MODO OFFLINE

La arquitectura debe dejar preparado el sistema para funcionamiento parcial offline.

Prioridad futura:

* Consulta de catálogos.
* Clientes.
* Diagnósticos.
* Captura de datos.
* Cotizaciones preliminares.

Cuando vuelva Internet:

```text
LOCAL
 ↓
SINCRONIZACIÓN
 ↓
SERVIDOR
```

Resolver conflictos mediante versionado.

---

# 46. API

Crear API modular.

Ejemplo conceptual:

```text
/api/auth
/api/companies
/api/users
/api/clients
/api/projects
/api/diagnostics
/api/solar
/api/products
/api/panels
/api/inverters
/api/batteries
/api/bom
/api/costs
/api/budgets
/api/proposals
/api/reports
/api/regulations
/api/ai
```

---

# 47. ESTRUCTURA DE CARPETAS

Utilizar una arquitectura clara y modular.

Ejemplo:

```text
solarpro360/
│
├── frontend/
│
├── backend/
│   ├── auth/
│   ├── companies/
│   ├── users/
│   ├── clients/
│   ├── projects/
│   ├── diagnostics/
│   ├── calculations/
│   │   ├── energy/
│   │   ├── solar/
│   │   ├── inverter/
│   │   ├── battery/
│   │   ├── bom/
│   │   ├── costs/
│   │   └── roi/
│   │
│   ├── catalog/
│   ├── budgets/
│   ├── proposals/
│   ├── regulations/
│   ├── reports/
│   └── ai/
│
├── database/
│
├── tests/
│
├── docs/
│
└── infrastructure/
```

---

# 48. TESTS

Antes de avanzar entre módulos, Claude debe crear pruebas.

Mínimo:

```text
Unit tests
Integration tests
Calculation tests
Authorization tests
Multi-company isolation tests
API tests
PDF generation tests
```

Especialmente importante:

### Tests matemáticos

Probar:

* Consumo.
* Dimensionamiento.
* Strings.
* Inversores.
* Baterías.
* BOM.
* Costos.
* Margen.
* Impuestos.
* ROI.

---

# 49. CRITERIOS DE ACEPTACIÓN DEL MÓDULO 0

El Módulo 0 se considera completado solamente cuando:

### Arquitectura

* Existe arquitectura modular.
* Existe separación frontend/backend.
* Existe motor matemático independiente.

### Seguridad

* Existe autenticación.
* Existen roles.
* Existe aislamiento por empresa.

### Multiempresa

* Una empresa no puede acceder a otra.
* Los datos tienen asociación empresarial.

### Países

* Colombia existe como perfil.
* Venezuela existe como perfil.
* Las reglas son independientes.

### Catálogo

* Los productos son configurables.
* Los precios no están hardcodeados.

### Normativa

* Existe control de versiones.
* No se afirma automáticamente cumplimiento normativo.

### Cálculos

* Las fórmulas están documentadas.
* Las unidades están normalizadas.
* Los cálculos tienen pruebas.

### Auditoría

* Se registran cambios relevantes.

---

# 50. REGLA PRINCIPAL PARA CLAUDE

NO desarrollar todo el sistema de una sola vez.

Trabajar por módulos.

Antes de implementar cada módulo:

1. Explicar qué se va a construir.
2. Identificar dependencias.
3. Crear/modificar modelo de datos.
4. Implementar backend.
5. Implementar frontend.
6. Crear pruebas.
7. Ejecutar pruebas.
8. Corregir errores.
9. Documentar.
10. Esperar aprobación antes de avanzar al siguiente módulo cuando el usuario lo solicite.

No eliminar funcionalidades existentes para solucionar errores sin explicar primero el impacto.

No reemplazar arquitectura funcional por una solución temporal.

No introducir datos ficticios como datos reales.

No inventar reglas técnicas o normativas.

---

# 51. ORDEN DE DESARROLLO

El proyecto debe avanzar en este orden:

```text
MÓDULO 0
Arquitectura + seguridad + modelo de datos

↓

MÓDULO 1
Empresa + configuración Colombia/Venezuela

↓

MÓDULO 2
Clientes + proyectos

↓

MÓDULO 3
Diagnóstico energético

↓

MÓDULO 4
Dimensionamiento solar

↓

MÓDULO 5
Catálogo + costos + mano de obra

↓

MÓDULO 6
Presupuesto

↓

MÓDULO 7
Propuesta PDF

↓

MÓDULO 8
Dashboard + usuarios + SaaS

↓

MÓDULO 9
SolarAI

↓

MÓDULO 10
Multiusuario avanzado

↓

MÓDULO 11
Inventario

↓

MÓDULO 12
CRM

↓

MÓDULO 13
Financiación

↓

MÓDULO 14
Portal del cliente
```

---

# 52. PRINCIPIO DE ESCALABILIDAD

El sistema debe poder evolucionar desde:

```text
Aplicación web
```

hasta:

```text
SaaS multiempresa
```

sin reconstruir el núcleo.

Preparar desde el inicio:

* Multi-tenant.
* Roles.
* Permisos.
* Auditoría.
* Versionado.
* API.
* Catálogos configurables.
* Configuración por país.
* Configuración por empresa.
* Motor de cálculos independiente.

---

# 53. RESULTADO ESPERADO

Al finalizar este Módulo 0, Claude NO debe haber construido todavía toda la aplicación.

Debe haber establecido:

```text
ARQUITECTURA
+
MODELO DE DATOS
+
SEGURIDAD
+
ROLES
+
MULTIEMPRESA
+
MULTIPAÍS
+
MOTOR DE CÁLCULO
+
ESTRUCTURA NORMATIVA
+
ESTRUCTURA DE CATÁLOGOS
+
ESTRUCTURA DE COSTOS
+
ESTRUCTURA DE DOCUMENTOS
+
TESTING
```

El objetivo es que los módulos posteriores se construyan sobre una base sólida y no haya que rehacer el proyecto cuando SOLARPRO 360 evolucione hacia un SaaS comercial.

# FIN DEL MÓDULO 0
