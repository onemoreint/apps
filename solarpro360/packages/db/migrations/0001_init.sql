-- ════════════════════════════════════════════════════════════════════════════
-- SOLARPRO 360 — Migración 0001: núcleo, seguridad multiempresa y modelo de datos
--
-- Principios aplicados:
--   • Toda entidad comercial tiene company_id y RLS activo (§4).
--   • Las referencias entre entidades de una empresa usan FK compuestas
--     (company_id, id): la base de datos impide enlazar datos de otra empresa (§32).
--   • La identidad del usuario y la empresa activa llegan como ajustes de sesión
--     (app.user_id, app.company_id) que fija la API dentro de cada transacción; las
--     funciones app.* los VERIFICAN contra la tabla de membresías (no confían ciegamente).
--   • Auditoría automática por trigger en tablas de negocio; audit_logs es de solo
--     inserción vía funciones SECURITY DEFINER (§31).
--   • Enumeraciones como TEXT + CHECK para poder ampliarlas sin migraciones complejas.
--     Deben coincidir con packages/shared/src/enums.ts.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app;

-- Rol con el que se conecta la API. Sin superusuario, sin BYPASSRLS.
-- La contraseña y LOGIN se configuran fuera de la migración (ver docs/SECURITY.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'solarpro_app') THEN
    CREATE ROLE solarpro_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- ────────────────────────────── Utilidades genéricas ──────────────────────────────

CREATE OR REPLACE FUNCTION app.touch_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.row_version := OLD.row_version + 1; -- versionado optimista para sincronización offline (§45)
  RETURN NEW;
END $$;

-- ═════════════════════════════ Datos de referencia (globales) ═════════════════════════════

CREATE TABLE currencies (
  code        char(3) PRIMARY KEY,
  name        text    NOT NULL,
  symbol      text    NOT NULL,
  decimals    smallint NOT NULL CHECK (decimals BETWEEN 0 AND 4),
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE countries (
  code                   char(2) PRIMARY KEY,
  name                   text    NOT NULL,
  tax_id_label           text    NOT NULL,          -- NIT, RIF…
  default_currency_code  char(3) NOT NULL REFERENCES currencies(code),
  region_label           text,                      -- Departamento, Estado…
  -- Campos de identificación de empresa requeridos para este país (§7).
  company_required_fields jsonb  NOT NULL DEFAULT '[]'::jsonb,
  active                 boolean NOT NULL DEFAULT true
);

CREATE TABLE roles (
  code        text PRIMARY KEY CHECK (code IN ('SUPER_ADMIN','ADMIN_EMPRESA','INGENIERO','VENDEDOR','CONSULTA')),
  name        text NOT NULL,
  description text
);

CREATE TABLE permissions (
  code        text PRIMARY KEY,
  description text
);

CREATE TABLE role_permissions (
  role_code       text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- ═════════════════════════════ Normativa versionada (§27–§30) ═════════════════════════════

CREATE TABLE regulatory_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code char(2) NOT NULL REFERENCES countries(code),
  name         text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, name)
);

CREATE TABLE regulatory_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES regulatory_profiles(id),
  version         text NOT NULL,
  name            text NOT NULL,
  effective_date  date,
  published_date  date,
  status          text NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR','VIGENTE','REEMPLAZADA','ARCHIVADA')),
  source          text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, version)
);
-- Un solo perfil vigente a la vez por perfil normativo.
CREATE UNIQUE INDEX regulatory_versions_one_active ON regulatory_versions(profile_id) WHERE status = 'VIGENTE';

-- ═════════════════════════════ Empresas, usuarios, membresías ═════════════════════════════

CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    char(2) NOT NULL REFERENCES countries(code),
  legal_name      text NOT NULL,           -- Razón social
  trade_name      text,                    -- Nombre comercial
  tax_id          text NOT NULL,           -- NIT (CO) / RIF (VE)
  address         text,
  region          text,                    -- Estado (VE) / Departamento (CO)
  city            text,
  phone           text,
  whatsapp        text,
  email           text,
  website         text,
  representative  text,
  logo_path       text,
  signature_path  text,
  status          text NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA','SUSPENDIDA','ARCHIVADA')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1,
  UNIQUE (country_code, tax_id)
);

-- users.id = id del usuario en Supabase Auth (auth.users.id). Nunca se guardan contraseñas aquí.
CREATE TABLE users (
  id              uuid PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  full_name       text,
  is_super_admin  boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1
);

CREATE TABLE company_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  role_code   text NOT NULL REFERENCES roles(code) CHECK (role_code <> 'SUPER_ADMIN'),
  status      text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  row_version integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, user_id)
);

