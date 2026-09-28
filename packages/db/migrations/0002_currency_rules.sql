-- ════════════════════════════════════════════════════════════════════════════
-- SOLARPRO 360 — Migración 0002: reglas de moneda por país
--
--  • Colombia: cotiza en COP sin decimales.
--  • Venezuela: cotiza en USD; el precio final en bolívares usa
--      tasa_aplicada = tasa BCV + recargo por dólar (por defecto 200 Bs, configurable por empresa).
--  • Las tasas oficiales se registran con fecha y fuente en `exchange_rates`; nunca en el código.
-- ════════════════════════════════════════════════════════════════════════════

-- Colombia sin decimales (bases existentes; el seed ya lo crea así en bases nuevas).
UPDATE currencies SET decimals = 0 WHERE code = 'COP';

-- ── Valores por defecto del país (se copian a la empresa al crearla) ──
ALTER TABLE countries
  ADD COLUMN local_currency_code char(3) REFERENCES currencies(code),
  ADD COLUMN fx_rate_source text,
  ADD COLUMN default_fx_surcharge numeric(18,4) CHECK (default_fx_surcharge >= 0),
  ADD CONSTRAINT countries_fx_complete CHECK (
    local_currency_code IS NULL OR (fx_rate_source IS NOT NULL AND default_fx_surcharge IS NOT NULL));

-- ── Configuración de conversión por empresa ──
ALTER TABLE company_settings
  ADD COLUMN local_currency_code char(3) REFERENCES currencies(code),
  ADD COLUMN fx_rate_source text,
  ADD COLUMN fx_surcharge_per_unit numeric(18,4) CHECK (fx_surcharge_per_unit >= 0),
  ADD CONSTRAINT company_settings_fx_complete CHECK (
    local_currency_code IS NULL OR (fx_rate_source IS NOT NULL AND fx_surcharge_per_unit IS NOT NULL)),
  ADD CONSTRAINT company_settings_fx_distinct CHECK (local_currency_code IS NULL OR local_currency_code <> currency_code);

-- ── Tasas de cambio con fecha y fuente ──
-- company_id NULL = tasa publicada para toda la plataforma (SUPER_ADMIN);
-- con company_id = tasa que registra la propia empresa.
CREATE TABLE exchange_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES companies(id),
  base_currency   char(3) NOT NULL REFERENCES currencies(code),   -- USD
  quote_currency  char(3) NOT NULL REFERENCES currencies(code),   -- VES
  rate            numeric(20,8) NOT NULL CHECK (rate > 0),        -- VES por 1 USD
  source          text NOT NULL,                                  -- BCV
  rate_date       date NOT NULL,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (base_currency <> quote_currency)
);
CREATE UNIQUE INDEX exchange_rates_unique_day ON exchange_rates
  (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), base_currency, quote_currency, source, rate_date);
CREATE INDEX exchange_rates_lookup ON exchange_rates (base_currency, quote_currency, source, rate_date DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_rates_read ON exchange_rates FOR SELECT
  USING (company_id IS NULL AND app.current_user_id() IS NOT NULL OR company_id = (SELECT app.current_company_id()));
CREATE POLICY exchange_rates_write ON exchange_rates FOR INSERT
  WITH CHECK ((company_id = (SELECT app.current_company_id()) AND (SELECT app.is_company_admin()))
              OR (company_id IS NULL AND (SELECT app.is_super_admin())));
-- Una tasa registrada es histórica: no se edita ni se borra (se registra otra).
CREATE TRIGGER exchange_rates_immutable BEFORE UPDATE OR DELETE ON exchange_rates
  FOR EACH ROW EXECUTE FUNCTION app.forbid_change();
CREATE TRIGGER exchange_rates_audit AFTER INSERT ON exchange_rates
  FOR EACH ROW EXECUTE FUNCTION app.audit_row();

GRANT SELECT, INSERT ON exchange_rates TO solarpro_app;

-- ── El presupuesto congela la conversión usada ──
ALTER TABLE budgets
  ADD COLUMN local_currency_code char(3) REFERENCES currencies(code),
  ADD COLUMN fx_rate_official    numeric(20,8) CHECK (fx_rate_official > 0),
  ADD COLUMN fx_surcharge        numeric(18,4) CHECK (fx_surcharge >= 0),
  ADD COLUMN fx_rate_applied     numeric(20,8) CHECK (fx_rate_applied > 0),
  ADD COLUMN fx_rate_date        date,
  ADD COLUMN fx_source           text,
  ADD COLUMN final_price_local   numeric(20,4) CHECK (final_price_local >= 0),
  ADD CONSTRAINT budgets_fx_complete CHECK (
    local_currency_code IS NULL OR (
      fx_rate_official IS NOT NULL AND fx_surcharge IS NOT NULL AND fx_rate_applied IS NOT NULL
      AND fx_rate_date IS NOT NULL AND fx_source IS NOT NULL AND final_price_local IS NOT NULL
      AND fx_rate_applied = fx_rate_official + fx_surcharge));
