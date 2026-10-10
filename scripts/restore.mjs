// Restauración verificada. Uso:
//   node scripts/restore.mjs <url-destino> <carpeta-del-respaldo>
// El destino debe ser una base NUEVA con las migraciones de la misma versión
// aplicadas y sin datos. Al final compara filas e integridad con el manifiesto.
import { restoreDatabase } from "./backup-lib.mjs";

const [target, dir] = process.argv.slice(2);
if (!target || !dir) {
  console.error("Uso: node scripts/restore.mjs <url-destino> <carpeta-del-respaldo>");
  process.exit(1);
}
try {
  const r = await restoreDatabase(target, dir);
  if (!r.ok) {
    console.error("RESTAURACIÓN NO VERIFICADA. No cambies la aplicación a esta base.");
    if (r.countDiffs.length) console.error("Diferencias de filas:", JSON.stringify(r.countDiffs, null, 2));
    if (r.integrityFailures.length) console.error("Fallas de integridad:", JSON.stringify(r.integrityFailures, null, 2));
    process.exit(2);
  }
  console.log(`Restauración verificada: ${Object.keys(r.counts).length} tablas con las mismas filas; integridad ${JSON.stringify(r.integrity)}.`);
} catch (error) {
  console.error(`Restauración fallida: ${error.message}`);
  process.exit(1);
}
