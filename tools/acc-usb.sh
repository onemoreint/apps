#!/usr/bin/env bash
# Android Control Center — control del agente de laboratorio por USB (macOS / Linux).
# Requiere adb (Android SDK Platform-Tools) en el PATH o en esta carpeta.
# Uso: ./acc-usb.sh <comando> [valor]     Ayuda: ./acc-usb.sh help
set -euo pipefail

ADB="${ADB:-adb}"
[ -x "./adb" ] && ADB="./adb"
PKG="com.acc.agent"
ADMIN="$PKG/.lab.AccDeviceAdminReceiver"
RX="$PKG/.lab.AdbCommandReceiver"
APK_URL="https://github.com/onemoreint/apps/releases/download/acc-agent-latest/acc-agent.apk"

send() { # $1 = cmd, $2 = valor opcional
  local extra=()
  [ -n "${2:-}" ] && extra=(--es value "$2")
  "$ADB" shell am broadcast -a com.acc.agent.COMMAND -n "$RX" --es cmd "$1" "${extra[@]}" \
    | sed -n 's/.*data="\(.*\)"/\1/p'
}

need_device() {
  if ! "$ADB" get-state >/dev/null 2>&1; then
    echo "No se detecta ningún teléfono. Conecta el cable, activa Depuración USB y acepta el aviso en la pantalla." >&2
    exit 1
  fi
}

cmd="${1:-help}"
case "$cmd" in
  help|-h|--help)
    cat <<TXT
Comandos:
  check            Comprueba conexión, usuarios y cuentas antes de activar
  download         Descarga acc-agent.apk de la última versión
  install          Instala acc-agent.apk (en esta carpeta)
  owner            Convierte el agente en Device Owner
  status           Estado del agente y restricciones activas
  lock             Bloquea la pantalla
  camera-off | camera-on
  screenshots-off | screenshots-on
  bluetooth-off | bluetooth-on
  usb-files-off | usb-files-on
  install-off | install-on      Apps de orígenes desconocidos
  reboot           Reinicia el teléfono
  backend <url>    Fija la URL del backend para el heartbeat (https://...)
  release          Quita restricciones y deja de ser Device Owner
  uninstall        Desinstala el agente (después de release)
TXT
    ;;
  check)
    need_device
    echo "Teléfono: $("$ADB" shell getprop ro.product.manufacturer | tr -d '\r') $("$ADB" shell getprop ro.product.model | tr -d '\r'), Android $("$ADB" shell getprop ro.build.version.release | tr -d '\r')"
    echo "Usuarios:"; "$ADB" shell pm list users
    echo "Si aparece más de un UserInfo, elimina App Twin / Espacio privado antes de 'owner'."
    ;;
  download)
    curl -fL -o acc-agent.apk "$APK_URL" && echo "Descargado acc-agent.apk"
    ;;
  install)
    need_device; [ -f acc-agent.apk ] || { echo "Falta acc-agent.apk. Ejecuta: $0 download" >&2; exit 1; }
    "$ADB" install -r acc-agent.apk
    ;;
  owner)
    need_device; "$ADB" shell dpm set-device-owner "$ADMIN"
    ;;
  backend)
    need_device; send set_backend "${2:?Indica la URL, por ejemplo https://acc.midominio.com}"
    ;;
  uninstall)
    need_device; "$ADB" uninstall "$PKG"
    ;;
  status|lock|reboot|release|heartbeat|camera-off|camera-on|screenshots-off|screenshots-on|bluetooth-off|bluetooth-on|usb-files-off|usb-files-on|install-off|install-on)
    need_device; send "${cmd//-/_}"
    ;;
  *)
    echo "Comando desconocido: $cmd. Usa: $0 help" >&2; exit 1
    ;;
esac
