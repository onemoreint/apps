#!/bin/bash
# Crea dist/LUGO-CONNECT.dmg con la app y un acceso a Aplicaciones. Solo usa herramientas de macOS.
set -euo pipefail
cd "$(dirname "$0")/.."

APP="dist/LUGO CONNECT.app"
[ -d "$APP" ] || ./Scripts/build_app.sh

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Aplicaciones"

rm -f dist/LUGO-CONNECT.dmg
hdiutil create -volname "LUGO CONNECT" -srcfolder "$STAGE" -format UDZO -ov dist/LUGO-CONNECT.dmg
echo "Listo: dist/LUGO-CONNECT.dmg"
