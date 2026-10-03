// Modelo de dominio compartido por el panel. Refleja las entidades de
// shared/openapi/acc-api.yaml y de la migración V1 del backend.

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'AUDITOR' | 'VIEWER';

export type ManagementMode =
  | 'NORMAL_APP'
  | 'DEVICE_ADMIN'
  | 'WORK_PROFILE'
  | 'FULLY_MANAGED'
  | 'DEDICATED'
  | 'LAB_DEVICE_OWNER';

export type DeviceState = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'RETIRED';
export type Compliance = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  organizationId: string | null; // null = plataforma (SUPER_ADMIN)
  name: string;
  email: string;
  role: Role;
}

export interface Device {
  id: string;
  organizationId: string;
  name: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdkInt: number;
  serial: string | null;
  mode: ManagementMode;
  state: DeviceState;
  compliance: Compliance;
  batteryPct: number;
  storageFreeGb: number;
  storageTotalGb: number;
  memoryFreeMb: number;
  lastSeenAt: string; // ISO
  enrolledAt: string;
  tags: string[];
  policyId: string | null;
  agentVersion: string;
  installedPackages: string[];
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PolicyStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface PolicySpec {
  cameraDisabled: boolean;
  screenCaptureDisabled: boolean;
  usbDataDisabled: boolean;
  installUnknownSourcesAllowed: boolean;
  playStoreMode: 'ALLOWLIST' | 'BLOCKLIST';
  bluetoothDisabled: boolean;
  wifiSsid: string;
  passwordQuality: 'NONE' | 'SOMETHING' | 'NUMERIC_COMPLEX' | 'ALPHANUMERIC' | 'COMPLEX';
  passwordMinLength: number;
  systemUpdate: 'AUTOMATIC' | 'WINDOWED' | 'POSTPONE';
  externalStorageDisabled: boolean;
  factoryResetDisabled: boolean;
}

export interface Policy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  status: PolicyStatus;
  spec: PolicySpec;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type InstallType = 'AVAILABLE' | 'FORCE_INSTALLED' | 'BLOCKED' | 'KIOSK';

export type ConfigType = 'STRING' | 'BOOL' | 'INTEGER' | 'FLOAT' | 'STRING_ARRAY';

export interface ManagedConfigEntry {
  id: string;
  key: string;
  name: string;
  description: string;
  type: ConfigType;
  value: string | number | boolean | string[];
}

export interface Application {
  id: string;
  organizationId: string;
  name: string;
  packageName: string;
  version: string;
  installType: InstallType;
  permissions: string[];
  managedConfig: ManagedConfigEntry[];
}

export type CommandType =
  | 'GET_DEVICE_INFO'
  | 'SYNC_POLICY'
  | 'SYNC_APPLICATIONS'
  | 'REFRESH_CONFIGURATION'
  | 'SYNC_NOW'
  | 'LOCK_DEVICE'
  | 'REBOOT_DEVICE'
  | 'WIPE_DEVICE';

export type CommandStatus =
  | 'QUEUED'
  | 'SENT'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Command {
  id: string;
  organizationId: string;
  deviceId: string;
  type: CommandType;
  status: CommandStatus;
  requestedBy: string;
  createdAt: string;
  completedAt: string | null;
  response: string | null;
  error: string | null;
}

export type AuditResult = 'SUCCESS' | 'DENIED' | 'ERROR';

export interface AuditEvent {
  id: string;
  organizationId: string | null;
  at: string;
  actor: string;
  action: string;
  target: string;
  deviceId: string | null;
  ip: string | null;
  result: AuditResult;
  details?: string;
}

export interface Enrollment {
  id: string;
  organizationId: string;
  scenario: EnrollmentScenario;
  mode: ManagementMode;
  policyId: string | null;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  createdBy: string;
}

export type EnrollmentScenario =
  | 'CORPORATE'
  | 'DEDICATED'
  | 'COPE'
  | 'BYOD'
  | 'LAB';
