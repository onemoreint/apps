# PriceMatch AI — Fase 2

**Encuentra exactamente el mismo producto al mejor precio en SHEIN, AliExpress y Temu**

Desarrollado por **José Lugo** · +57 312 638 7467

## Descripción

PriceMatch AI es una plataforma inteligente de comparación de precios que:

1. **Extrae información** completa de un producto desde cualquier URL
2. **Identifica el producto** creando una huella digital única
3. **Busca en múltiples marketplaces** (SHEIN, AliExpress, Temu)
4. **Verifica coincidencias exactas** usando un motor de matching avanzado
5. **Compara precios totales** incluyendo envío
6. **Muestra el mejor precio** solo si el producto es verificablemente igual

## Arquitectura

```
pricematch-ai/
├── frontend/
│   └── index.html                 # Aplicación web responsive
│
├── backend/
│   ├── server.js                  # Servidor Express principal
│   │
│   ├── config/
│   │   └── env.js                 # Configuración centralizada
│   │
│   ├── routes/
│   │   ├── analyze.js             # POST /api/analyze (endpoint principal)
│   │   └── health.js              # GET /api/health
│   │
│   ├── services/
│   │   ├── productExtractor.js    # Extrae info de URLs
│   │   ├── productNormalizer.js   # Normaliza datos
│   │   ├── fingerprint.js         # Genera huella de producto
│   │   ├── matchingEngine.js      # Compara productos
│   │   ├── priceCalculator.js     # Calcula precios totales
│   │   └── marketplaceManager.js  # Orquesta búsquedas
│   │
│   ├── marketplaces/
│   │   ├── MarketplaceAdapter.js  # Clase base
│   │   ├── shein.js               # Adaptador SHEIN
│   │   ├── aliexpress.js          # Adaptador AliExpress
│   │   └── temu.js                # Adaptador Temu
│   │
│   └── utils/
│       ├── logger.js              # Logging estructurado
│       ├── cache.js               # Cache en memoria
│       └── validation.js          # Validación de datos
│
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Instalación

### Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

### Paso 1: Clonar y preparar

```bash
git clone https://github.com/tu-usuario/pricematch-ai.git
cd pricematch-ai
npm install
```

### Paso 2: Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5500
USE_DEMO=true
```

### Paso 3: Ejecutar en desarrollo

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend (HTTP Server):**
```bash
cd frontend
python -m http.server 5500
# o con Node:
npx http-server . -p 5500
```

Luego abre: `http://localhost:5500`

## API Endpoints

### GET /api/health
Verificar estado del servidor

```bash
curl http://localhost:3000/api/health
```

Respuesta:
```json
{
  "status": "ok",
  "environment": "development",
  "demo": true,
  "marketplaces": {
    "SHEIN": { "enabled": false, "configured": false },
    "AliExpress": { "enabled": false, "configured": false },
    "Temu": { "enabled": false, "configured": false }
  }
}
```

### POST /api/analyze
Analizar un producto

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/producto"}'
```

Respuesta:
```json
{
  "success": true,
  "originalProduct": { ... },
  "matches": {
    "SHEIN": { "product": { ... }, "matchResult": { "score": 99, "status": "exact" } },
    "AliExpress": { ... },
    "Temu": { ... }
  },
  "bestMatch": { ... },
  "mode": "demo"
}
```

## Configurar APIs Reales

### SHEIN

SHEIN no tiene API pública oficial actualmente. El adaptador está preparado para cuando sea disponible.

Cuando SHEIN ofrezca API:

```env
SHEIN_ENABLED=true
SHEIN_API_KEY=tu_api_key
SHEIN_API_SECRET=tu_api_secret
```

### AliExpress

AliExpress tiene API limitada. Opciones:

**Opción 1: API Oficial (si tienes acceso)**
```env
ALIEXPRESS_ENABLED=true
ALIEXPRESS_APP_KEY=tu_app_key
ALIEXPRESS_APP_SECRET=tu_app_secret
```

**Opción 2: Servicio de terceros (RapidAPI)**
- Registrarse en: https://rapidapi.com/
- Buscar "AliExpress API"
- Agregar credenciales a `.env`

### Temu

Temu tiene Open Platform API para partners:

1. Registrarse en: https://seller.temu.com/
2. Obtener credenciales
3. Configurar:

```env
TEMU_ENABLED=true
TEMU_APP_KEY=tu_app_key
TEMU_APP_SECRET=tu_app_secret
TEMU_ACCESS_TOKEN=tu_access_token
TEMU_REGION=US
```

## Motor de Matching

### Cómo funciona

1. **Extracción**: Obtiene título, precio, especificaciones, imágenes
2. **Normalización**: Estandariza formatos, unidades, monedas
3. **Fingerprinting**: Crea identificador único del producto
4. **Búsqueda**: Genera múltiples queries para cada marketplace
5. **Comparación**: Calcula similitud con cada candidato
6. **Verificación**: Rechaza automáticamente productos diferentes

### Puntuación

- **95-100%**: Exacto (producto confirmado)
- **85-94%**: Probable (muy confiable)
- **70-84%**: No verificado (insuficiente evidencia)
- **<70%**: Rechazado (producto diferente)

### Reglas de Rechazo (Automáticas)

✗ Diferente modelo o GTIN  
✗ Capacidad diferente (500ml vs 750ml)  
✗ Color diferente (si es característica comercial)  
✗ Cantidad de pack diferente (x1 vs x2)  
✗ Dimensiones muy diferentes (>5%)  

## Modo Demo

Para desarrollo sin APIs reales:

```env
USE_DEMO=true
```

El modo demo:
- Retorna datos de prueba realistas
- Muestra mensaje "MODO DEMO" claramente
- Funciona sin configurar APIs
- Perfecto para desarrollo e pruebas

## Cache

El sistema cachea resultados:

```env
CACHE_ENABLED=true
CACHE_TTL=3600
```

- TTL: 3600 segundos (1 hora)
- Evita búsquedas repetidas
- Mejora rendimiento

## Logging

Logs estructurados en consola:

```env
LOG_LEVEL=info
```

Niveles: `error`, `warn`, `info`, `debug`

Los logs NUNCA muestran:
- API Keys
- Access Tokens
- Secrets
- Passwords

## Rate Limiting

Protección contra abuso:

```env
RATE_LIMIT_WINDOW=60000      # 1 minuto
RATE_LIMIT_MAX=10            # 10 análisis por minuto
```

## Seguridad

✅ Variables de entorno para credenciales  
✅ CORS configurado para frontend específico  
✅ Headers de seguridad (CSP, X-Frame-Options, etc.)  
✅ Validación de entrada  
✅ Rate limiting  
✅ Sanitización de logs  
✅ HTTPS en producción  

**NUNCA**:
- Expongas `API_KEY` en frontend
- Commitees `.env` a git
- Uses credenciales en URLs
- Deshabilites CORS en producción

## Deploy

### Frontend - GitHub Pages

```bash
cd frontend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/pricematch-ai-frontend.git
git push -u origin main
```

En GitHub: Settings → Pages → Deploy from branch `main`

URL: `https://tu-usuario.github.io/pricematch-ai-frontend/`

