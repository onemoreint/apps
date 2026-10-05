# 🇨🇦 Canada Family Relocation Job Hunter

Microapp de un solo archivo (`index.html`) para encontrar, analizar y comparar empleos en Canadá que ofrezcan **contratación internacional + reubicación familiar**. No necesita backend y funciona en GitHub Pages. Los datos se guardan en el navegador (localStorage).

---

## 1. Ejecutarlo

- **Opción rápida:** haz doble clic en `index.html`. Se abre en cualquier navegador moderno (Chrome, Edge, Safari o Firefox).
- **Opción servidor local** (recomendada para notificaciones):
  ```bash
  cd carpeta-del-proyecto
  python3 -m http.server 8080
  # abrir http://localhost:8080
  ```

## 2. Publicarlo en GitHub Pages

1. Crea un repositorio, por ejemplo `canada-job-hunter`, o usa una carpeta de `onemoreint/apps`.
2. Sube `index.html` (y este README) a la raíz o a una carpeta.
3. Ve a **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y luego **Save**.
4. En 1 o 2 minutos estará en `https://TU-USUARIO.github.io/canada-job-hunter/`.

> Cada navegador o dispositivo guarda sus propios datos. Para pasar tus ofertas del PC al teléfono usa **All → Export backup (JSON)** y luego **Import → Restore JSON backup**.

---

## 3. Cómo funciona el buscador

**Modo real: IMPORT MODE.** Job Bank, Guichet-Emplois e Indeed no permiten que otra página web lea sus resultados desde el navegador (CORS, anti-bot y términos de uso). Al abrir, la app **prueba de verdad** si puede leer Job Bank:
- Si puede, muestra **LIVE SEARCH AVAILABLE**.
- Si no, muestra **IMPORT MODE**, que es lo normal.

La app **nunca simula resultados**.

Flujo de trabajo:
1. **🔎 Scan:** la app genera búsquedas listas para las 3 fuentes con los 14 perfiles objetivo (business development, sales, training, communications, CRM, AI…). En Indeed les añade "relocation assistance", "LMIA" y "visa sponsorship". Los enlaces que ya abriste quedan marcados.
2. En Job Bank o Guichet-Emplois aplica el filtro de ofertas abiertas a **candidatos de fuera de Canadá** y copia **todo** el texto de cada oferta prometedora. Incluye siempre la sección *"Who can apply to this job?"*, porque decide si te contratan desde Colombia.
3. **📥 Import:** pega el texto (varias ofertas separadas por una línea `---`), un CSV o una URL. El motor extrae título, empresa, ubicación y salario, detecta beneficios y calcula los puntajes al instante.
4. La misma oferta en varias fuentes se fusiona sola y muestra **FOUND ON N SOURCES**.

### Regla de veracidad (el corazón del motor)
Cada beneficio queda en uno de cuatro estados:
- 🟢 **Confirmed:** una frase explícita lo dice.
- 🟡 **Partial:** se menciona en términos generales.
- ⚪ **Not confirmed:** no se menciona.
- 🔴 **Not offered:** la oferta lo niega expresamente.

Cada 🟢, 🟡 y 🔴 muestra **la frase exacta** que lo justifica.

Reglas que nunca se rompen:
- "international candidates" **no** se interpreta como "flight paid".
- "LMIA" **no** se interpreta como "relocation package".
- "visa sponsorship" **no** se interpreta como "family relocation".
- "employer-sponsored" **no** se interpreta como "housing".
- "Must be eligible to work in Canada" o "does not provide immigration/work permit sponsorship" marcan **International = 🔴 NO**, y la oferta sale del ranking.
- "Domestic relocation program" se marca como **posible reubicación solo dentro de Canadá**.

---

## 4. Sistema de scoring