-- ────────────────────────────── Contexto de sesión verificado ──────────────────────────────
-- SECURITY DEFINER: leen membresías aunque RLS esté activo, y nunca devuelven una empresa
-- a la que el usuario no pertenece.

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT COALESCE((
    SELECT u.is_super_admin FROM users u
    WHERE u.id = app.current_user_id() AND u.status = 'ACTIVO'
  ), false)
$$;

CREATE OR REPLACE FUNCTION app.current_company_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT m.company_id FROM company_memberships m
  JOIN companies c ON c.id = m.company_id
  WHERE m.user_id = app.current_user_id()
    AND m.company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    AND m.status = 'ACTIVO' AND c.status = 'ACTIVA'
  UNION ALL
  -- El SUPER_ADMIN puede operar dentro de cualquier empresa de forma explícita.
  SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
  WHERE app.is_super_admin()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app AS $$
  SELECT CASE WHEN app.is_super_admin() THEN 'SUPER_ADMIN' ELSE (
    SELECT m.role_code FROM company_memberships m
    WHERE m.user_id = app.current_user_id()
      AND m.company_id = app.current_company_id()
      AND m.status = 'ACTIVO'
  ) END
$$;

CREATE OR REPLACE FUNCTION app.can_write() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(app.current_role() IN ('SUPER_ADMIN','ADMIN_EMPRESA','INGENIERO','VENDEDOR'), false)
$$;

CREATE OR REPLACE FUNCTION app.is_company_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(app.current_role() IN ('SUPER_ADMIN','ADMIN_EMPRESA'), false)
$$;

-- ═════════════════════════════ Configuración por empresa (§8, §35) ═════════════════════════════

CREATE TABLE company_settings (
  company_id                  uuid PRIMARY KEY REFERENCES companies(id),
  currency_code               char(3) NOT NULL REFERENCES currencies(code),
  default_margin              numeric(8,6) CHECK (default_margin >= 0),
  margin_mode                 text NOT NULL DEFAULT 'MARKUP' CHECK (margin_mode IN ('MARKUP','GROSS_MARGIN')),
  quote_validity_days         integer CHECK (quote_validity_days > 0),
  payment_terms               text,
  warranty_terms              text,
  delivery_time               text,
  commercial_conditions       text,
  terms_and_conditions        text,
  -- Parámetros técnicos por defecto de la empresa; NULL = no configurado (el motor lo reporta).
  consumption_mismatch_threshold numeric(6,4) CHECK (consumption_mismatch_threshold >= 0),
  default_performance_ratio   numeric(6,4) CHECK (default_performance_ratio > 0 AND default_performance_ratio <= 1),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  row_version                 integer NOT NULL DEFAULT 1
);

CREATE TABLE document_settings (
  company_id     uuid PRIMARY KEY REFERENCES companies(id),
  header_text    text,
  footer_text    text,
  bank_details   text,
  warranty_text  text,
  terms_text     text,
  conditions_text text,
  validity_text  text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  row_version    integer NOT NULL DEFAULT 1
);

-- Impuestos: por país (company_id NULL, administrados por SUPER_ADMIN) o por empresa.
-- No se cargan tasas en el seed: su aplicabilidad a equipos solares depende de normas
-- vigentes que deben configurarse con fuente.
CREATE TABLE tax_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  char(2) NOT NULL REFERENCES countries(code),
  company_id    uuid REFERENCES companies(id),
  code          text NOT NULL,
  name          text NOT NULL,
  rate          numeric(8,6) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  applies_to    text NOT NULL DEFAULT 'SUBTOTAL',
  source        text,
  valid_from    date,
  valid_to      date,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1
);

-- Reglas técnicas: pertenecen a una versión normativa (país) o a una empresa (criterio interno).
CREATE TABLE technical_rules (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_version_id  uuid REFERENCES regulatory_versions(id),
  company_id             uuid REFERENCES companies(id),
  code                   text NOT NULL,
  name                   text NOT NULL,
  rule_type              text NOT NULL,            -- p. ej. DCAC_RATIO, STRING_VOLTAGE_MARGIN…
  params                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity               text NOT NULL CHECK (severity IN ('WARNING','ERROR','REVIEW_REQUIRED')),
  description            text,
  source_reference       text NOT NULL,            -- toda regla debe citar su fuente
  status                 text NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR','VIGENTE','REEMPLAZADA','ARCHIVADA')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  row_version            integer NOT NULL DEFAULT 1,
  CHECK ((regulatory_version_id IS NOT NULL) <> (company_id IS NOT NULL))
);

CREATE TABLE grid_emission_factors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  char(2) NOT NULL REFERENCES countries(code),
  kg_co2_per_kwh numeric(10,6) NOT NULL CHECK (kg_co2_per_kwh >= 0),
  year          integer,
  source        text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ═════════════════════════════ Clientes y proyectos (§10, §11) ═════════════════════════════

