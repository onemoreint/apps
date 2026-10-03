# Android Control Center - control del agente de laboratorio por USB (Windows PowerShell).
# Requiere adb.exe (Android SDK Platform-Tools) en el PATH o en esta carpeta.
# Uso: .\acc-usb.ps1 <comando> [valor]     Ayuda: .\acc-usb.ps1 help
# Si PowerShell bloquea el script: Set-ExecutionPolicy -Scope Process Bypass
param(
  [Parameter(Position = 0)][string]$Command = "help",
  [Parameter(Position = 1)][string]$Value = ""
)
$ErrorActionPreference = "Stop"

$Adb = "adb"
if (Test-Path ".\adb.exe") { $Adb = ".\adb.exe" }
$Pkg = "com.acc.agent"
$Admin = "$Pkg/.lab.AccDeviceAdminReceiver"
$Rx = "$Pkg/.lab.AdbCommandReceiver"
$ApkUrl = "https://github.com/onemoreint/android-control-center/releases/latest/download/acc-agent.apk"

function Send-Cmd([string]$cmd, [string]$val = "") {
  $cmdArgs = @("shell", "am", "broadcast", "-a", "com.acc.agent.COMMAND", "-n", $Rx, "--es", "cmd", $cmd)
  if ($val) { $cmdArgs += @("--es", "value", $val) }
  $out = & $Adb @cmdArgs | Out-String
  if ($out -match 'data="(.*)"') { $Matches[1] -replace ' \| ', "`n" } else { $out }
}

function Need-Device {
  & $Adb get-state 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "No se detecta ningun telefono. Conecta el cable, activa Depuracion USB y acepta el aviso en la pantalla."
  }
}

switch ($Command) {
  "help" {
    @"
Comandos:
  check            Comprueba conexion, usuarios y cuentas antes de activar
  download         Descarga acc-agent.apk de la ultima version
  install          Instala acc-agent.apk (en esta carpeta)
  owner            Convierte el agente en Device Owner
  status           Estado del agente y restricciones activas
  lock             Bloquea la pantalla
  camera-off | camera-on
  screenshots-off | screenshots-on
  bluetooth-off | bluetooth-on
  usb-files-off | usb-files-on
  install-off | install-on      Apps de origenes desconocidos
  reboot           Reinicia el telefono
  backend <url>    Fija la URL del backend para el heartbeat (https://...)
  release          Quita restricciones y deja de ser Device Owner
  uninstall        Desinstala el agente (despues de release)
"@
  }
  "check" {
    Need-Device
    $m = (& $Adb shell getprop ro.product.manufacturer).Trim()
    $d = (& $Adb shell getprop ro.product.model).Trim()
    $v = (& $Adb shell getprop ro.build.version.release).Trim()
    "Telefono: $m $d, Android $v"
    "Usuarios:"; & $Adb shell pm list users
    "Si aparece mas de un UserInfo, elimina App Twin / Espacio privado antes de 'owner'."
  }
  "download" { Invoke-WebRequest -Uri $ApkUrl -OutFile "acc-agent.apk"; "Descargado acc-agent.apk" }
  "install" {
    Need-Device
    if (-not (Test-Path "acc-agent.apk")) { Write-Error "Falta acc-agent.apk. Ejecuta: .\acc-usb.ps1 download" }
    & $Adb install -r acc-agent.apk
  }
  "owner" { Need-Device; & $Adb shell dpm set-device-owner $Admin }
  "backend" {
    Need-Device
    if (-not $Value) { Write-Error "Indica la URL, por ejemplo https://acc.midominio.com" }
    Send-Cmd "set_backend" $Value
  }
  "uninstall" { Need-Device; & $Adb uninstall $Pkg }
  { $_ -in @("status","lock","reboot","release","heartbeat","camera-off","camera-on","screenshots-off","screenshots-on","bluetooth-off","bluetooth-on","usb-files-off","usb-files-on","install-off","install-on") } {
    Need-Device; Send-Cmd ($Command -replace '-', '_')
  }
  default { Write-Error "Comando desconocido: $Command. Usa: .\acc-usb.ps1 help" }
}