| Puntaje | Componentes |
|---|---|
| **Relocation /100** | ✈️ Transporte 20 · 🏠 Vivienda 20 · 💰 Gastos de llegada 15 · 🛂 Inmigración 15 · 👨‍👩‍👧 Familia 15 · 💼 Duración ≥12 meses 10 · 💵 Salario 5. Un 🟢 da el puntaje completo y un 🟡 da cerca de la mitad. |
| **Immigration Opportunity /100** | Candidatos internacionales 20 · LMIA 20 · Work permit 15 · ≥12 meses 10 · Permanente 10 · Provincia identificada 5 · Ocupación calificada 10 · Familia 10. Máximo 10 si la oferta no acepta candidatos del exterior. Se presenta como *Potential immigration pathway*, nunca como garantía. |
| **Worker Mobility /20** | Distingue un permiso *employer-specific* (lo normal con LMIA) de un *open work permit*. Siempre incluye la advertencia oficial de movilidad. |
| **Family Relocation /100** | Apoyo familiar explícito 30 · Vuelos familiares 20 · Vivienda 15 · Settlement 10 · Beneficios familiares 5 · Estabilidad 10 · Permiso de trabajo 10. |
| **Professional Fit /100** | 60% familia del título (BD, ventas, training, comunicación, IA, CRM…) + 40% **Transferable Skills Score** (20 competencias detectadas en el texto). |
| **🍁 CANADA FAMILY SCORE /100** | Fit 20% · Salario 15% · Contratación internacional 15% · Relocation 20% · Inmigración 15% · Duración 5% · Familia 5% · Confiabilidad del empleador 5%. Si el riesgo de estafa es MEDIUM se multiplica por ×0.85, y si es HIGH por ×0.3. |

**Paquete de reubicación:**
- **GOLD:** 4 o más elementos confirmados, incluido vuelo o vivienda.
- **SILVER:** vuelo + (vivienda o dinero), o dinero + vivienda.
- **BRONZE:** hay algún apoyo de relocation, viaje o inmigración, pero el paquete no está claro.
- **UNKNOWN:** no hay información suficiente.
- **NONE:** la oferta dice expresamente "no relocation".

**Pestañas:**
- **Top:** hasta 50 ofertas, excluidas las cerradas a candidatos del exterior, las NONE, las de solo reubicación doméstica, las de estafa HIGH y las cortas o estacionales (salvo **SPECIAL CASE**).
- **Best for José:** el top 10 por combinación de factores.
- **Full Relocation:** ofertas con evidencia de relocation + viaje + alojamiento + inmigración.
- **Dream:** solo evidencia fuerte (🟢).

**Salario:** si solo hay tarifa por hora, se calcula 40 h × 52 semanas y se muestra como *Estimated annual gross income*.

**Otros detectores:**
- Cláusula de **reembolso**: muestra la frase, el monto y el período, o *Not specified — ask employer*.
- **Estafa**: cobros por LMIA, visa u oferta; Western Union o gift cards; "guaranteed visa"; correo Gmail; contacto solo por WhatsApp; salario irreal.
- **Verificación del empleador**: checklist manual de 4 puntos con enlaces a Google, LinkedIn y el registro federal de corporaciones.

---

## 5. Actualizar las ofertas

- **🔎 Scan → 🔄 REFRESH SEARCH** inicia una nueva sesión: desmarca los enlaces y registra la fecha en *Last scan*.
- La etiqueta **NEW** solo aparece en ofertas añadidas en los últimos 7 días que fueron revisadas en las últimas 2 semanas. Si pasan más de 14 días, aparece **Re-verify**. Usa el botón *Mark re-verified today* después de comprobar que sigue abierta.
- **🔔 Alerts:** al importar una oferta que cumple tus condiciones (relocation, airfare, housing, LMIA, inmigración, familia, permanente o salario mínimo) recibes un aviso y una notificación del navegador si la activaste.
- **Automatización semanal (opcional):** Claude puede ejecutar la búsqueda cada semana y entregarte un CSV listo para *Import → CSV*.