CREATE TABLE clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  client_type   text NOT NULL CHECK (client_type IN ('RESIDENCIAL','COMERCIAL','INDUSTRIAL','RURAL','INSTITUCIONAL','OTRO')),
  document      text,
  phone         text,
  whatsapp      text,
  email         text,
  address       text,
  city          text,
  country_code  char(2) REFERENCES countries(code),
  latitude      numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude     numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  notes         text,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  row_version   integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id)
);

CREATE TABLE projects (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid NOT NULL REFERENCES companies(id),
  client_id              uuid NOT NULL,
  name                   text NOT NULL,
  country_code           char(2) NOT NULL REFERENCES countries(code),
  city                   text,
  location               text,
  latitude               numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude              numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  installation_type      text,     -- On-grid, off-grid, híbrido… (catálogo configurable en Módulo 2)
  status                 text NOT NULL DEFAULT 'BORRADOR' CHECK (status IN (
                           'BORRADOR','DIAGNOSTICO','DIMENSIONAMIENTO','PRESUPUESTO','PROPUESTA',
                           'EN_REVISION','APROBADO','RECHAZADO','INSTALACION','FINALIZADO','CANCELADO')),
  responsible_user_id    uuid REFERENCES users(id),
  -- Versión normativa congelada con la que se elabora el proyecto (§30).
  regulatory_version_id  uuid REFERENCES regulatory_versions(id),
  notes                  text,
  created_by             uuid REFERENCES users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  row_version            integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, client_id) REFERENCES clients(company_id, id)
);

-- Recurso solar del proyecto (§15): el origen del dato viaja con él.
CREATE TABLE solar_resources (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id),
  project_id          uuid NOT NULL,
  latitude            numeric(9,6),
  longitude           numeric(9,6),
  peak_sun_hours      numeric(6,3) CHECK (peak_sun_hours > 0 AND peak_sun_hours <= 12),
  irradiation_kwh_m2_day numeric(8,4),
  source              text NOT NULL,
  method              text NOT NULL CHECK (method IN ('MEASURED','DATABASE','ESTIMATE')),
  data_updated_at     date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  row_version         integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

-- ═════════════════════════════ Diagnóstico energético (§12–§14) ═════════════════════════════

CREATE TABLE energy_diagnostics (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id),
  project_id            uuid NOT NULL,
  method                text NOT NULL CHECK (method IN ('BILL','MANUAL','LOADS','MIXED')),
  is_preliminary        boolean NOT NULL DEFAULT true,
  declared_monthly_kwh  numeric(14,4),
  bill_file_path        text,
  results               jsonb,     -- CalcResult del motor (fórmulas, variables, supuestos)
  engine_version        text,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  row_version           integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

CREATE TABLE energy_consumption (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  diagnostic_id   uuid NOT NULL,
  period          text NOT NULL,
  kwh             numeric(14,4) CHECK (kwh >= 0),  -- NULL = no disponible (nunca cero implícito)
  days            integer CHECK (days > 0 AND days <= 62),
  billed_amount   numeric(18,4),
  currency_code   char(3) REFERENCES currencies(code),
  tariff_per_kwh  numeric(18,6),
  demand_kw       numeric(12,4),
  extraction_status text NOT NULL DEFAULT 'CONFIRMADO' CHECK (extraction_status IN ('EXTRAIDO','CONFIRMADO','REVISAR','NO_DISPONIBLE')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1,
  UNIQUE (diagnostic_id, period),
  FOREIGN KEY (company_id, diagnostic_id) REFERENCES energy_diagnostics(company_id, id) ON DELETE CASCADE
);

-- Cada dato leído de una factura con su estado de extracción (§12).
CREATE TABLE bill_extracted_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  diagnostic_id   uuid NOT NULL,
  field_name      text NOT NULL,
  value_text      text,
  value_numeric   numeric(18,6),
  unit            text,
  status          text NOT NULL CHECK (status IN ('EXTRAIDO','CONFIRMADO','REVISAR','NO_DISPONIBLE')),
  confidence      numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  confirmed_by    uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id, diagnostic_id) REFERENCES energy_diagnostics(company_id, id) ON DELETE CASCADE,
  -- Un dato NO_DISPONIBLE no puede traer valor numérico.
  CHECK (status <> 'NO_DISPONIBLE' OR value_numeric IS NULL)
);

