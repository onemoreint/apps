// Motor de capacidades: qué puede hacer la plataforma sobre un dispositivo
// según su modo de administración y su versión de Android.
// Fuente de verdad documentada en docs/capability-matrix.md.
// El backend implementa la misma tabla en capabilities/CapabilityEngine.kt.

import type { CommandType, ManagementMode } from './types';

export const NOT_ALLOWED_MESSAGE =
  'Esta operación requiere un modo de administración compatible o no está permitida por Android.';

export type CapabilityStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED';

export type CapabilityCode =
  | 'DEVICE_INFO'
  | 'HARDWARE_IDS'
  | 'MANAGED_CONFIG'
  | 'APP_MANAGEMENT'
  | 'SILENT_INSTALL'
  | 'PASSWORD_POLICY'
  | 'REMOTE_LOCK'
  | 'CAMERA'
  | 'SCREEN_CAPTURE'
  | 'USB'
  | 'WIFI'
  | 'BLUETOOTH'
  | 'USER_RESTRICTIONS'
  | 'SYSTEM_UPDATES'
  | 'REBOOT'
  | 'WIPE'
  | 'KIOSK';

export interface Capability {
  code: CapabilityCode;
  label: string;
  status: CapabilityStatus;
  reason: string;
  api: string;
}

export const CAPABILITY_LABELS: Record<CapabilityCode, string> = {
  DEVICE_INFO: 'Información del dispositivo',
  HARDWARE_IDS: 'Número de serie e IDs de hardware',
  MANAGED_CONFIG: 'Configuraciones administradas',
  APP_MANAGEMENT: 'Gestión de aplicaciones',
  SILENT_INSTALL: 'Instalación silenciosa',
  PASSWORD_POLICY: 'Política de contraseña',
  REMOTE_LOCK: 'Bloqueo remoto',
  CAMERA: 'Control de cámara',
  SCREEN_CAPTURE: 'Captura de pantalla',
  USB: 'Control de USB',
  WIFI: 'Wi-Fi corporativo',
  BLUETOOTH: 'Bluetooth',
  USER_RESTRICTIONS: 'Restricciones de usuario',
  SYSTEM_UPDATES: 'Actualizaciones del sistema',
  REBOOT: 'Reinicio remoto',
  WIPE: 'Borrado remoto',
  KIOSK: 'Modo quiosco',
};

export const MODE_LABELS: Record<ManagementMode, string> = {
  NORMAL_APP: 'App normal',
  DEVICE_ADMIN: 'Device Admin (legado)',
  WORK_PROFILE: 'Perfil de trabajo',
  FULLY_MANAGED: 'Totalmente administrado',
  DEDICATED: 'Dedicado (quiosco)',
  LAB_DEVICE_OWNER: 'Device Owner de laboratorio',
};

export const MODE_DESCRIPTIONS: Record<ManagementMode, string> = {
  NORMAL_APP:
    'El agente se instala como cualquier app. Solo informa datos básicos; no puede aplicar políticas.',
  DEVICE_ADMIN:
    'API heredada. Google la retiró para uso empresarial y varias políticas fallan desde Android 10.',
  WORK_PROFILE:
    'Perfil separado para apps y datos de trabajo. La parte personal del teléfono queda fuera de alcance.',
  FULLY_MANAGED:
    'Equipo de la empresa inscrito tras un restablecimiento. Control completo vía Android Management API.',
  DEDICATED:
    'Equipo de uso único (quiosco, punto de venta). Control completo y apps fijadas en pantalla.',
  LAB_DEVICE_OWNER:
    'El agente es Device Owner por USB (adb). Para pruebas en equipos propios; no apto para producción.',
};

type Row = Record<ManagementMode, [CapabilityStatus, string]>;

const S = 'SUPPORTED' as const;
const P = 'PARTIAL' as const;
const U = 'UNSUPPORTED' as const;

