import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PageHeader, Panel } from '../components/ui';

const REPO = 'https://github.com/onemoreint/apps/tree/android-control-center';
const APK = 'https://github.com/onemoreint/apps/releases/download/acc-agent-latest/acc-agent.apk';
const RX = 'com.acc.agent/.lab.AccDeviceAdminReceiver';
const CMD = (c: string, extra = '') => `adb shell am broadcast -a com.acc.agent.COMMAND -n com.acc.agent/.lab.AdbCommandReceiver --es cmd ${c}${extra}`;

function Code({ children }: { children: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="group relative mt-2">
      <pre className="overflow-x-auto rounded-md bg-spruce px-4 py-3 pr-12 text-[13px] leading-relaxed text-mint">{children}</pre>
      <button
        className="absolute top-2 right-2 rounded p-1.5 text-mint/70 hover:bg-spruce-2 hover:text-white"
        aria-label="Copiar"
        onClick={() => {
          navigator.clipboard?.writeText(children);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export const USB_COMMANDS: [string, string, string][] = [
  ['status', 'Muestra si el agente es Device Owner, la versión de Android y las restricciones activas.', 'status'],
  ['lock', 'Bloquea la pantalla de inmediato.', 'lock'],
  ['camera_off', 'Desactiva la cámara para todas las apps.', 'camera-off'],
  ['camera_on', 'Vuelve a activar la cámara.', 'camera-on'],
  ['screenshots_off', 'Impide capturas y grabaciones de pantalla.', 'screenshots-off'],
  ['screenshots_on', 'Vuelve a permitir capturas.', 'screenshots-on'],
  ['bluetooth_off', 'Bloquea el Bluetooth (DISALLOW_BLUETOOTH).', 'bluetooth-off'],
  ['bluetooth_on', 'Quita el bloqueo de Bluetooth.', 'bluetooth-on'],
  ['usb_files_off', 'Bloquea la transferencia de archivos por USB. adb sigue funcionando.', 'usb-files-off'],
  ['usb_files_on', 'Vuelve a permitir transferir archivos por USB.', 'usb-files-on'],
  ['install_off', 'Impide instalar apps de orígenes desconocidos.', 'install-off'],
  ['install_on', 'Quita esa restricción.', 'install-on'],
  ['reboot', 'Reinicia el teléfono (Device Owner, Android 7+).', 'reboot'],
  ['release', 'Quita todas las restricciones y deja de ser Device Owner. Después se puede desinstalar.', 'release'],
];

export function UsbLab() {
  return (
    <>
      <PageHeader
        title="Laboratorio USB"
        intro="Convierte el agente en Device Owner de tu propio teléfono y contrólalo desde tu computador con un cable. Probado como guía para el Honor X8D; sirve para cualquier Android 8 o superior."
      />

      <div className="mb-6 rounded-lg border border-caution bg-caution-soft px-5 py-4 text-sm">
        <p className="font-semibold">Antes de empezar</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Android solo acepta un Device Owner si el teléfono no tiene cuentas. Tendrás que quitar tus cuentas de Google y Honor temporalmente; tus fotos, apps y archivos se conservan, pero haz una copia de seguridad igualmente.</li>
          <li>El agente de laboratorio no tiene borrado remoto: esa función está desactivada a propósito para que no puedas perder tus datos por error.</li>
          <li>Puedes deshacer todo en cualquier momento con el comando <code>release</code> (paso 7).</li>
        </ul>
      </div>

      <ol className="space-y-4">
        <Step n={1} title="Instala ADB en tu computador">
          <p>
            Descarga las{' '}
            <a className="font-semibold text-managed underline" href="https://developer.android.com/tools/releases/platform-tools">Android SDK Platform-Tools</a>{' '}
            para Windows, macOS o Linux, descomprímelas y abre una terminal en esa carpeta.
          </p>
        </Step>

        <Step n={2} title="Activa la depuración USB en el Honor X8D">
          <p>Ajustes › Acerca del teléfono › toca 7 veces Número de compilación. Luego: Ajustes › Sistema y actualizaciones › Opciones de desarrollador › activa Depuración USB.</p>
          <p className="mt-2">Conecta el cable, elige «Transferir archivos» y acepta el aviso «¿Permitir depuración USB?». Comprueba la conexión:</p>
          <Code>adb devices</Code>
          <p className="mt-2 text-muted">Debe aparecer una línea con el número del teléfono y la palabra device.</p>
        </Step>

        <Step n={3} title="Descarga el agente">
          <p>
            Descarga <a className="font-semibold text-managed underline" href={APK}>acc-agent.apk</a> desde la última versión publicada y guárdalo en la carpeta de platform-tools. También puedes usar los scripts{' '}
            <a className="font-semibold text-managed underline" href={`${REPO}/tools`}>acc-usb.ps1 (Windows) y acc-usb.sh (Mac/Linux)</a>, que ejecutan estos mismos comandos.
          </p>
        </Step>

        <Step n={4} title="Quita las cuentas y los usuarios extra">
          <p>Ajustes › Usuarios y cuentas: elimina la cuenta de Google y el ID de Honor. Si usas App Twin, Espacio privado u otro usuario, elimínalos también. Comprueba que solo quede el usuario principal:</p>
          <Code>adb shell pm list users</Code>
          <p className="mt-2 text-muted">Debe mostrar un único UserInfo&#123;0:...&#125;.</p>
        </Step>

        <Step n={5} title="Instala el agente y hazlo Device Owner">
          <Code>{`adb install -r acc-agent.apk\nadb shell dpm set-device-owner ${RX}`}</Code>
          <p className="mt-2">
            Si ves «Success: Device owner set», ya está. Si ves «already some accounts on the device», vuelve al paso 4. Ahora puedes volver a añadir tus cuentas de Google y Honor.
          </p>
        </Step>

        <Step n={6} title="Controla el teléfono por USB">
          <p>Cada comando devuelve el resultado en la terminal (línea <code>data=</code>). Ejemplo:</p>
          <Code>{CMD('status')}</Code>
          <Panel className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead><tr><th>cmd</th><th>Qué hace</th><th>Con el script</th></tr></thead>
                <tbody>
                  {USB_COMMANDS.map(([c, what, script]) => (
                    <tr key={c}>
                      <td><code className="rounded bg-paper px-1.5 py-0.5 text-xs whitespace-nowrap">{c}</code></td>
                      <td>{what}</td>
                      <td><code className="text-xs whitespace-nowrap text-muted">acc-usb {script}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <p className="mt-3 text-muted">
            El receptor de comandos está protegido con el permiso del sistema DUMP: solo el shell de adb puede usarlo, ninguna otra app del teléfono.
          </p>
        </Step>

        <Step n={7} title="Deshaz todo cuando termines">
          <Code>{`${CMD('release')}\nadb uninstall com.acc.agent`}</Code>
        </Step>
      </ol>

      <Panel title="Si algo no funciona" className="mt-6">
        <dl className="divide-y divide-line text-sm">
          {[
            ['«Not allowed to set the device owner because there are already some accounts»', 'Queda alguna cuenta. Revisa Ajustes › Usuarios y cuentas, y también cuentas de apps como WhatsApp Business o correo.'],
            ['«Not allowed to set the device owner because there are already several users»', 'Hay App Twin o un espacio privado. Elimínalo y repite pm list users.'],
            ['adb devices no muestra el teléfono', 'Cambia el modo USB a «Transferir archivos», prueba otro cable y acepta el aviso de depuración en el teléfono.'],
            ['El comando responde «No es Device Owner»', 'El paso 5 no se completó. Ejecuta de nuevo dpm set-device-owner.'],
          ].map(([q, a]) => (
            <div key={q} className="px-4 py-3">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-0.5 text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-spruce font-bold text-paper">{n}</span>
      <div className="min-w-0 rounded-lg border border-line bg-panel p-4 text-sm">
        <h2 className="mb-1 text-base font-bold">{title}</h2>
        {children}
      </div>
    </li>
  );
}