## 6. Limitaciones de scraping

- **Job Bank y Guichet-Emplois:** sin API pública abierta, con bloqueo a lecturas automáticas desde otros orígenes.
- **Indeed:** anti-bot y términos de uso que prohíben el scraping. Además, su etiqueta *Relocation assistance* suele referirse a mudanzas **dentro** de Canadá.
- **Proxy opcional:** en *Profile → Advanced* puedes poner tu propio proxy (por ejemplo, un Cloudflare Worker) para que *Import a URL* lea páginas. Respeta los términos de cada sitio y no uses proxies públicos.
- El motor lee texto en inglés y algo de francés. Una oferta mal copiada (sin la sección de beneficios) aparecerá con más ⚪.

## 7. Agregar nuevas fuentes

**🔎 Scan → ➕ Add a new source**: escribe el nombre y una URL de búsqueda con `{q}` donde van las palabras clave. Ejemplos:
- LinkedIn: `https://www.linkedin.com/jobs/search/?keywords={q}&location=Canada`
- Glassdoor, Workopolis, Eluta, portales provinciales (WorkBC, Alberta Supports), páginas de carreras de empleadores grandes.

Marca *"Add relocation / LMIA terms"* para que cada búsqueda incluya esos términos. En código, las fuentes base están en el arreglo `SOURCES`.

## 8. Mejoras futuras

1. Worker en Cloudflare (gratis) con búsqueda programada en Job Bank y feed JSON propio.
2. Sincronización entre dispositivos (Supabase o Firebase) en lugar de backup manual.
3. Interfaz bilingüe ES/EN con selector.
4. Análisis de ofertas en francés más completo, pensando en Quebec y programas francófonos (Francophone Mobility, Atlantic, PNP).
5. Mapeo NOC/TEER automático por título y su efecto en el permiso del cónyuge, con enlace a la regla vigente de IRCC.
6. Exportar CV y carta en PDF/DOCX con formato canadiense.
7. Tablero Kanban de postulaciones (new → applied → interview → offer).
8. Estimador de costo de vida por ciudad y salario neto después de impuestos.
9. Integración con un LLM para resumir la oferta y redactar respuestas al reclutador.

---

## 9. Prueba de funcionamiento (realizada)

Se probó el motor en Node con ofertas reales y casos límite, y la interfaz en Chromium headless a 390 px (móvil) y 1280 px (escritorio), sin errores de JavaScript ni scroll horizontal.

| Caso | Resultado del motor |
|---|---|
| Muestra ficticia completa (vuelo familiar, 30 días de hotel, $3,000, LMIA aprobada, cláusula de reembolso) | GOLD · Relocation 100 · Family 90 · Immigration 100 · detecta "30 days", "CAD $3,000" y la cláusula. **Etiquetada DEMO y excluida del ranking.** |
| Vale, Powerline Technician (texto real de Indeed: "does not provide immigration, work permit… sponsorship") | International 🔴 · excluida del Top |
| Rio Tinto (real: "Domestic relocation program if eligible") | Marcada como reubicación doméstica · excluida del Top |
| Job Bank con LMIA solicitada y abierta a candidatos de fuera de Canadá | International 🟢 · LMIA 🟡 · sin falsos positivos de vuelo o vivienda |
| Oferta fraudulenta (cobro de LMIA por Western Union, Gmail, WhatsApp) | Scam HIGH · excluida |
| Estacional con LMIA, vuelo y vivienda | SPECIAL CASE |
| "No relocation… must be legally eligible to work in Canada" | NONE · International 🔴 |
| Import, detalle, generadores (preguntas, CV, carta), las 10 pestañas | OK en móvil y escritorio |

> La app no garantiza permisos, LMIA ni residencia. Verifica siempre la oferta original y las reglas vigentes en canada.ca (IRCC). Nunca pagues por una oferta de empleo o una LMIA.