function matrix(sdk: number): Record<CapabilityCode, Row & { api: string }> {
  const usbFull: [CapabilityStatus, string] =
    sdk >= 31
      ? [S, 'Bloqueo de señal de datos USB (Android 12+).']
      : [P, 'Antes de Android 12 solo se bloquea la transferencia de archivos.'];
  const daDeprecated: [CapabilityStatus, string] =
    sdk >= 29
      ? [U, 'En desuso para Device Admin desde Android 10.']
      : [P, 'Funciona en esta versión, pero es una API retirada.'];

  return {
    DEVICE_INFO: {
      api: 'Build, BatteryManager, StatFs · AMAPI hardwareInfo',
      NORMAL_APP: [S, 'Datos públicos del sistema.'],
      DEVICE_ADMIN: [S, 'Datos públicos del sistema.'],
      WORK_PROFILE: [S, 'Modelo, versión, batería y almacenamiento.'],
      FULLY_MANAGED: [S, 'Inventario completo vía AMAPI y agente.'],
      DEDICATED: [S, 'Inventario completo vía AMAPI y agente.'],
      LAB_DEVICE_OWNER: [S, 'Inventario completo desde el agente.'],
    },
    HARDWARE_IDS: {
      api: 'Build.getSerial() (solo DPC) · AMAPI hardwareInfo.serialNumber',
      NORMAL_APP: [U, 'Android oculta los IDs de hardware a las apps desde Android 10.'],
      DEVICE_ADMIN: [U, 'Android oculta los IDs de hardware a las apps desde Android 10.'],
      WORK_PROFILE: [U, 'En un equipo personal el perfil no puede leer IDs del dispositivo.'],
      FULLY_MANAGED: [S, 'El DPC puede leer el número de serie.'],
      DEDICATED: [S, 'El DPC puede leer el número de serie.'],
      LAB_DEVICE_OWNER: [S, 'Como Device Owner el agente puede leer el número de serie.'],
    },
    MANAGED_CONFIG: {
      api: 'RestrictionsManager · AMAPI applications[].managedConfiguration',
      NORMAL_APP: [U, 'Sin DPC no hay quien entregue la configuración.'],
      DEVICE_ADMIN: [U, 'Device Admin no puede configurar otras apps.'],
      WORK_PROFILE: [S, 'Para apps instaladas en el perfil de trabajo.'],
      FULLY_MANAGED: [S, 'Para cualquier app administrada.'],
      DEDICATED: [S, 'Para cualquier app administrada.'],
      LAB_DEVICE_OWNER: [S, 'DevicePolicyManager.setApplicationRestrictions.'],
    },
    APP_MANAGEMENT: {
      api: 'AMAPI applications[].installType · setPackagesSuspended',
      NORMAL_APP: [U, 'Una app normal no puede gestionar otras apps.'],
      DEVICE_ADMIN: [U, 'Device Admin no gestiona apps.'],
      WORK_PROFILE: [S, 'Solo dentro del perfil de trabajo.'],
      FULLY_MANAGED: [S, 'Permitir, bloquear y forzar apps.'],
      DEDICATED: [S, 'Permitir, bloquear y forzar apps.'],
      LAB_DEVICE_OWNER: [S, 'Ocultar o suspender apps instaladas.'],
    },
    SILENT_INSTALL: {
      api: 'AMAPI installType FORCE_INSTALLED · PackageInstaller (DPC)',
      NORMAL_APP: [U, 'Android siempre pide confirmación al usuario.'],
      DEVICE_ADMIN: [U, 'Android siempre pide confirmación al usuario.'],
      WORK_PROFILE: [S, 'En el perfil, desde Managed Google Play.'],
      FULLY_MANAGED: [S, 'Desde Managed Google Play.'],
      DEDICATED: [S, 'Desde Managed Google Play.'],
      LAB_DEVICE_OWNER: [P, 'Posible con PackageInstaller; sin Managed Google Play. Aún no implementado.'],
    },
    PASSWORD_POLICY: {
      api: 'AMAPI passwordPolicies · setRequiredPasswordComplexity',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: daDeprecated,
      WORK_PROFILE: [S, 'Contraseña del perfil y/o del dispositivo.'],
      FULLY_MANAGED: [S, 'Complejidad y longitud mínima.'],
      DEDICATED: [S, 'Complejidad y longitud mínima.'],
      LAB_DEVICE_OWNER: [S, 'setRequiredPasswordComplexity (Android 12+).'],
    },
    REMOTE_LOCK: {
      api: 'DevicePolicyManager.lockNow · AMAPI comando LOCK',
      NORMAL_APP: [U, 'Requiere un DPC o Device Admin.'],
      DEVICE_ADMIN: [S, 'lockNow sigue disponible.'],
      WORK_PROFILE: [P, 'Bloquea el perfil de trabajo, no todo el teléfono.'],
      FULLY_MANAGED: [S, 'Bloquea el dispositivo.'],
      DEDICATED: [S, 'Bloquea el dispositivo.'],
      LAB_DEVICE_OWNER: [S, 'lockNow como Device Owner.'],
    },
    CAMERA: {
      api: 'AMAPI cameraAccess · setCameraDisabled',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: daDeprecated,
      WORK_PROFILE: [P, 'Solo para apps del perfil de trabajo.'],
      FULLY_MANAGED: [S, 'En todo el dispositivo.'],
      DEDICATED: [S, 'En todo el dispositivo.'],
      LAB_DEVICE_OWNER: [S, 'setCameraDisabled como Device Owner.'],
    },
    SCREEN_CAPTURE: {
      api: 'AMAPI screenCaptureDisabled · setScreenCaptureDisabled',
      NORMAL_APP: [U, 'Una app solo puede proteger sus propias pantallas.'],
      DEVICE_ADMIN: [U, 'No disponible para Device Admin.'],
      WORK_PROFILE: [P, 'Solo en apps del perfil de trabajo.'],
      FULLY_MANAGED: [S, 'En todo el dispositivo.'],
      DEDICATED: [S, 'En todo el dispositivo.'],
      LAB_DEVICE_OWNER: [S, 'setScreenCaptureDisabled como Device Owner.'],
    },
    USB: {
      api: 'AMAPI usbDataAccess · setUsbDataSignalingEnabled',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: [U, 'No disponible para Device Admin.'],
      WORK_PROFILE: [U, 'En un equipo personal el perfil no controla el USB.'],
      FULLY_MANAGED: usbFull,
      DEDICATED: usbFull,
      LAB_DEVICE_OWNER: [P, 'Restricción de transferencia de archivos. No se bloquea la depuración USB para no perder el control por adb.'],
    },
    WIFI: {
      api: 'AMAPI openNetworkConfiguration · WifiManager (DPC)',
      NORMAL_APP: [P, 'Solo sugerencias de red que el usuario acepta.'],
      DEVICE_ADMIN: [U, 'No disponible para Device Admin.'],
      WORK_PROFILE: [P, 'Redes del trabajo, sin tocar las personales.'],
      FULLY_MANAGED: [S, 'Configurar y bloquear redes.'],
      DEDICATED: [S, 'Configurar y bloquear redes.'],
      LAB_DEVICE_OWNER: [P, 'Restricción de cambios de Wi-Fi; perfiles de red aún no implementados.'],
    },
    BLUETOOTH: {
      api: 'AMAPI bluetoothDisabled · DISALLOW_BLUETOOTH',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: [U, 'No disponible para Device Admin.'],
      WORK_PROFILE: [P, 'Solo compartir contactos del perfil.'],
      FULLY_MANAGED: [S, 'Activar o bloquear Bluetooth.'],
      DEDICATED: [S, 'Activar o bloquear Bluetooth.'],
      LAB_DEVICE_OWNER: [S, 'Restricción DISALLOW_BLUETOOTH.'],
    },
    USER_RESTRICTIONS: {
      api: 'DevicePolicyManager.addUserRestriction',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: [U, 'No disponible para Device Admin.'],
      WORK_PROFILE: [P, 'Solo las que aplican al perfil.'],
      FULLY_MANAGED: [S, 'Todas las restricciones de usuario.'],
      DEDICATED: [S, 'Todas las restricciones de usuario.'],
      LAB_DEVICE_OWNER: [S, 'Todas las restricciones de usuario.'],
    },
    SYSTEM_UPDATES: {
      api: 'AMAPI systemUpdate · setSystemUpdatePolicy',
      NORMAL_APP: [U, 'Requiere Device Owner.'],
      DEVICE_ADMIN: [U, 'Requiere Device Owner.'],
      WORK_PROFILE: [U, 'Las actualizaciones las decide el usuario.'],
      FULLY_MANAGED: [S, 'Automáticas, por ventana o pospuestas.'],
      DEDICATED: [S, 'Automáticas, por ventana o pospuestas.'],
      LAB_DEVICE_OWNER: [P, 'API disponible; aún no implementada en el agente.'],
    },
    REBOOT: {
      api: 'DevicePolicyManager.reboot · AMAPI comando REBOOT',
      NORMAL_APP: [U, 'Requiere Device Owner.'],
      DEVICE_ADMIN: [U, 'Requiere Device Owner.'],
      WORK_PROFILE: [U, 'Requiere Device Owner.'],
      FULLY_MANAGED: [S, 'Reinicio remoto.'],
      DEDICATED: [S, 'Reinicio remoto.'],
      LAB_DEVICE_OWNER: [S, 'DevicePolicyManager.reboot.'],
    },
    WIPE: {
      api: 'AMAPI devices.delete · wipeDevice',
      NORMAL_APP: [U, 'Requiere un DPC.'],
      DEVICE_ADMIN: [P, 'API heredada; puede no funcionar en Android 14+.'],
      WORK_PROFILE: [P, 'Solo borra el perfil de trabajo; los datos personales se conservan.'],
      FULLY_MANAGED: [S, 'Restablece el equipo de fábrica.'],
      DEDICATED: [S, 'Restablece el equipo de fábrica.'],
      LAB_DEVICE_OWNER: [U, 'Desactivado a propósito en el agente de laboratorio para proteger tu teléfono.'],
    },
    KIOSK: {
      api: 'AMAPI installType KIOSK · startLockTask',
      NORMAL_APP: [U, 'Requiere Device Owner.'],
      DEVICE_ADMIN: [U, 'Requiere Device Owner.'],
      WORK_PROFILE: [U, 'Requiere Device Owner.'],
      FULLY_MANAGED: [P, 'Disponible en el modo Dedicado.'],
      DEDICATED: [S, 'Apps fijadas con lock task.'],
      LAB_DEVICE_OWNER: [S, 'setLockTaskPackages + startLockTask.'],
    },
  };
}

