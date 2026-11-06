#!/bin/bash
# Compila la versión final y deja "LUGO CONNECT.app" en dist/. Solo necesita Xcode.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf build dist
xcodebuild \
  -project LugoConnect.xcodeproj \
  -scheme LugoConnect \
  -configuration Release \
  -destination 'generic/platform=macOS' \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY=- \
  build

mkdir -p dist
cp -R "build/Build/Products/Release/LUGO CONNECT.app" dist/
echo "Listo: dist/LUGO CONNECT.app"
