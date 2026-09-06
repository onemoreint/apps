# 🚀 Quick Start - PriceMatch AI v2

**Comienza en 5 minutos**

## 1. Preparar el proyecto

```bash
cd pricematch-ai
npm install
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Deja los valores por defecto. Mode DEMO está activo: `USE_DEMO=true`

## 3. Ejecutar Backend

```bash
npm run dev
```

Verás:
```
🚀 PriceMatch AI Server started
📍 Listening on port 3000
🔧 Environment: development
🎯 Demo Mode: true
```

**El backend está listo en: http://localhost:3000**

## 4. Ejecutar Frontend

Abre **otra terminal** en la carpeta `frontend`:

```bash
cd frontend
```

### Opción A: Con Python (si lo tienes)
```bash
python -m http.server 5500
```

### Opción B: Con Node
```bash
npx http-server . -p 5500
```

### Opción C: Simple (doble clic)
Abre `frontend/index.html` directamente en el navegador (funciona solo con DEMO)

## 5. Usar la aplicación

Abre en el navegador:
```
http://localhost:5500
```

### Prueba con URLs de DEMO:
- Pega cualquier URL (ej: https://www.amazon.com/s?k=laptop)
- Verás resultados de demostración
- El badge "🎯 MODO DEMO" indicará que está en demo

## 6. Verificar backend está corriendo

```bash
curl http://localhost:3000/api/health
```

Deberías recibir:
```json
{
  "status": "ok",
  "environment": "development",
  "demo": true,
  "marketplaces": { ... }
}
```

---

## Estructura de carpetas entregadas

```
/mnt/user-data/outputs/
├── package.json                    # Dependencias
├── .env.example                    # Ejemplo de configuración
├── .gitignore                      # Ignorar en git
├── README.md                       # Documentación completa
├── QUICK_START.md                  # Este archivo
│
├── backend/
│   ├── server.js                   # Servidor principal
│   ├── config/env.js
│   ├── routes/
│   │   ├── analyze.js              # POST /api/analyze
│   │   └── health.js               # GET /api/health
│   ├── services/
│   │   ├── productExtractor.js
│   │   ├── productNormalizer.js
│   │   ├── fingerprint.js
│   │   ├── matchingEngine.js
│   │   ├── priceCalculator.js
│   │   └── marketplaceManager.js
│   ├── marketplaces/
│   │   ├── MarketplaceAdapter.js
│   │   ├── shein.js
│   │   ├── aliexpress.js
│   │   └── temu.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── cache.js
│   │   └── validation.js
│   └── tests/
│       └── matching.test.js
│
└── frontend/
    └── index.html                  # Aplicación web completa
```

---

## Próximos pasos

### 1️⃣ Para agregar APIs reales

Cuando tengas credenciales de un marketplace:

Edita `.env`:
```env
SHEIN_ENABLED=true
SHEIN_API_KEY=tu_clave_aqui
SHEIN_API_SECRET=tu_secreto_aqui
```

Cambia:
```env
USE_DEMO=false
```

Reinicia backend:
```bash
npm run dev
```

### 2️⃣ Ejecutar tests

```bash
npm test
```

### 3️⃣ Ver logs detallados

```env
LOG_LEVEL=debug
```

### 4️⃣ Publicar en producción

Ver sección "Deploy" en README.md

---

## Troubleshooting rápido

### ❌ "Cannot GET /api/health"
**Solución**: Backend no está corriendo. Ejecuta `npm run dev` en la carpeta correcta.

### ❌ CORS error en browser
**Solución**: Asegúrate de que:
- Backend: `PORT=3000`
- Frontend: `http://localhost:5500`
- `.env` tiene: `FRONTEND_URL=http://localhost:5500`

### ❌ "npm: command not found"
**Solución**: Node.js no está instalado. Descarga desde https://nodejs.org

### ❌ Puerto 3000 ya está en uso
**Solución**: Cambia en `.env`:
```env
PORT=3001
```
Y actualiza frontend a `http://localhost:3001/api`

### ❌ Frontend vacío/en blanco
**Solución**: 
1. Abre consola (F12)
2. Verifica que `localhost:3000/api/health` responde
3. Recarga página (Ctrl+R)

---

## Estructura de request/response

### Request
```json
POST /api/analyze
{
  "url": "https://www.amazon.com/dp/ASIN"
}
```

### Response (modo DEMO)
```json
{
  "success": true,
  "mode": "demo",
  "originalProduct": {
    "title": "Organizador de cocina 3 niveles",
    "brand": "KitchenPro",
    "price": 89.99,
    ...
  },
  "matches": {
    "SHEIN": {
      "product": { ... },
      "matchResult": { "score": 99, "status": "exact" }
    },
    "AliExpress": { ... },
    "Temu": { ... }
  },
  "bestMatch": { ... }
}
```

---

## Modos de ejecución

### Desarrollo con logs
```bash
LOG_LEVEL=debug npm run dev
```

### Producción
```bash
NODE_ENV=production npm start
```

### Solo health check
```bash
curl http://localhost:3000/api/health | jq
```

---

## Archivos modificables

### Cambiar puerto
`.env`:
```env
PORT=3001
```

### Cambiar TTL de cache
`.env`:
```env
CACHE_TTL=7200  # 2 horas en lugar de 1
```

### Cambiar moneda por defecto
`.env`:
```env
DEFAULT_CURRENCY=MXN
```

### Cambiar límite de rate limit
`.env`:
```env
RATE_LIMIT_MAX=20  # 20 análisis por minuto en lugar de 10
```

---

## Git (si quieres guardar tu progreso)

```bash
git init
git add .
git commit -m "PriceMatch AI - Fase 2 Backend + Frontend"
git remote add origin https://github.com/tu-usuario/pricematch-ai.git
git push -u origin main
```

---

## Siguientes fases (no implementadas aún)

**Fase 3**: Búsqueda por imagen  
**Fase 4**: Base de datos y historial  
**Fase 5**: Alertas de precio  
**Fase 6**: Extensión de navegador  

---

## Documentación completa

Lee: `README.md` para información detallada sobre:
- Arquitectura completa
- Configuración de APIs
- Motor de matching
- Deploy en producción
- Seguridad
- Hoja de ruta

---

## Contacto & Soporte

**PriceMatch AI**  
Diseñado por **José Lugo**  
📱 +57 312 638 7467

💡 Idea central: "Es preferible decir NO VERIFICADO que mostrar un producto diferente como si fuera el mismo"

---

**¡Ya estás listo! Disfruta usando PriceMatch AI** 🎉