CREATE TABLE equipment_loads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  diagnostic_id   uuid NOT NULL,
  name            text NOT NULL,
  category        text,
  power_w         numeric(12,3) NOT NULL CHECK (power_w >= 0),
  quantity        numeric(10,3) NOT NULL CHECK (quantity >= 0),
  hours_per_day   numeric(5,2)  NOT NULL CHECK (hours_per_day BETWEEN 0 AND 24),
  days_per_month  numeric(5,2)  NOT NULL CHECK (days_per_month BETWEEN 0 AND 31),
  usage_factor    numeric(5,4)  NOT NULL DEFAULT 1 CHECK (usage_factor BETWEEN 0 AND 1),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id, diagnostic_id) REFERENCES energy_diagnostics(company_id, id) ON DELETE CASCADE
);

-- ═════════════════════════════ Catálogo (§17–§20, §43, §44) ═════════════════════════════
-- `components` es la tabla base de todo producto. company_id NULL = catálogo global
-- (solo SUPER_ADMIN). Las tablas tipadas guardan la ficha técnica.
-- Nunca se borran productos usados: FK RESTRICT + estado ACTIVO/INACTIVO.

CREATE TABLE suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  contact_name  text,
  phone         text,
  email         text,
  country_code  char(2) REFERENCES countries(code),
  currency_code char(3) REFERENCES currencies(code),
  notes         text,
  status        text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id)
);

CREATE TABLE components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id),
  product_type    text NOT NULL CHECK (product_type IN ('PANEL','INVERTER','BATTERY','STRUCTURE','CABLE','PROTECTION','OTHER')),
  category        text NOT NULL,           -- categoría de BOM (§21)
  brand           text,
  model           text NOT NULL,
  description     text,
  unit            text NOT NULL DEFAULT 'und',
  list_price      numeric(18,4) CHECK (list_price >= 0),
  currency_code   char(3) REFERENCES currencies(code),
  warranty        text,
  country_code    char(2) REFERENCES countries(code),
  specs           jsonb NOT NULL DEFAULT '{}'::jsonb,
  datasheet_path  text,
  status          text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  duplicated_from uuid REFERENCES components(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  row_version     integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  CHECK (list_price IS NULL OR currency_code IS NOT NULL)
);

CREATE TABLE solar_panels (
  component_id    uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id      uuid REFERENCES companies(id),
  power_w         numeric(10,3) NOT NULL CHECK (power_w > 0),
  voc_v           numeric(10,4) NOT NULL CHECK (voc_v > 0),
  vmp_v           numeric(10,4) NOT NULL CHECK (vmp_v > 0),
  isc_a           numeric(10,4) NOT NULL CHECK (isc_a > 0),
  imp_a           numeric(10,4) NOT NULL CHECK (imp_a > 0),
  temp_coeff_voc_pct  numeric(8,5),
  temp_coeff_vmp_pct  numeric(8,5),
  temp_coeff_isc_pct  numeric(8,5),
  temp_coeff_pmax_pct numeric(8,5),
  length_mm       numeric(10,2),
  width_mm        numeric(10,2),
  thickness_mm    numeric(10,2),
  weight_kg       numeric(10,3),
  technology      text,
  efficiency      numeric(6,5) CHECK (efficiency > 0 AND efficiency <= 1),
  CHECK (vmp_v < voc_v AND imp_a < isc_a),
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE inverters (
  component_id        uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id          uuid REFERENCES companies(id),
  inverter_type       text,            -- ON_GRID, OFF_GRID, HYBRID, MICRO
  nominal_ac_power_w  numeric(12,3) NOT NULL CHECK (nominal_ac_power_w > 0),
  max_ac_power_w      numeric(12,3),
  max_dc_power_w      numeric(12,3),
  max_dc_voltage_v    numeric(10,3) NOT NULL CHECK (max_dc_voltage_v > 0),
  mppt_min_v          numeric(10,3) NOT NULL CHECK (mppt_min_v > 0),
  mppt_max_v          numeric(10,3) NOT NULL,
  start_voltage_v     numeric(10,3),
  mppt_count          smallint NOT NULL CHECK (mppt_count > 0),
  -- Detalle por MPPT: [{maxInputCurrentA, maxShortCircuitCurrentA, maxStrings}]
  mppt_specs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_input_current_a numeric(10,3),
  phases              smallint NOT NULL CHECK (phases IN (1,2,3)),
  ac_voltage_v        numeric(10,3) NOT NULL,
  battery_voltage_v   numeric(10,3),
  CHECK (mppt_min_v < mppt_max_v AND mppt_max_v <= max_dc_voltage_v),
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE batteries (
  component_id      uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id        uuid REFERENCES companies(id),
  technology        text,
  capacity_kwh      numeric(10,4) NOT NULL CHECK (capacity_kwh > 0),
  nominal_voltage_v numeric(10,3) NOT NULL CHECK (nominal_voltage_v > 0),
  capacity_ah       numeric(10,3),
  depth_of_discharge numeric(5,4) NOT NULL CHECK (depth_of_discharge > 0 AND depth_of_discharge <= 1),
  round_trip_efficiency numeric(5,4) NOT NULL CHECK (round_trip_efficiency > 0 AND round_trip_efficiency <= 1),
  cycles            integer CHECK (cycles > 0),
  max_power_w       numeric(12,3),
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE structures (
  component_id  uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id    uuid REFERENCES companies(id),
  mount_type    text,        -- techo inclinado, losa, suelo, carport…
  material      text,
  panels_per_unit numeric(10,3),
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE cables (
  component_id      uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id        uuid REFERENCES companies(id),
  current_type      text CHECK (current_type IN ('DC','AC')),
  cross_section_mm2 numeric(8,3),
  awg               text,
  conductor         text,
  insulation        text,
  voltage_rating_v  numeric(10,2),
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE protections (
  component_id     uuid PRIMARY KEY REFERENCES components(id) ON DELETE RESTRICT,
  company_id       uuid REFERENCES companies(id),
  protection_type  text,    -- FUSIBLE, BREAKER, DPS, SECCIONADOR…
  current_type     text CHECK (current_type IN ('DC','AC')),
  rated_current_a  numeric(10,3),
  rated_voltage_v  numeric(10,3),
  poles            smallint,
  FOREIGN KEY (company_id, component_id) REFERENCES components(company_id, id)
);

CREATE TABLE supplier_prices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id),
  supplier_id    uuid NOT NULL,
  component_id   uuid NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
  unit_cost      numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  currency_code  char(3) NOT NULL REFERENCES currencies(code),
  price_date     date NOT NULL DEFAULT current_date,
  availability   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, supplier_id) REFERENCES suppliers(company_id, id)
);

-- ═════════════════════════════ Mano de obra y costos (§22, §23) ═════════════════════════════

CREATE TABLE labor_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  code          text NOT NULL,
  name          text NOT NULL,
  unit          text NOT NULL CHECK (unit IN ('UNIDAD','METRO','HORA','GLOBAL','KM')),
  unit_cost     numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  status        text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, code)
);

