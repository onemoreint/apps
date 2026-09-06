# 📥 Cómo Descargar e Instalar

## 1️⃣ DESCARGA EL ZIP

En el panel derecho de este chat, verás:

```
📦 pricematch-ai-backend-LISTO.zip (46 KB)
```

**Cliquea para descargar** ⬇️

---

## 2️⃣ DESCOMPRIME EL ZIP

### En Windows:
- Haz clic derecho en el ZIP
- Selecciona **"Extraer todo"**
- Elige dónde (ej: `C:\Users\tuusuario\Documentos\pricematch-ai`)

### En Mac:
- Haz doble clic en el ZIP
- Se descomprime automáticamente

### En Linux:
```bash
unzip pricematch-ai-backend-LISTO.zip
cd pricematch-ai-backend-LISTO
```

---

## 3️⃣ ESTRUCTURA QUE OBTIENES

```
pricematch-ai-backend-LISTO/
├── backend/               ← Carpeta con el código
│   ├── config/
│   ├── marketplaces/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   └── server.js
├── package.json           ← Dependencias
├── .env.example          ← Configuración de ejemplo
├── .gitignore            ← Archivos a ignorar en Git
├── README.md
├── QUICK_START.md
└── .env.production       ← Config para Railway
```

---

## 4️⃣ QUÉ HACER AHORA

### Opción A: Subir directamente a GitHub (RECOMENDADO)

1. Ve a: https://github.com/onemoreint/apps
2. Haz clic en **"Add file"** → **"Upload files"**
3. Arrastra la carpeta descomprimida
4. O sube archivo por archivo

### Opción B: Usar Git desde tu computadora

```bash
# Abre terminal/CMD en la carpeta donde descomprimiste

# Si ya tienes un repo clonado:
cp -r backend ../tu-repo-github/
cp package.json ../tu-repo-github/
cp .env.example ../tu-repo-github/
cd ../tu-repo-github
git add .
git commit -m "Add PriceMatch AI Backend"
git push
```

### Opción C: Crear nuevo repo desde cero

1. Ve a https://github.com/new
2. Crea un repo: `pricematch-ai-backend`
3. En tu computadora:
```bash
cd pricematch-ai-backend-LISTO
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/onemoreint/pricematch-ai-backend.git
git branch -M main
git push -u origin main
```

---

## 5️⃣ SIGUIENTE PASO

Una vez esté en GitHub, sigue las instrucciones en:

**`INSTRUCCIONES-COMPLETAR-SETUP.md`** 

(También está descargado en el ZIP)

---

## ✅ Checklist

- [ ] Descargué el ZIP
- [ ] Descomprimí el ZIP
- [ ] Veo la carpeta `pricematch-ai-backend-LISTO/`
- [ ] Veo la carpeta `backend/` adentro
- [ ] Veo `package.json`
- [ ] Veo `.env.example`
- [ ] Veo `.gitignore`

Si cumples los 6 ✅ entonces estás listo para subir a GitHub.

---

## 🆘 "No veo el botón de descargar"

Si no ves el ZIP en el panel derecho:

1. **Recarga el chat** (F5 o Cmd+R)
2. **Busca el archivo** en el historial
3. **Pregúntame** y te lo envío de nuevo

---

**Una vez descargado y descomprimido, procede a: INSTRUCCIONES-COMPLETAR-SETUP.md**
