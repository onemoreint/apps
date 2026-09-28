/*
 * Jurisdicción Colombia. La app NO asume que una regla urbana es igual en todo el país:
 * Colombia → Departamento → Municipio → POT/PBOT/EOT → Zona → reglas aplicables.
 * Piloto: municipios del Valle de Aburrá. No se incluyen valores normativos municipales
 * porque aún no se han cargado desde fuentes oficiales verificadas.
 */

export interface MunicipalityRecord {
  name: string;
  /** reglas urbanísticas cargadas y verificadas para este municipio */
  verifiedRules: number;
}

export interface DepartmentRecord {
  name: string;
  municipalities: MunicipalityRecord[];
  note?: string;
}

export const COLOMBIA: { code: 'CO'; name: string; departments: DepartmentRecord[] } = {
  code: 'CO',
  name: 'Colombia',
  departments: [
    {
      name: 'Antioquia',
      note: 'Piloto: municipios del Valle de Aburrá.',
      municipalities: ['Barbosa', 'Girardota', 'Copacabana', 'Bello', 'Medellín', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella', 'Caldas'].map((name) => ({ name, verifiedRules: 0 })),
    },
  ],
};

export const PLANNING_INSTRUMENTS = [
  { value: '', label: 'Sin definir' },
  { value: 'POT', label: 'POT · Plan de Ordenamiento Territorial' },
  { value: 'PBOT', label: 'PBOT · Plan Básico de Ordenamiento Territorial' },
  { value: 'EOT', label: 'EOT · Esquema de Ordenamiento Territorial' },
] as const;

export function municipalityRecord(department: string, municipality: string): MunicipalityRecord | undefined {
  return COLOMBIA.departments.find((d) => d.name === department)?.municipalities.find((m) => m.name === municipality);
}
