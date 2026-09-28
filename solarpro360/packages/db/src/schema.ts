/**
 * Esquema Drizzle — espejo tipado de migrations/*.sql.
 * La migración SQL es la fuente de verdad (RLS, triggers, FK compuestas);
 * test/schema-drift.test.ts verifica que este archivo y la base de datos coincidan.
 */
import {
  bigserial,
  boolean,
  char,
  date,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true });
const created = () => ts('created_at').notNull().defaultNow();
const updated = () => ts('updated_at').notNull().defaultNow();
const rowVersion = () => integer('row_version').notNull().default(1);
const pk = () => uuid('id').primaryKey().defaultRandom();
const companyRef = () => uuid('company_id').notNull();

/* ───────────── Referencia ───────────── */

export const currencies = pgTable('currencies', {
  code: char('code', { length: 3 }).primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  decimals: smallint('decimals').notNull(),
  active: boolean('active').notNull().default(true),
});

export const countries = pgTable('countries', {
  code: char('code', { length: 2 }).primaryKey(),
  name: text('name').notNull(),
  taxIdLabel: text('tax_id_label').notNull(),
  defaultCurrencyCode: char('default_currency_code', { length: 3 }).notNull(),
  regionLabel: text('region_label'),
  localCurrencyCode: char('local_currency_code', { length: 3 }),
  fxRateSource: text('fx_rate_source'),
  defaultFxSurcharge: numeric('default_fx_surcharge'),
  companyRequiredFields: jsonb('company_required_fields').$type<string[]>().notNull(),
  active: boolean('active').notNull().default(true),
});

export const roles = pgTable('roles', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  code: text('code').primaryKey(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleCode: text('role_code').notNull(),
  permissionCode: text('permission_code').notNull(),
});