### Backend - Render.com

1. Crear cuenta en https://render.com
2. Conectar repositorio GitHub
3. Crear Web Service
4. Configurar:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables desde `.env`

### Backend - Railway.app

1. Crear cuenta en https://railway.app
2. Conectar GitHub
3. Railway detecta automáticamente Node.js
4. Agregar variables de entorno en Settings
5. Deploy automático en cada push

### Backend - Vercel Functions (Serverless)

Crear `api/analyze.js`:

```javascript
import app from '../backend/server.js';

export default app;
```

Luego: `vercel deploy`

## Tests

```bash
# Ejecutar tests
npm test

# Con watch mode
npm run test:watch
```

### Casos de prueba

✓ URL inválida  
✓ Producto sin información  
✓ Coincidencia exacta  
✓ Coincidencia rechazada  
✓ Diferencia crítica detectada  
✓ Conversión de moneda  
✓ Cálculo de precio total  

## Estructura de datos

### ProductFingerprint

```javascript
{
  critical: { gtin, ean, upc, mpn },
  high: { brand, manufacturer, sku, model },
  medium: { color, variant, dimensions, material },
  low: { title, description, images }
}
```

### MatchResult

```javascript
{
  score: 0-100,
  status: "exact|probable|unverified|rejected",
  confidence: "high|medium|low",
  verifiedAttributes: [],
  differences: [],
  contradictions: [],
  reasons: []
}
```

## Limitaciones Actuales

- ⚠️ SHEIN: Sin API oficial (espera implementación)
- ⚠️ AliExpress: API limitada (requiere terceros)
- ⚠️ Temu: API en beta (requiere partner status)
- ⚠️ Sin búsqueda por imagen (fase 3)
- ⚠️ Sin historial persistente (next: DB)
- ⚠️ Sin alertas de precio (next: websockets)

## Hoja de ruta

**v2.0** (Actual)
- ✅ Extracción de productos
- ✅ Motor de matching
- ✅ Adaptadores de marketplace
- ✅ Comparación de precios

**v2.1**
- Integración de APIs reales
- Caché distribuido (Redis)
- Base de datos (PostgreSQL)

**v2.2**
- Búsqueda por imagen
- Historial de usuario
- Alertas de precio

**v3.0**
- Extensión de navegador
- Aplicación móvil (React Native)
- IA multimodal avanzada

## Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "ECONNREFUSED" en frontend
Backend no está corriendo. Ejecuta: `npm run dev`

### API returns "not_configured"
Las APIs del marketplace no están configuradas. Usa `USE_DEMO=true` o configura `.env`

### Cache no funciona
Verifica: `CACHE_ENABLED=true`

## Contribuir

Las contribuciones son bienvenidas.

1. Fork el repositorio
2. Crea rama: `git checkout -b feature/tu-feature`
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/tu-feature`
5. Pull Request

## Licencia

MIT © José Lugo

## Contacto

📧 Email: Tu email aquí  
🔗 LinkedIn: Tu perfil  
💬 Twitter/X: Tu usuario  

**PriceMatch AI**: Porque el producto más barato no siempre es el mismo producto.

---

**Diseñado por José Lugo · +57 312 638 7467**
