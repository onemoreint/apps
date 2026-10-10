// Respaldo lógico verificado. Uso:
//   node scripts/backup.mjs <cadena-de-conexión-origen> <carpeta-destino>
// La cadena de conexión es la de PostgreSQL directa (en Supabase: Project
// Settings → Database). El respaldo contiene datos personales y clínicos:
// guárdalo cifrado y con acceso restringido (ver docs/respaldo-y-restauracion.md).
import { backupDatabase } from "./backup-lib.mjs";

const [source, out] = process.argv.slice(2);
if (!source || !out) {
  console.error("Uso: node scripts/backup.mjs <url-origen> <carpeta-destino>");
  process.exit(1);
}
try {
  const m = await backupDatabase(source, out);
  const rows = Object.values(m.counts).reduce((a, b) => a + b, 0);
  console.log(`Respaldo listo en ${out}: ${Object.keys(m.counts).length} tablas, ${rows} filas.`);
  console.log(`Integridad de origen: ${JSON.stringify(m.integrity)}`);
  console.log(`SHA-256 del archivo: ${m.dump.sha256}`);
} catch (error) {
  console.error(`Respaldo fallido: ${error.message}`);
  process.exit(1);
}