export function capabilitiesFor(mode: ManagementMode, sdkInt: number): Capability[] {
  const m = matrix(sdkInt);
  return (Object.keys(m) as CapabilityCode[]).map((code) => {
    const [status, reason] = m[code][mode];
    return { code, label: CAPABILITY_LABELS[code], status, reason, api: m[code].api };
  });
}

export function capabilityOf(
  mode: ManagementMode,
  sdkInt: number,
  code: CapabilityCode,
): Capability {
  return capabilitiesFor(mode, sdkInt).find((c) => c.code === code)!;
}

export const COMMAND_CAPABILITY: Record<CommandType, CapabilityCode> = {
  GET_DEVICE_INFO: 'DEVICE_INFO',
  SYNC_NOW: 'DEVICE_INFO',
  SYNC_POLICY: 'USER_RESTRICTIONS',
  SYNC_APPLICATIONS: 'APP_MANAGEMENT',
  REFRESH_CONFIGURATION: 'MANAGED_CONFIG',
  LOCK_DEVICE: 'REMOTE_LOCK',
  REBOOT_DEVICE: 'REBOOT',
  WIPE_DEVICE: 'WIPE',
};

export const COMMAND_LABELS: Record<CommandType, string> = {
  GET_DEVICE_INFO: 'Obtener información',
  SYNC_NOW: 'Sincronizar ahora',
  SYNC_POLICY: 'Sincronizar política',
  SYNC_APPLICATIONS: 'Sincronizar aplicaciones',
  REFRESH_CONFIGURATION: 'Actualizar configuración',
  LOCK_DEVICE: 'Bloquear dispositivo',
  REBOOT_DEVICE: 'Reiniciar dispositivo',
  WIPE_DEVICE: 'Borrar dispositivo',
};

export const DESTRUCTIVE_COMMANDS: CommandType[] = ['WIPE_DEVICE'];
export const CONFIRM_COMMANDS: CommandType[] = ['LOCK_DEVICE', 'REBOOT_DEVICE', 'WIPE_DEVICE'];

/** Devuelve null si el comando está permitido, o el motivo si no lo está. */
export function commandBlockReason(
  type: CommandType,
  mode: ManagementMode,
  sdkInt: number,
): string | null {
  const cap = capabilityOf(mode, sdkInt, COMMAND_CAPABILITY[type]);
  if (cap.status === 'UNSUPPORTED') return `${NOT_ALLOWED_MESSAGE} ${cap.reason}`;
  return null;
}