export const regulatoryProfiles = pgTable('regulatory_profiles', {
  id: pk(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: created(),
});

export const regulatoryVersions = pgTable('regulatory_versions', {
  id: pk(),
  profileId: uuid('profile_id').notNull(),
  version: text('version').notNull(),
  name: text('name').notNull(),
  effectiveDate: date('effective_date'),
  publishedDate: date('published_date'),
  status: text('status').notNull().default('BORRADOR'),
  source: text('source'),
  description: text('description'),
  createdAt: created(),
});

/* ───────────── Empresas y usuarios ───────────── */

export const companies = pgTable('companies', {
  id: pk(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  legalName: text('legal_name').notNull(),
  tradeName: text('trade_name'),
  taxId: text('tax_id').notNull(),
  address: text('address'),
  region: text('region'),
  city: text('city'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  website: text('website'),
  representative: text('representative'),
  logoPath: text('logo_path'),
  signaturePath: text('signature_path'),
  status: text('status').notNull().default('ACTIVA'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  status: text('status').notNull().default('ACTIVO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const companyMemberships = pgTable('company_memberships', {
  id: pk(),
  companyId: companyRef(),
  userId: uuid('user_id').notNull(),
  roleCode: text('role_code').notNull(),
  status: text('status').notNull().default('ACTIVO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const companySettings = pgTable('company_settings', {
  companyId: uuid('company_id').primaryKey(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  defaultMargin: numeric('default_margin'),
  marginMode: text('margin_mode').notNull().default('MARKUP'),
  quoteValidityDays: integer('quote_validity_days'),
  paymentTerms: text('payment_terms'),
  warrantyTerms: text('warranty_terms'),
  deliveryTime: text('delivery_time'),
  commercialConditions: text('commercial_conditions'),
  termsAndConditions: text('terms_and_conditions'),
  consumptionMismatchThreshold: numeric('consumption_mismatch_threshold'),
  defaultPerformanceRatio: numeric('default_performance_ratio'),
  localCurrencyCode: char('local_currency_code', { length: 3 }),
  fxRateSource: text('fx_rate_source'),
  fxSurchargePerUnit: numeric('fx_surcharge_per_unit'),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const documentSettings = pgTable('document_settings', {
  companyId: uuid('company_id').primaryKey(),
  headerText: text('header_text'),
  footerText: text('footer_text'),
  bankDetails: text('bank_details'),
  warrantyText: text('warranty_text'),
  termsText: text('terms_text'),
  conditionsText: text('conditions_text'),
  validityText: text('validity_text'),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const taxRules = pgTable('tax_rules', {
  id: pk(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  companyId: uuid('company_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  rate: numeric('rate').notNull(),
  appliesTo: text('applies_to').notNull().default('SUBTOTAL'),
  source: text('source'),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  active: boolean('active').notNull().default(true),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const technicalRules = pgTable('technical_rules', {
  id: pk(),
  regulatoryVersionId: uuid('regulatory_version_id'),
  companyId: uuid('company_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  ruleType: text('rule_type').notNull(),
  params: jsonb('params').notNull(),
  severity: text('severity').notNull(),
  description: text('description'),
  sourceReference: text('source_reference').notNull(),
  status: text('status').notNull().default('BORRADOR'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const gridEmissionFactors = pgTable('grid_emission_factors', {
  id: pk(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  kgCo2PerKwh: numeric('kg_co2_per_kwh').notNull(),
  year: integer('year'),
  source: text('source').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: created(),
});

/* ───────────── Clientes y proyectos ───────────── */

export const clients = pgTable('clients', {
  id: pk(),
  companyId: companyRef(),
  name: text('name').notNull(),
  clientType: text('client_type').notNull(),
  document: text('document'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  countryCode: char('country_code', { length: 2 }),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: ts('deleted_at'),
  rowVersion: rowVersion(),
});

export const projects = pgTable('projects', {
  id: pk(),
  companyId: companyRef(),
  clientId: uuid('client_id').notNull(),
  name: text('name').notNull(),
  countryCode: char('country_code', { length: 2 }).notNull(),
  city: text('city'),
  location: text('location'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  installationType: text('installation_type'),
  status: text('status').notNull().default('BORRADOR'),
  responsibleUserId: uuid('responsible_user_id'),
  regulatoryVersionId: uuid('regulatory_version_id'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  deletedAt: ts('deleted_at'),
  rowVersion: rowVersion(),
});

export const solarResources = pgTable('solar_resources', {
  id: pk(),
  companyId: companyRef(),
  projectId: uuid('project_id').notNull(),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  peakSunHours: numeric('peak_sun_hours'),
  irradiationKwhM2Day: numeric('irradiation_kwh_m2_day'),
  source: text('source').notNull(),
  method: text('method').notNull(),
  dataUpdatedAt: date('data_updated_at'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

/* ───────────── Diagnóstico ───────────── */

export const energyDiagnostics = pgTable('energy_diagnostics', {
  id: pk(),
  companyId: companyRef(),
  projectId: uuid('project_id').notNull(),
  method: text('method').notNull(),
  isPreliminary: boolean('is_preliminary').notNull().default(true),
  declaredMonthlyKwh: numeric('declared_monthly_kwh'),
  billFilePath: text('bill_file_path'),
  results: jsonb('results'),
  engineVersion: text('engine_version'),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const energyConsumption = pgTable('energy_consumption', {
  id: pk(),
  companyId: companyRef(),
  diagnosticId: uuid('diagnostic_id').notNull(),
  period: text('period').notNull(),
  kwh: numeric('kwh'),
  days: integer('days'),
  billedAmount: numeric('billed_amount'),
  currencyCode: char('currency_code', { length: 3 }),
  tariffPerKwh: numeric('tariff_per_kwh'),
  demandKw: numeric('demand_kw'),
  extractionStatus: text('extraction_status').notNull().default('CONFIRMADO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const billExtractedFields = pgTable('bill_extracted_fields', {
  id: pk(),
  companyId: companyRef(),
  diagnosticId: uuid('diagnostic_id').notNull(),
  fieldName: text('field_name').notNull(),
  valueText: text('value_text'),
  valueNumeric: numeric('value_numeric'),
  unit: text('unit'),
  status: text('status').notNull(),
  confidence: numeric('confidence'),
  confirmedBy: uuid('confirmed_by'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const equipmentLoads = pgTable('equipment_loads', {
  id: pk(),
  companyId: companyRef(),
  diagnosticId: uuid('diagnostic_id').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  powerW: numeric('power_w').notNull(),
  quantity: numeric('quantity').notNull(),
  hoursPerDay: numeric('hours_per_day').notNull(),
  daysPerMonth: numeric('days_per_month').notNull(),
  usageFactor: numeric('usage_factor').notNull().default('1'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

/* ───────────── Catálogo ───────────── */

export const suppliers = pgTable('suppliers', {
  id: pk(),
  companyId: companyRef(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  countryCode: char('country_code', { length: 2 }),
  currencyCode: char('currency_code', { length: 3 }),
  notes: text('notes'),
  status: text('status').notNull().default('ACTIVO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const components = pgTable('components', {
  id: pk(),
  companyId: uuid('company_id'),
  productType: text('product_type').notNull(),
  category: text('category').notNull(),
  brand: text('brand'),
  model: text('model').notNull(),
  description: text('description'),
  unit: text('unit').notNull().default('und'),
  listPrice: numeric('list_price'),
  currencyCode: char('currency_code', { length: 3 }),
  warranty: text('warranty'),
  countryCode: char('country_code', { length: 2 }),
  specs: jsonb('specs').notNull(),
  datasheetPath: text('datasheet_path'),
  status: text('status').notNull().default('ACTIVO'),
  duplicatedFrom: uuid('duplicated_from'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const solarPanels = pgTable('solar_panels', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  powerW: numeric('power_w').notNull(),
  vocV: numeric('voc_v').notNull(),
  vmpV: numeric('vmp_v').notNull(),
  iscA: numeric('isc_a').notNull(),
  impA: numeric('imp_a').notNull(),
  tempCoeffVocPct: numeric('temp_coeff_voc_pct'),
  tempCoeffVmpPct: numeric('temp_coeff_vmp_pct'),
  tempCoeffIscPct: numeric('temp_coeff_isc_pct'),
  tempCoeffPmaxPct: numeric('temp_coeff_pmax_pct'),
  lengthMm: numeric('length_mm'),
  widthMm: numeric('width_mm'),
  thicknessMm: numeric('thickness_mm'),
  weightKg: numeric('weight_kg'),
  technology: text('technology'),
  efficiency: numeric('efficiency'),
});

export const inverters = pgTable('inverters', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  inverterType: text('inverter_type'),
  nominalAcPowerW: numeric('nominal_ac_power_w').notNull(),
  maxAcPowerW: numeric('max_ac_power_w'),
  maxDcPowerW: numeric('max_dc_power_w'),
  maxDcVoltageV: numeric('max_dc_voltage_v').notNull(),
  mpptMinV: numeric('mppt_min_v').notNull(),
  mpptMaxV: numeric('mppt_max_v').notNull(),
  startVoltageV: numeric('start_voltage_v'),
  mpptCount: smallint('mppt_count').notNull(),
  mpptSpecs: jsonb('mppt_specs').notNull(),
  maxInputCurrentA: numeric('max_input_current_a'),
  phases: smallint('phases').notNull(),
  acVoltageV: numeric('ac_voltage_v').notNull(),
  batteryVoltageV: numeric('battery_voltage_v'),
});

export const batteries = pgTable('batteries', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  technology: text('technology'),
  capacityKwh: numeric('capacity_kwh').notNull(),
  nominalVoltageV: numeric('nominal_voltage_v').notNull(),
  capacityAh: numeric('capacity_ah'),
  depthOfDischarge: numeric('depth_of_discharge').notNull(),
  roundTripEfficiency: numeric('round_trip_efficiency').notNull(),
  cycles: integer('cycles'),
  maxPowerW: numeric('max_power_w'),
});

export const structures = pgTable('structures', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  mountType: text('mount_type'),
  material: text('material'),
  panelsPerUnit: numeric('panels_per_unit'),
});

export const cables = pgTable('cables', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  currentType: text('current_type'),
  crossSectionMm2: numeric('cross_section_mm2'),
  awg: text('awg'),
  conductor: text('conductor'),
  insulation: text('insulation'),
  voltageRatingV: numeric('voltage_rating_v'),
});

export const protections = pgTable('protections', {
  componentId: uuid('component_id').primaryKey(),
  companyId: uuid('company_id'),
  protectionType: text('protection_type'),
  currentType: text('current_type'),
  ratedCurrentA: numeric('rated_current_a'),
  ratedVoltageV: numeric('rated_voltage_v'),
  poles: smallint('poles'),
});

export const supplierPrices = pgTable('supplier_prices', {
  id: pk(),
  companyId: companyRef(),
  supplierId: uuid('supplier_id').notNull(),
  componentId: uuid('component_id').notNull(),
  unitCost: numeric('unit_cost').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  priceDate: date('price_date').notNull(),
  availability: text('availability'),
  createdAt: created(),
});

/* ───────────── Mano de obra y costos ───────────── */

export const laborItems = pgTable('labor_items', {
  id: pk(),
  companyId: companyRef(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  unitCost: numeric('unit_cost').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  status: text('status').notNull().default('ACTIVO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const costs = pgTable('costs', {
  id: pk(),
  companyId: companyRef(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  unitCost: numeric('unit_cost').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  status: text('status').notNull().default('ACTIVO'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const bomRules = pgTable('bom_rules', {
  id: pk(),
  companyId: companyRef(),
  category: text('category').notNull(),
  componentId: uuid('component_id').notNull(),
  basis: text('basis').notNull(),
  factor: numeric('factor').notNull(),
  rounding: text('rounding').notNull().default('CEIL'),
  active: boolean('active').notNull().default(true),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

/* ───────────── Escenarios, materiales, presupuestos, propuestas ───────────── */

export const solarScenarios = pgTable('solar_scenarios', {
  id: pk(),
  companyId: companyRef(),
  projectId: uuid('project_id').notNull(),
  diagnosticId: uuid('diagnostic_id'),
  code: text('code').notNull(),
  label: text('label').notNull(),
  coverage: numeric('coverage').notNull(),
  panelComponentId: uuid('panel_component_id'),
  inverterComponentId: uuid('inverter_component_id'),
  batteryComponentId: uuid('battery_component_id'),
  inputs: jsonb('inputs').notNull(),
  results: jsonb('results'),
  validationStatus: text('validation_status'),
  engineVersion: text('engine_version'),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const projectMaterials = pgTable('project_materials', {
  id: pk(),
  companyId: companyRef(),
  scenarioId: uuid('scenario_id').notNull(),
  category: text('category').notNull(),
  componentId: uuid('component_id'),
  componentSnapshot: jsonb('component_snapshot').notNull(),
  quantity: numeric('quantity').notNull(),
  unit: text('unit').notNull(),
  unitCost: numeric('unit_cost'),
  totalCost: numeric('total_cost'),
  currencyCode: char('currency_code', { length: 3 }),
  supplierId: uuid('supplier_id'),
  note: text('note'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const budgets = pgTable('budgets', {
  id: pk(),
  companyId: companyRef(),
  projectId: uuid('project_id').notNull(),
  scenarioId: uuid('scenario_id'),
  number: integer('number').notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull(),
  costTotal: numeric('cost_total').notNull(),
  margin: numeric('margin').notNull(),
  marginMode: text('margin_mode').notNull(),
  utility: numeric('utility').notNull(),
  taxes: numeric('taxes').notNull(),
  finalPrice: numeric('final_price').notNull(),
  taxesDetail: jsonb('taxes_detail').notNull(),
  assumptions: jsonb('assumptions').notNull(),
  isPreliminary: boolean('is_preliminary').notNull().default(true),
  status: text('status').notNull().default('BORRADOR'),
  issuedAt: ts('issued_at'),
  localCurrencyCode: char('local_currency_code', { length: 3 }),
  fxRateOfficial: numeric('fx_rate_official'),
  fxSurcharge: numeric('fx_surcharge'),
  fxRateApplied: numeric('fx_rate_applied'),
  fxRateDate: date('fx_rate_date'),
  fxSource: text('fx_source'),
  finalPriceLocal: numeric('final_price_local'),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const budgetItems = pgTable('budget_items', {
  id: pk(),
  companyId: companyRef(),
  budgetId: uuid('budget_id').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unit: text('unit').notNull(),
  unitCost: numeric('unit_cost').notNull(),
  totalCost: numeric('total_cost').notNull(),
  sourceType: text('source_type'),
  sourceId: uuid('source_id'),
  snapshot: jsonb('snapshot'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const proposals = pgTable('proposals', {
  id: pk(),
  companyId: companyRef(),
  projectId: uuid('project_id').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('BORRADOR'),
  currentVersion: integer('current_version').notNull().default(0),
  createdBy: uuid('created_by'),
  createdAt: created(),
  updatedAt: updated(),
  rowVersion: rowVersion(),
});

export const proposalVersions = pgTable('proposal_versions', {
  id: pk(),
  companyId: companyRef(),
  proposalId: uuid('proposal_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  budgetId: uuid('budget_id').notNull(),
  regulatoryVersionId: uuid('regulatory_version_id'),
  snapshot: jsonb('snapshot').notNull(),
  isPreliminary: boolean('is_preliminary').notNull(),
  pdfPath: text('pdf_path'),
  createdBy: uuid('created_by').notNull(),
  createdAt: created(),
});

/* ───────────── Tasas de cambio ───────────── */

export const exchangeRates = pgTable('exchange_rates', {
  id: pk(),
  companyId: uuid('company_id'),
  baseCurrency: char('base_currency', { length: 3 }).notNull(),
  quoteCurrency: char('quote_currency', { length: 3 }).notNull(),
  rate: numeric('rate').notNull(),
  source: text('source').notNull(),
  rateDate: date('rate_date').notNull(),
  createdBy: uuid('created_by'),
  createdAt: created(),
});

/* ───────────── Auditoría ───────────── */

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  companyId: uuid('company_id'),
  userId: uuid('user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  ip: inet('ip'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: created(),
});
