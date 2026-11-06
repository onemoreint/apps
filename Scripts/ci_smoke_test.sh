#!/bin/bash
# Prueba la app real ya compilada: la abre, lee el PIN de la pantalla, la empareja y transfiere.
# Se usa en la compilación automática; no hace falta para usar la app.
set -u
APP="dist/LUGO CONNECT.app"
H=http://127.0.0.1:8642
DEST="$HOME/Downloads/LUGO CONNECT"
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAILED=1; }
FAILED=0

cat > /tmp/ocr.swift <<'SWIFT'
import AppKit
import Vision
let image = NSImage(contentsOfFile: CommandLine.arguments[1])!
var rect = NSRect(origin: .zero, size: image.size)
let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
try VNImageRequestHandler(cgImage: cg).perform([request])
for item in request.results ?? [] { print(item.topCandidates(1).first?.string ?? "") }
SWIFT

shot() {
  screencapture -x "/tmp/$1.png"
  sips -s format jpeg -s formatOptions 55 --resampleWidth 1000 "/tmp/$1.png" --out "/tmp/$1.jpg" >/dev/null 2>&1
  echo "BEGIN_IMAGE $1"; base64 -i "/tmp/$1.jpg"; echo "END_IMAGE $1"
}

open "$APP"
for _ in $(seq 1 30); do curl -s -o /dev/null -m 1 $H/ && break; sleep 1; done
sleep 3

[ "$(curl -s -o /dev/null -w '%{http_code}' -m 3 $H/)" = 200 ] && pass "abre y sirve la página" || fail "abre y sirve la página"
[ "$(curl -s -o /dev/null -w '%{http_code}' -m 3 $H/api/status)" = 401 ] && pass "API sin token rechazada" || fail "API sin token rechazada"
[ -d "$DEST" ] && pass "crea la carpeta en Descargas" || fail "crea la carpeta en Descargas"
shot inicio

screencapture -x /tmp/pin.png
swift /tmp/ocr.swift /tmp/pin.png > /tmp/ocr.txt 2>/tmp/ocr.err || cat /tmp/ocr.err
PIN=$(grep -E '^[0-9]{3} ?[0-9]{3}$' /tmp/ocr.txt | head -1 | tr -d ' ')
echo "--- texto en pantalla"; head -40 /tmp/ocr.txt
if [ -n "$PIN" ]; then pass "PIN visible en pantalla"; else fail "PIN visible en pantalla"; fi

STATUS=$(curl -s -o /tmp/pair.json -w '%{http_code}' -m 3 -X POST $H/api/pair -d '{"pin":"000000","device":"Prueba"}')
echo "PIN falso → $STATUS"

ID=$(curl -s -m 3 -X POST $H/api/pair -d "{\"pin\":\"$PIN\",\"device\":\"Prueba CI\"}" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
echo "solicitud: $ID"
sleep 2
shot aprobacion
osascript -e 'tell application "System Events" to key code 36' 2>&1 | head -2
TOKEN=""
for _ in $(seq 1 10); do
  R=$(curl -s -m 3 "$H/api/pair/$ID")
  echo "$R" | grep -q approved && TOKEN=$(echo "$R" | sed -E 's/.*"token":"([^"]+)".*/\1/') && break
  sleep 1
done
if [ -n "$TOKEN" ]; then
  pass "emparejado tras aceptar en el Mac"
  head -c 20000000 /dev/urandom > /tmp/prueba-ci.bin
  curl -s -m 60 -T /tmp/prueba-ci.bin -H "X-Lugo-Token: $TOKEN" "$H/api/upload?name=prueba-ci.bin"; echo
  cmp /tmp/prueba-ci.bin "$DEST/prueba-ci.bin" && pass "subida real dentro del sandbox" || fail "subida real dentro del sandbox"
  sleep 1
  shot transferencia
else
  fail "emparejado tras aceptar en el Mac"
fi

osascript -e 'tell application "LUGO CONNECT" to quit' 2>&1 | head -2
sleep 3
pgrep -f "LUGO CONNECT.app" >/dev/null && fail "se cierra al salir" || pass "se cierra al salir"
curl -s -o /dev/null -m 2 $H/ && fail "cierra el puerto al salir" || pass "cierra el puerto al salir"
[ -s "$HOME/Library/Containers/com.joselugo.lugoconnect/Data/Library/Application Support/LUGO CONNECT/historial.json" ] && pass "guarda el historial" || echo "AVISO sin historial"
exit $FAILED
