import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMe } from '../store/store';
import { can, type Permission } from '../lib/rbac';
import { Layout } from './Layout';
import { Login } from '../features/Login';
import { Dashboard } from '../features/Dashboard';
import { Devices } from '../features/Devices';
import { DeviceDetail } from '../features/DeviceDetail';
import { Enrollment } from '../features/Enrollment';
import { Policies } from '../features/Policies';
import { Applications } from '../features/Applications';
import { ManagedConfigs } from '../features/ManagedConfigs';
import { Commands } from '../features/Commands';
import { Audit } from '../features/Audit';
import { Modes } from '../features/Modes';
import { Settings } from '../features/Settings';
import { UsbLab } from '../features/UsbLab';

function Need({ perm, children }: { perm: Permission; children: ReactNode }) {
  const me = useMe();
  if (!me) return <Navigate to="/login" replace />;
  if (!can(me.role, perm))
    return (
      <div className="rounded-lg border border-line bg-panel p-8">
        <h1 className="text-lg font-bold">Tu rol no tiene acceso a esta sección</h1>
        <p className="mt-1 text-sm text-muted">Pide a un administrador de tu organización que te asigne un rol con este permiso.</p>
      </div>
    );
  return <>{children}</>;
}

export function App() {
  const me = useMe();
  return (
    <Routes>
      <Route path="/login" element={me ? <Navigate to="/" replace /> : <Login />} />
      <Route element={me ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="devices" element={<Devices />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="enrollment" element={<Need perm="enrollment.create"><Enrollment /></Need>} />
        <Route path="policies" element={<Policies />} />
        <Route path="applications" element={<Applications />} />
        <Route path="managed-configs" element={<ManagedConfigs />} />
        <Route path="commands" element={<Commands />} />
        <Route path="audit" element={<Need perm="audit.read"><Audit /></Need>} />
        <Route path="modes" element={<Modes />} />
        <Route path="usb-lab" element={<UsbLab />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