-- Catálogo de costos no materiales de la empresa (transporte, ingeniería, indirectos, otros).
CREATE TABLE costs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  category      text NOT NULL CHECK (category IN ('MATERIALES','MANO_DE_OBRA','TRANSPORTE','INGENIERIA','COSTOS_INDIRECTOS','OTROS')),
  name          text NOT NULL,
  unit          text NOT NULL,
  unit_cost     numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  status        text NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO','INACTIVO')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1
);

-- Reglas de BOM configurables por empresa (ver motor: bom/BomRule).
CREATE TABLE bom_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  category      text NOT NULL,
  component_id  uuid NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
  basis         text NOT NULL CHECK (basis IN ('PER_PANEL','PER_STRING','PER_INVERTER','PER_BATTERY','PER_KWP','PER_METER_DC','PER_METER_AC','FIXED')),
  factor        numeric(12,4) NOT NULL CHECK (factor >= 0),
  rounding      text NOT NULL DEFAULT 'CEIL' CHECK (rounding IN ('CEIL','NONE')),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1
);

-- ═════════════════════════════ Escenarios y materiales (§21, §25) ═════════════════════════════

CREATE TABLE solar_scenarios (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id),
  project_id            uuid NOT NULL,
  diagnostic_id         uuid,
  code                  text NOT NULL,
  label                 text NOT NULL,
  coverage              numeric(6,4) NOT NULL CHECK (coverage > 0 AND coverage <= 1),
  panel_component_id    uuid REFERENCES components(id) ON DELETE RESTRICT,
  inverter_component_id uuid REFERENCES components(id) ON DELETE RESTRICT,
  battery_component_id  uuid REFERENCES components(id) ON DELETE RESTRICT,
  inputs                jsonb NOT NULL DEFAULT '{}'::jsonb,
  results               jsonb,
  validation_status     text CHECK (validation_status IN ('OK','WARNING','ERROR','REVIEW_REQUIRED')),
  engine_version        text,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  row_version           integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  UNIQUE (project_id, code),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id),
  FOREIGN KEY (company_id, diagnostic_id) REFERENCES energy_diagnostics(company_id, id)
);

CREATE TABLE project_materials (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id),
  scenario_id      uuid NOT NULL,
  category         text NOT NULL,
  component_id     uuid REFERENCES components(id) ON DELETE RESTRICT,
  -- Copia de la ficha y el precio en el momento de uso (§43): el histórico no cambia si cambia el catálogo.
  component_snapshot jsonb NOT NULL,
  quantity         numeric(14,4) NOT NULL CHECK (quantity >= 0),
  unit             text NOT NULL,
  unit_cost        numeric(18,4) CHECK (unit_cost >= 0),
  total_cost       numeric(18,4) CHECK (total_cost >= 0),
  currency_code    char(3) REFERENCES currencies(code),
  supplier_id      uuid,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  row_version      integer NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id, scenario_id) REFERENCES solar_scenarios(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, supplier_id) REFERENCES suppliers(company_id, id)
);

