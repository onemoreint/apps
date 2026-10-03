import { describe, expect, it } from 'vitest';
import { capabilityOf, commandBlockReason, NOT_ALLOWED_MESSAGE, capabilitiesFor } from '../lib/capabilities';

describe('motor de capacidades', () => {
  it('una app normal nunca puede bloquear, reiniciar ni borrar', () => {
    for (const cmd of ['LOCK_DEVICE', 'REBOOT_DEVICE', 'WIPE_DEVICE'] as const) {
      expect(commandBlockReason(cmd, 'NORMAL_APP', 34)).toContain(NOT_ALLOWED_MESSAGE);
    }
  });

  it('el perfil de trabajo no permite reiniciar y solo borra el perfil', () => {
    expect(commandBlockReason('REBOOT_DEVICE', 'WORK_PROFILE', 34)).not.toBeNull();
    expect(capabilityOf('WORK_PROFILE', 34, 'WIPE').status).toBe('PARTIAL');
  });

  it('totalmente administrado permite bloqueo, reinicio y borrado', () => {
    for (const cmd of ['LOCK_DEVICE', 'REBOOT_DEVICE', 'WIPE_DEVICE'] as const) {
      expect(commandBlockReason(cmd, 'FULLY_MANAGED', 34)).toBeNull();
    }
  });

  it('el laboratorio USB nunca permite borrado remoto', () => {
    expect(commandBlockReason('WIPE_DEVICE', 'LAB_DEVICE_OWNER', 35)).not.toBeNull();
    expect(commandBlockReason('LOCK_DEVICE', 'LAB_DEVICE_OWNER', 35)).toBeNull();
  });

  it('Device Admin pierde cámara y contraseña desde Android 10', () => {
    expect(capabilityOf('DEVICE_ADMIN', 29, 'CAMERA').status).toBe('UNSUPPORTED');
    expect(capabilityOf('DEVICE_ADMIN', 28, 'CAMERA').status).toBe('PARTIAL');
  });

  it('el bloqueo de USB completo depende de Android 12', () => {
    expect(capabilityOf('FULLY_MANAGED', 31, 'USB').status).toBe('SUPPORTED');
    expect(capabilityOf('FULLY_MANAGED', 30, 'USB').status).toBe('PARTIAL');
  });

  it('cada modo declara todas las capacidades con motivo', () => {
    for (const m of ['NORMAL_APP', 'DEVICE_ADMIN', 'WORK_PROFILE', 'FULLY_MANAGED', 'DEDICATED', 'LAB_DEVICE_OWNER'] as const) {
      const caps = capabilitiesFor(m, 34);
      expect(caps).toHaveLength(17);
      caps.forEach((c) => expect(c.reason.length).toBeGreaterThan(5));
    }
  });
});
