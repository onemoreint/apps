#!/usr/bin/env bash
# Genera demo/cotizador.html: la página del cotizador con el motor de cálculo real incrustado.
set -euo pipefail
cd "$(dirname "$0")/.."
npx -y esbuild@0.24.0 packages/calculation-engine/src/index.ts --bundle --format=iife \
  --global-name=SolarEngine --minify --target=es2020 --outfile=demo/.engine.js
python3 - <<'PY'
src = open('demo/cotizador.src.html').read()
eng = open('demo/.engine.js').read().replace('</script', '<\\/script')
open('demo/cotizador.html', 'w').write(
  '<!doctype html><html lang="es"><head><meta charset="utf-8">'
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
  + src.replace('/*__ENGINE__*/', eng) + '</body></html>')
PY
rm demo/.engine.js
echo "✔ demo/cotizador.html"