-- ═════════════════════════════ Presupuestos (§23, §24) ═════════════════════════════

CREATE TABLE budgets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id),
  project_id       uuid NOT NULL,
  scenario_id      uuid,
  number           integer NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  cost_total       numeric(18,4) NOT NULL DEFAULT 0 CHECK (cost_total >= 0),
  margin           numeric(8,6)  NOT NULL CHECK (margin >= 0),
  margin_mode      text NOT NULL CHECK (margin_mode IN ('MARKUP','GROSS_MARGIN')),
  utility          numeric(18,4) NOT NULL DEFAULT 0,
  taxes            numeric(18,4) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
  final_price      numeric(18,4) NOT NULL DEFAULT 0 CHECK (final_price >= 0),
  taxes_detail     jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_preliminary   boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR','EMITIDO','ANULADO')),
  issued_at        timestamptz,
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  row_version      integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  UNIQUE (company_id, number),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id),
  FOREIGN KEY (company_id, scenario_id) REFERENCES solar_scenarios(company_id, id),
  -- Nunca confundir costo con precio: el precio final ≥ costo + utilidad cuando la utilidad es ≥ 0.
  CHECK (final_price = 0 OR final_price >= cost_total)
);

CREATE TABLE budget_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  budget_id     uuid NOT NULL,
  category      text NOT NULL CHECK (category IN ('MATERIALES','MANO_DE_OBRA','TRANSPORTE','INGENIERIA','COSTOS_INDIRECTOS','OTROS')),
  description   text NOT NULL,
  quantity      numeric(14,4) NOT NULL CHECK (quantity >= 0),
  unit          text NOT NULL,
  unit_cost     numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  total_cost    numeric(18,4) NOT NULL CHECK (total_cost >= 0),
  source_type   text,       -- COMPONENT, LABOR, COST, MANUAL
  source_id     uuid,
  snapshot      jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  row_version   integer NOT NULL DEFAULT 1,
  FOREIGN KEY (company_id, budget_id) REFERENCES budgets(company_id, id) ON DELETE CASCADE
);

-- ═════════════════════════════ Propuestas versionadas (§33, §34) ═════════════════════════════

CREATE TABLE proposals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id),
  project_id       uuid NOT NULL,
  title            text NOT NULL,
  status           text NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR','ENVIADA','EN_REVISION','APROBADA','RECHAZADA','VENCIDA','ANULADA')),
  current_version  integer NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  row_version      integer NOT NULL DEFAULT 1,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

-- Inmutable: una versión emitida NUNCA cambia; los cambios generan una versión nueva.
CREATE TABLE proposal_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id),
  proposal_id           uuid NOT NULL,
  version_number        integer NOT NULL CHECK (version_number > 0),
  budget_id             uuid NOT NULL,
  regulatory_version_id uuid REFERENCES regulatory_versions(id),
  -- Configuración, equipos, precios, costos, impuestos, margen y supuestos congelados.
  snapshot              jsonb NOT NULL,
  is_preliminary        boolean NOT NULL,
  pdf_path              text,
  created_by            uuid NOT NULL REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version_number),
  FOREIGN KEY (company_id, proposal_id) REFERENCES proposals(company_id, id),
  FOREIGN KEY (company_id, budget_id) REFERENCES budgets(company_id, id)
);

-- ═════════════════════════════ Auditoría (§31) ═════════════════════════════

CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  company_id  uuid,
  user_id     uuid,
  action      text NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','GENERATE_PDF','APPROVE','REJECT')),
  entity      text NOT NULL,
  entity_id   text,
  ip          inet,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_company_idx ON audit_logs(company_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity, entity_id);

CREATE OR REPLACE FUNCTION app.audit_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app AS $$
DECLARE
  v_company uuid;
  v_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN v_new := to_jsonb(NEW); END IF;
  v_company := COALESCE((v_new->>'company_id')::uuid, (v_old->>'company_id')::uuid,
                        CASE WHEN TG_TABLE_NAME = 'companies' THEN COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid) END);
  v_id := COALESCE(v_new->>'id', v_old->>'id', v_new->>'component_id', v_old->>'component_id', v_new->>'company_id', v_old->>'company_id');
  -- Evita registros vacíos: un UPDATE que no cambia nada no se audita.
  IF TG_OP = 'UPDATE' AND (v_old - 'updated_at' - 'row_version') = (v_new - 'updated_at' - 'row_version') THEN
    RETURN NULL;
  END IF;
  INSERT INTO audit_logs(company_id, user_id, action, entity, entity_id, ip, old_value, new_value)
  VALUES (
    v_company,
    app.current_user_id(),
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' ELSE TG_OP END,
    TG_TABLE_NAME, v_id,
    NULLIF(current_setting('app.ip', true), '')::inet,
    v_old, v_new
  );
  RETURN NULL;
