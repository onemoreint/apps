import postgres from 'postgres';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@solarpro/shared';

/**
 * Seed de datos de referencia. Idempotente (se puede correr varias veces).
 *
 * Qué SÍ se carga: monedas (ISO 4217), países Colombia y Venezuela con los campos de
 * identificación de empresa del documento de requisitos (§7), roles y permisos, y un
 * perfil normativo por país en estado BORRADOR.
 *
 * Qué NO se carga, a propósito: tasas de impuestos, reglas técnicas, factores de emisión,
 * productos o precios. Esos datos deben cargarse con su fuente por un responsable
 * (regla §50: no inventar reglas técnicas ni normativas, no introducir datos ficticios).
 */

const CURRENCIES = [
  // COP sin decimales (decisión comercial para Colombia). VES y USD con 2 (ISO 4217).
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimals: 0 },
  { code: 'VES', name: 'Bolívar venezolano', symbol: 'Bs.', decimals: 2 },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', decimals: 2 },
];

const COUNTRIES = [
  {
    code: 'CO',
    name: 'Colombia',
    tax_id_label: 'NIT',
    default_currency_code: 'COP',
    local_currency_code: null,
    fx_rate_source: null,
    default_fx_surcharge: null,
    region_label: 'Departamento',
    company_required_fields: [
      'legal_name', 'trade_name', 'tax_id', 'address', 'city', 'phone', 'whatsapp',
      'email', 'website', 'representative', 'logo_path', 'signature_path',
    ],
  },
  {
    code: 'VE',
    name: 'Venezuela',
    tax_id_label: 'RIF',
    // Venezuela cotiza en USD; el precio final en Bs = USD × (tasa BCV + recargo).
    default_currency_code: 'USD',
    local_currency_code: 'VES',
    fx_rate_source: 'BCV',
    default_fx_surcharge: 200,
    region_label: 'Estado',
    company_required_fields: [
      'legal_name', 'trade_name', 'tax_id', 'address', 'region', 'city', 'phone', 'whatsapp',
      'email', 'logo_path', 'representative', 'signature_path',
    ],
  },
];

const ROLE_NAMES: Record<string, [string, string]> = {
  SUPER_ADMIN: ['Super administrador', 'Control total de la plataforma'],
  ADMIN_EMPRESA: ['Administrador de empresa', 'Configura la empresa, usuarios, catálogos y precios'],
  INGENIERO: ['Ingeniero', 'Diagnóstico, dimensionamiento y revisión técnica'],
  VENDEDOR: ['Vendedor', 'Clientes, diagnósticos preliminares, presupuestos y propuestas'],
  CONSULTA: ['Consulta', 'Solo lectura'],
};

const REGULATORY_PROFILES = [
  {
    country: 'CO',
    name: 'Perfil normativo Colombia',
    description:
      'Marco técnico-normativo para instalaciones fotovoltaicas en Colombia. Las reglas deben cargarse por versión, citando su fuente, por un profesional responsable. El sistema no certifica cumplimiento.',
  },
  {
    country: 'VE',
    name: 'Perfil normativo Venezuela',
    description:
      'Perfil independiente para Venezuela. No reutiliza reglas de Colombia. Las reglas deben cargarse por versión, citando su fuente, por un profesional responsable.',
  },
];

export async function seed(adminUrl: string, log: (m: string) => void = console.log): Promise<void> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      for (const c of CURRENCIES) {
        await tx`INSERT INTO currencies ${tx(c)} ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, decimals = EXCLUDED.decimals`;
      }
      for (const c of COUNTRIES) {
        await tx`
          INSERT INTO countries (code, name, tax_id_label, default_currency_code, local_currency_code, fx_rate_source,
                                 default_fx_surcharge, region_label, company_required_fields)
          VALUES (${c.code}, ${c.name}, ${c.tax_id_label}, ${c.default_currency_code}, ${c.local_currency_code}, ${c.fx_rate_source},
                  ${c.default_fx_surcharge}, ${c.region_label}, ${tx.json(c.company_required_fields)})
          ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, tax_id_label = EXCLUDED.tax_id_label,
            default_currency_code = EXCLUDED.default_currency_code, local_currency_code = EXCLUDED.local_currency_code,
            fx_rate_source = EXCLUDED.fx_rate_source, default_fx_surcharge = EXCLUDED.default_fx_surcharge,
            region_label = EXCLUDED.region_label, company_required_fields = EXCLUDED.company_required_fields`;
      }
      for (const r of ROLES) {
        const [name, description] = ROLE_NAMES[r]!;
        await tx`INSERT INTO roles (code, name, description) VALUES (${r}, ${name}, ${description})
                 ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`;
      }
      for (const p of PERMISSIONS) {
        await tx`INSERT INTO permissions (code) VALUES (${p}) ON CONFLICT DO NOTHING`;
      }
      // La matriz de la BD se sincroniza exactamente con la del código.
      await tx`DELETE FROM role_permissions`;
      for (const r of ROLES) {
        for (const p of ROLE_PERMISSIONS[r]) {
          await tx`INSERT INTO role_permissions (role_code, permission_code) VALUES (${r}, ${p})`;
        }
      }
      for (const rp of REGULATORY_PROFILES) {
        const [profile] = await tx<{ id: string }[]>`
          INSERT INTO regulatory_profiles (country_code, name, description)
          VALUES (${rp.country}, ${rp.name}, ${rp.description})
          ON CONFLICT (country_code, name) DO UPDATE SET description = EXCLUDED.description
          RETURNING id`;
        await tx`
          INSERT INTO regulatory_versions (profile_id, version, name, status, description)
          VALUES (${profile!.id}, '0.0-borrador', 'Pendiente de configuración', 'BORRADOR',
                  'Versión inicial vacía. Cargar reglas técnicas con fuente antes de marcar como VIGENTE.')
          ON CONFLICT (profile_id, version) DO NOTHING`;
      }
    });
    log('✔ seed de referencia aplicado (monedas, países CO/VE, roles, permisos, perfiles normativos).');
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) {
    console.error('Falta DATABASE_ADMIN_URL');
    process.exit(1);
  }
  seed(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
