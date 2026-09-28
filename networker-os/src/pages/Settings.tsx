import { useEffect, useRef, useState } from 'react';
import { useData } from '../app/DataContext';
import { useUI } from '../app/UIContext';
import { Icon } from '../components/Icon';
import { Callout, Field } from '../components/ui';
import { settingsRepo } from '../data/repositories';
import { DEFAULT_COMPANY, type CompanyConfig } from '../config/companyConfig';
import {
  SETTINGS,
  clearAll,
  clearDemo,
  downloadJson,
  exportBackup,
  importBackup,
  importContactsFromText,
  requestPersistence,
  seedDemo,
  type BackupFile,
} from '../services/dataService';
import { clearPin, hasPin, setPin } from '../services/pinService';
import { toDateKey } from '../utils/dates';

function Section({ icon, title, children, desc }: { icon: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="section-title"><Icon name={icon} size={18} /> {title}</h2>
      {desc && <p className="small muted" style={{ marginTop: 4 }}>{desc}</p>}
      <div className="stack" style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

export default function Settings() {
  const d = useData();
  const { toast, confirm } = useUI();
  const [userName, setUserName] = useState(d.userName);
  const [fullName, setFullName] = useState(d.userFullName);
  const [co, setCo] = useState<CompanyConfig>(d.company);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pinOn, setPinOn] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const backupInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hasPin().then(setPinOn);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  async function saveProfile() {
    await settingsRepo.set(SETTINGS.userName, userName.trim() || 'Networker');
    await settingsRepo.set(SETTINGS.userFullName, fullName.trim() || userName.trim());
    toast('Perfil guardado');
  }

  async function saveCompany() {
    await settingsRepo.set(SETTINGS.company, co);
    toast('Configuración de empresa guardada');
  }

  async function resetCompany() {
    setCo(DEFAULT_COMPANY);
    await settingsRepo.set(SETTINGS.company, null);
    toast('Empresa restablecida');
  }

  async function doExport() {
    const b = await exportBackup();
    downloadJson(b, `networker-os-respaldo-${toDateKey(new Date())}.json`);
    toast('Respaldo descargado');
  }

  async function onBackupFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const ok = await confirm({ title: 'Restaurar respaldo', message: 'Se reemplazarán los datos actuales por los del archivo. ¿Continuar?', confirmLabel: 'Restaurar', danger: true });
    if (!ok) return;
    try {
      await importBackup(JSON.parse(await f.text()) as BackupFile);
      toast('Respaldo restaurado');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Archivo no válido', 'err');
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const n = await importContactsFromText(await f.text(), f.name);
      toast(`${n} contactos importados`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo importar', 'err');
    }
  }

  async function savePin() {
    if (!/^\d{4,6}$/.test(pin1)) return toast('El PIN debe tener entre 4 y 6 dígitos', 'err');
    if (pin1 !== pin2) return toast('Los PIN no coinciden', 'err');
    await setPin(pin1);
    setPin1('');
    setPin2('');
    setPinOn(true);
    toast('PIN activado');
  }

  async function removePin() {
    const ok = await confirm({ title: 'Quitar PIN', message: 'La app dejará de pedir PIN al abrirse.', confirmLabel: 'Quitar' });
    if (!ok) return;
    await clearPin();
    setPinOn(false);
    toast('PIN desactivado');
  }

  const setC = <K extends keyof CompanyConfig>(k: K, v: CompanyConfig[K]) => setCo((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Configuración</div>
          <h1 className="page-title">Ajustes</h1>
        </div>
      </div>

      <div className="stack">
        <Section icon="user" title="Tu perfil">
          <div className="form-grid">
            <Field label="Cómo te saludamos" htmlFor="s-name">
              <input id="s-name" className="input" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </Field>
            <Field label="Nombre completo" htmlFor="s-full">
              <input id="s-full" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={saveProfile}><Icon name="check" size={15} /> Guardar</button>
          </div>
        </Section>

        <Section icon="grid" title="Empresa" desc="NETWORKER OS no está atado a una compañía: cambia estos datos para trabajar con cualquier empresa de venta directa.">
          <div className="form-grid">
            <Field label="Nombre de la empresa" htmlFor="c-name"><input id="c-name" className="input" value={co.name} onChange={(e) => setC('name', e.target.value)} /></Field>
            <Field label="Nombre corto" htmlFor="c-short"><input id="c-short" className="input" value={co.shortName} onChange={(e) => setC('shortName', e.target.value)} /></Field>
            <Field label="País principal" htmlFor="c-country"><input id="c-country" className="input" value={co.country} onChange={(e) => setC('country', e.target.value)} /></Field>
            <Field label="Moneda" htmlFor="c-cur"><input id="c-cur" className="input" value={co.currency} onChange={(e) => setC('currency', e.target.value.toUpperCase())} maxLength={3} /></Field>
            <Field label="Cómo se nombran los productos en los mensajes" htmlFor="c-cat" full><input id="c-cat" className="input" value={co.productCategory} onChange={(e) => setC('productCategory', e.target.value)} /></Field>
            <Field label="Color principal" htmlFor="c-acc"><input id="c-acc" type="color" className="input" style={{ padding: 4, height: 44 }} value={co.colors.accent} onChange={(e) => setC('colors', { ...co.colors, accent: e.target.value })} /></Field>
            <Field label="Color secundario" htmlFor="c-acc2"><input id="c-acc2" type="color" className="input" style={{ padding: 4, height: 44 }} value={co.colors.accent2} onChange={(e) => setC('colors', { ...co.colors, accent2: e.target.value })} /></Field>
            <Field label="Información comercial" htmlFor="c-info" full><textarea id="c-info" className="textarea" value={co.commercialInfo} onChange={(e) => setC('commercialInfo', e.target.value)} /></Field>
            <Field label="Enlace principal" htmlFor="c-link" full>
              <input
                id="c-link"
                className="input"
                type="url"
                value={co.links[0]?.url ?? ''}
                onChange={(e) => setC('links', [{ label: co.links[0]?.label ?? 'Sitio', url: e.target.value }, ...co.links.slice(1)])}
              />
            </Field>
          </div>
          <details>
            <summary className="small muted" style={{ cursor: 'pointer' }}>Productos configurados ({co.products.length})</summary>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr className="faint" style={{ textAlign: 'left' }}><th style={{ padding: 6 }}>Producto</th><th>Cliente</th><th>Distribuidor</th></tr></thead>
                <tbody>
                  {co.products.map((p) => (
                    <tr key={p.name} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 6 }}>{p.name}</td>
                      <td className="num">{p.priceClient} {co.currency}</td>
                      <td className="num">{p.priceDistributor} {co.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <Callout tone="warn">{co.complianceNote}</Callout>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={resetCompany}>Restablecer</button>
            <button className="btn btn-primary btn-sm" onClick={saveCompany}><Icon name="check" size={15} /> Guardar empresa</button>
          </div>
        </Section>

        <Section icon="download" title="Datos y respaldo" desc="Tus datos viven solo en este dispositivo y navegador. Nada se envía a servidores externos.">
          <Callout tone={persisted ? 'good' : 'warn'}>
            {persisted ? 'Almacenamiento persistente activado: el navegador no borrará tus datos automáticamente.' : 'El navegador podría borrar los datos si le falta espacio. Instala la app y haz respaldos periódicos.'}
            {!persisted && (
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-sm" onClick={async () => { const ok = await requestPersistence(); setPersisted(ok); toast(ok ? 'Almacenamiento persistente activado' : 'El navegador no lo permitió todavía. Instalar la app ayuda.', ok ? 'ok' : 'err'); }}>
                  Solicitar almacenamiento persistente
                </button>
              </div>
            )}
          </Callout>
          <div className="row-wrap">
            <button className="btn btn-primary btn-sm" onClick={doExport}><Icon name="download" size={15} /> Descargar respaldo</button>
            <button className="btn btn-sm" onClick={() => backupInput.current?.click()}><Icon name="upload" size={15} /> Restaurar respaldo</button>
            <button className="btn btn-sm" onClick={() => importInput.current?.click()}><Icon name="users" size={15} /> Importar contactos (JSON/CSV)</button>
          </div>
          <p className="tiny faint">El importador reconoce archivos exportados de NETWORKER CRM y CSV con columnas como nombre, apellido, teléfono, ciudad, país, estado, notas.</p>
          <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={onBackupFile} />
          <input ref={importInput} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={onImportFile} />
          <div className="divider" />
          <div className="row-wrap">
            {d.demoActive ? (
              <button className="btn btn-sm" onClick={async () => { if (await confirm({ title: 'Borrar datos demo', message: 'Se eliminan solo los datos de demostración.', confirmLabel: 'Borrar demo', danger: true })) { await clearDemo(); toast('Datos demo eliminados'); } }}>
                Borrar datos demo
              </button>
            ) : (
              <button className="btn btn-sm" onClick={async () => { await seedDemo(); toast('Datos demo cargados'); }}>Cargar datos demo</button>
            )}
            <button className="btn btn-sm btn-danger" onClick={async () => { if (await confirm({ title: 'Borrar todo', message: 'Se eliminarán TODOS los contactos, historial, equipo y retos. Descarga un respaldo antes si lo necesitas.', confirmLabel: 'Borrar todo', danger: true })) { await clearAll(); toast('Datos eliminados'); } }}>
              <Icon name="trash" size={15} /> Borrar todos los datos
            </button>
          </div>
        </Section>

        <Section icon="lock" title="PIN de acceso" desc="Opcional. Pide un PIN al abrir la app. Se guarda solo un hash seguro (PBKDF2), nunca el PIN. No cifra los datos: evita accesos casuales en un dispositivo compartido.">
          {pinOn ? (
            <div className="row">
              <span className="badge badge-good"><Icon name="check" size={13} /> PIN activado</span>
              <span className="spacer" />
              <button className="btn btn-sm" onClick={removePin}>Quitar PIN</button>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <Field label="Nuevo PIN (4-6 dígitos)" htmlFor="p1"><input id="p1" className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))} /></Field>
                <Field label="Repite el PIN" htmlFor="p2"><input id="p2" className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} /></Field>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={savePin} disabled={!pin1 || !pin2}>Activar PIN</button>
              </div>
            </>
          )}
        </Section>

        <Section icon="phone" title="Instalar en tu teléfono">
          <p className="small muted"><b style={{ color: 'var(--text)' }}>Android (Chrome):</b> menú ⋮ → "Instalar app" o "Agregar a pantalla principal".</p>
          <p className="small muted"><b style={{ color: 'var(--text)' }}>iPhone (Safari):</b> botón Compartir → "Agregar a inicio".</p>
          <p className="small muted">Instalada, funciona sin conexión y el sistema protege mejor tus datos.</p>
        </Section>

        <p className="tiny faint" style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          NETWORKER OS v1.0 · El sistema operativo inteligente para networkers · Datos 100% locales
        </p>
      </div>
    </>
  );
}