END $$;

-- Eventos no ligados a filas (LOGIN, LOGOUT, EXPORT, GENERATE_PDF, APPROVE, REJECT).
CREATE OR REPLACE FUNCTION app.log_event(p_action text, p_entity text, p_entity_id text, p_payload jsonb DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, app AS $$
  INSERT INTO audit_logs(company_id, user_id, action, entity, entity_id, ip, new_value)
  VALUES (app.current_company_id(), app.current_user_id(), p_action, p_entity, p_entity_id,
          NULLIF(current_setting('app.ip', true), '')::inet, p_payload)
$$;

CREATE OR REPLACE FUNCTION app.forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: registro inmutable (%).', TG_TABLE_NAME, TG_OP USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.forbid_change();
CREATE TRIGGER proposal_versions_immutable BEFORE UPDATE OR DELETE ON proposal_versions
  FOR EACH ROW EXECUTE FUNCTION app.forbid_change();

-- Un presupuesto emitido no cambia en silencio (§33): solo puede anularse.
CREATE OR REPLACE FUNCTION app.lock_issued_budget() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'budgets' THEN
    IF OLD.status = 'EMITIDO' AND (
         TG_OP = 'DELETE' OR NEW.status NOT IN ('EMITIDO','ANULADO')
         OR (to_jsonb(NEW) - 'status' - 'updated_at' - 'row_version') <> (to_jsonb(OLD) - 'status' - 'updated_at' - 'row_version')
       ) THEN
      RAISE EXCEPTION 'El presupuesto % ya fue emitido; genere una nueva versión.', OLD.number USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  ELSE -- budget_items
    IF EXISTS (SELECT 1 FROM budgets b WHERE b.id = COALESCE(OLD.budget_id, NEW.budget_id) AND b.status <> 'BORRADOR') THEN
      RAISE EXCEPTION 'No se pueden modificar ítems de un presupuesto emitido.' USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER budgets_lock BEFORE UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION app.lock_issued_budget();
CREATE TRIGGER budget_items_lock BEFORE INSERT OR UPDATE OR DELETE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION app.lock_issued_budget();

-- ═════════════════════════════ Triggers genéricos ═════════════════════════════

DO $$
DECLARE t text;
BEGIN
  -- updated_at + row_version
  FOREACH t IN ARRAY ARRAY[
    'companies','users','company_memberships','company_settings','document_settings','tax_rules','technical_rules',
    'clients','projects','solar_resources','energy_diagnostics','energy_consumption','bill_extracted_fields',
    'equipment_loads','suppliers','components','labor_items','costs','bom_rules','solar_scenarios',
    'project_materials','budgets','budget_items','proposals'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app.touch_row()', t, t);
  END LOOP;

  -- Auditoría automática de cambios relevantes
  FOREACH t IN ARRAY ARRAY[
    'companies','users','company_memberships','company_settings','document_settings','tax_rules','technical_rules',
    'regulatory_profiles','regulatory_versions','clients','projects','solar_resources','energy_diagnostics',
    'energy_consumption','bill_extracted_fields','equipment_loads','project_materials','suppliers','components','solar_panels','inverters','batteries','structures','cables','protections',
    'supplier_prices','labor_items','costs','bom_rules','solar_scenarios','budgets','budget_items','proposals',
    'proposal_versions','grid_emission_factors'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION app.audit_row()', t, t);
  END LOOP;
END $$;

-- ═════════════════════════════ Row Level Security ═════════════════════════════
-- No se usa FORCE RLS: el dueño de las tablas es el rol de migraciones, cuyas funciones
-- SECURITY DEFINER (app.*) necesitan leer membresías sin recursión. La API se conecta con
-- solarpro_app, que NO es dueño y por tanto siempre queda sujeto a RLS.

-- 1) Tablas de referencia: lectura para cualquier sesión identificada; escritura solo SUPER_ADMIN.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['currencies','countries','roles','permissions','role_permissions',
                           'regulatory_profiles','regulatory_versions','grid_emission_factors'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I_read ON %I FOR SELECT USING (app.current_user_id() IS NOT NULL)$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_admin ON %I FOR ALL USING (app.is_super_admin()) WITH CHECK (app.is_super_admin())$p$, t, t);
  END LOOP;
END $$;

-- 2) Tablas de negocio con company_id obligatorio: aislamiento estricto.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','projects','solar_resources','energy_diagnostics','energy_consumption','bill_extracted_fields',
    'equipment_loads','suppliers','supplier_prices','solar_scenarios','project_materials',
    'budgets','budget_items','proposals','proposal_versions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I_tenant_read ON %I FOR SELECT
                      USING (company_id = (SELECT app.current_company_id()))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant_insert ON %I FOR INSERT
                      WITH CHECK (company_id = (SELECT app.current_company_id()) AND (SELECT app.can_write()))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant_update ON %I FOR UPDATE
                      USING (company_id = (SELECT app.current_company_id()) AND (SELECT app.can_write()))
                      WITH CHECK (company_id = (SELECT app.current_company_id()))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant_delete ON %I FOR DELETE
                      USING (company_id = (SELECT app.current_company_id()) AND (SELECT app.can_write()))$p$, t, t);
  END LOOP;
END $$;

-- 3) Configuración de la empresa: lectura para miembros; escritura solo administradores.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['company_settings','document_settings','labor_items','costs','bom_rules'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I_read ON %I FOR SELECT USING (company_id = (SELECT app.current_company_id()))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_write ON %I FOR ALL
                      USING (company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
                      WITH CHECK (company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))$p$, t, t);
  END LOOP;
END $$;

-- 4) Catálogo: filas globales (company_id NULL) visibles para todos; escritura global solo SUPER_ADMIN.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['components','solar_panels','inverters','batteries','structures','cables','protections'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I_read ON %I FOR SELECT
                      USING (company_id IS NULL AND app.current_user_id() IS NOT NULL
                             OR company_id = (SELECT app.current_company_id()))$p$, t, t);
    EXECUTE format($p$CREATE POLICY %I_write ON %I FOR ALL
                      USING ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
                             OR (company_id IS NULL AND (SELECT app.is_super_admin())))
                      WITH CHECK ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
                             OR (company_id IS NULL AND (SELECT app.is_super_admin())))$p$, t, t);
  END LOOP;
END $$;

-- 5) Impuestos y reglas técnicas: nivel país (NULL) = SUPER_ADMIN; nivel empresa = admin de la empresa.
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_rules_read ON tax_rules FOR SELECT
  USING (company_id IS NULL AND app.current_user_id() IS NOT NULL OR company_id = (SELECT app.current_company_id()));
CREATE POLICY tax_rules_write ON tax_rules FOR ALL
  USING ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
         OR (company_id IS NULL AND (SELECT app.is_super_admin())))
  WITH CHECK ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
         OR (company_id IS NULL AND (SELECT app.is_super_admin())));

ALTER TABLE technical_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY technical_rules_read ON technical_rules FOR SELECT
  USING (company_id IS NULL AND app.current_user_id() IS NOT NULL OR company_id = (SELECT app.current_company_id()));
CREATE POLICY technical_rules_write ON technical_rules FOR ALL
  USING ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
         OR (company_id IS NULL AND (SELECT app.is_super_admin())))
  WITH CHECK ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
         OR (company_id IS NULL AND (SELECT app.is_super_admin())));

-- 6) Empresas: cada usuario ve las empresas donde es miembro; solo SUPER_ADMIN crea/archiva.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_read ON companies FOR SELECT USING (
  app.is_super_admin() OR EXISTS (
    SELECT 1 FROM company_memberships m WHERE m.company_id = companies.id AND m.user_id = app.current_user_id() AND m.status = 'ACTIVO'
  ));
CREATE POLICY companies_update ON companies FOR UPDATE
  USING (id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
  WITH CHECK (id = (SELECT app.current_company_id()));
CREATE POLICY companies_admin ON companies FOR ALL USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- 7) Usuarios y membresías.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_read ON users FOR SELECT USING (
  id = app.current_user_id() OR app.is_super_admin() OR EXISTS (
    SELECT 1 FROM company_memberships m WHERE m.user_id = users.id AND m.company_id = (SELECT app.current_company_id())
  ));
CREATE POLICY users_self_update ON users FOR UPDATE USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id() AND is_super_admin = app.is_super_admin());
CREATE POLICY users_admin ON users FOR ALL USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_read ON company_memberships FOR SELECT
  USING (user_id = app.current_user_id() OR company_id = (SELECT app.current_company_id()));
CREATE POLICY memberships_write ON company_memberships FOR ALL
  USING (company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
  WITH CHECK (company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()));

-- 8) Auditoría: lectura para administradores de la empresa; nadie escribe directamente.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT USING (
  app.is_super_admin() OR (company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin())));

-- ═════════════════════════════ Privilegios del rol de la API ═════════════════════════════

GRANT USAGE ON SCHEMA public, app TO solarpro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solarpro_app;
REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM solarpro_app;
REVOKE UPDATE, DELETE ON proposal_versions FROM solarpro_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO solarpro_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO solarpro_app;
