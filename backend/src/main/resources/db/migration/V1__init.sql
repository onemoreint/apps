-- Android Control Center — esquema inicial (Fase 3 del plan, adelantado como base).
-- Multi-tenant: toda tabla de negocio tiene organization_id y Row Level Security.
-- La aplicación fija la organización de la sesión con:
--   SET LOCAL app.current_org = '<uuid>';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organization (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   VARCHAR(120) NOT NULL,
    slug                   VARCHAR(60)  NOT NULL UNIQUE,
    mode                   VARCHAR(16)  NOT NULL DEFAULT 'DEMO' CHECK (mode IN ('AMAPI', 'LAB', 'DEMO')),
    amapi_enterprise_name  VARCHAR(120),
    pubsub_topic           VARCHAR(255),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE role (
    code        VARCHAR(20) PRIMARY KEY,
    permissions JSONB NOT NULL
);

INSERT INTO role (code, permissions) VALUES
 ('SUPER_ADMIN', '["org.manage","users.manage","policies.write","policies.assign","apps.write","enrollment.create","devices.read","devices.write","commands.basic","commands.reboot","commands.wipe","devices.retire","audit.read"]'),
 ('ADMIN',       '["users.manage","policies.write","policies.assign","apps.write","enrollment.create","devices.read","devices.write","commands.basic","commands.reboot","commands.wipe","devices.retire","audit.read"]'),
 ('OPERATOR',    '["devices.read","devices.write","policies.assign","enrollment.create","commands.basic"]'),
 ('AUDITOR',     '["devices.read","audit.read"]'),
 ('VIEWER',      '["devices.read"]');

CREATE TABLE app_user (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organization(id) ON DELETE CASCADE, -- NULL = superadministrador de plataforma
    email            VARCHAR(254) NOT NULL,
    display_name     VARCHAR(120) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,               -- Argon2id, nunca texto plano
    mfa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_enc   BYTEA,                               -- cifrado en la aplicación
    status           VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED')),
    failed_logins    INT NOT NULL DEFAULT 0,
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_user_email ON app_user (lower(email));

CREATE TABLE user_role (
    user_id   UUID REFERENCES app_user(id) ON DELETE CASCADE,
    role_code VARCHAR(20) REFERENCES role(code),
    PRIMARY KEY (user_id, role_code)
);

CREATE TABLE refresh_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    family_id   UUID NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  VARCHAR(255),
    ip          INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_family ON refresh_token (family_id);

CREATE TABLE policy (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name                  VARCHAR(80)  NOT NULL,
    description           VARCHAR(300) NOT NULL DEFAULT '',
    risk_level            VARCHAR(8)   NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    status                VARCHAR(10)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    spec                  JSONB NOT NULL,
    provider_policy_name  VARCHAR(255),
    version               INT NOT NULL DEFAULT 1,
    created_by            UUID REFERENCES app_user(id),
    updated_by            UUID REFERENCES app_user(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);

CREATE TABLE device (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name                  VARCHAR(80) NOT NULL,
    provider_device_name  VARCHAR(255),
    management_mode       VARCHAR(20) NOT NULL CHECK (management_mode IN ('NORMAL_APP','DEVICE_ADMIN','WORK_PROFILE','FULLY_MANAGED','DEDICATED','LAB_DEVICE_OWNER')),
    state                 VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','ONLINE','OFFLINE','RETIRED')),
    compliance            VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN' CHECK (compliance IN ('COMPLIANT','NON_COMPLIANT','UNKNOWN')),
    manufacturer          VARCHAR(64),
    model                 VARCHAR(64),
    os_version            VARCHAR(16),
    sdk_int               INT,
    serial                VARCHAR(64),
    battery_pct           SMALLINT CHECK (battery_pct BETWEEN 0 AND 100),
    storage_free_mb       BIGINT,
    storage_total_mb      BIGINT,
    memory_free_mb        BIGINT,
    agent_version         VARCHAR(32),
    agent_public_key      TEXT,
    policy_id             UUID REFERENCES policy(id) ON DELETE SET NULL,
    tags                  TEXT[] NOT NULL DEFAULT '{}',
    last_seen_at          TIMESTAMPTZ,
    enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);
CREATE INDEX ix_device_org_state ON device (organization_id, state);
CREATE INDEX ix_device_tags ON device USING GIN (tags);

CREATE TABLE device_enrollment (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    method               VARCHAR(16) NOT NULL CHECK (method IN ('QR','TOKEN','ZERO_TOUCH','WORK_PROFILE','LAB_QR','LAB_ADB')),
    scenario             VARCHAR(12) NOT NULL CHECK (scenario IN ('CORPORATE','DEDICATED','COPE','BYOD','LAB')),
    token_hash           VARCHAR(128) NOT NULL UNIQUE,
    provider_token_name  VARCHAR(255),
    policy_id            UUID REFERENCES policy(id) ON DELETE SET NULL,
    device_id            UUID REFERENCES device(id) ON DELETE SET NULL,
    created_by           UUID REFERENCES app_user(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ NOT NULL,
    used_at              TIMESTAMPTZ
);

CREATE TABLE device_capability (
    device_id        UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    organization_id  UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    capability_code  VARCHAR(24) NOT NULL,
    status           VARCHAR(12) NOT NULL CHECK (status IN ('SUPPORTED','PARTIAL','UNSUPPORTED')),
    reason           VARCHAR(255),
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id, capability_code)
);

CREATE TABLE policy_assignment (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    policy_id        UUID NOT NULL REFERENCES policy(id) ON DELETE CASCADE,
    target_type      VARCHAR(8) NOT NULL CHECK (target_type IN ('DEVICE','TAG')),
    target_id        VARCHAR(80) NOT NULL,
    applied_version  INT,
    applied_at       TIMESTAMPTZ,
    status           VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPLIED','FAILED'))
);

CREATE TABLE application (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    package_name     VARCHAR(255) NOT NULL CHECK (package_name ~ '^[a-zA-Z][A-Za-z0-9_]*(\.[a-zA-Z][A-Za-z0-9_]*)+$'),
    display_name     VARCHAR(120) NOT NULL,
    version          VARCHAR(40),
    install_type     VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE' CHECK (install_type IN ('AVAILABLE','FORCE_INSTALLED','BLOCKED','KIOSK')),
    permissions      JSONB NOT NULL DEFAULT '[]',
    UNIQUE (organization_id, package_name)
);

CREATE TABLE application_configuration (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    application_id   UUID NOT NULL REFERENCES application(id) ON DELETE CASCADE,
    config_key       VARCHAR(64) NOT NULL CHECK (config_key ~ '^[a-z][a-z0-9_]{1,63}$'),
    name             VARCHAR(120) NOT NULL,
    description      VARCHAR(300) NOT NULL DEFAULT '',
    value_type       VARCHAR(12) NOT NULL CHECK (value_type IN ('STRING','BOOL','INTEGER','FLOAT','STRING_ARRAY')),
    value            JSONB NOT NULL,
    UNIQUE (application_id, config_key)
);

CREATE TABLE command (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    device_id                UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    type                     VARCHAR(24) NOT NULL CHECK (type IN ('GET_DEVICE_INFO','SYNC_POLICY','SYNC_APPLICATIONS','REFRESH_CONFIGURATION','SYNC_NOW','LOCK_DEVICE','REBOOT_DEVICE','WIPE_DEVICE')),
    params                   JSONB NOT NULL DEFAULT '{}',
    status                   VARCHAR(10) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','SUCCEEDED','FAILED','CANCELLED','EXPIRED')),
    provider_operation_name  VARCHAR(255),
    requested_by             UUID NOT NULL REFERENCES app_user(id),
    confirmed_by             UUID REFERENCES app_user(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at               TIMESTAMPTZ NOT NULL,
    -- Los comandos destructivos exigen confirmación registrada.
    CONSTRAINT wipe_requires_confirmation CHECK (type <> 'WIPE_DEVICE' OR confirmed_by IS NOT NULL)
);
CREATE INDEX ix_command_device ON command (device_id, created_at DESC);

CREATE TABLE command_result (
    command_id     UUID PRIMARY KEY REFERENCES command(id) ON DELETE CASCADE,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    response       JSONB,
    error_code     VARCHAR(64),
    error_message  VARCHAR(500)
);

CREATE TABLE device_heartbeat (
    id             BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    device_id      UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    battery_pct    SMALLINT,
    network_type   VARCHAR(16),
    agent_version  VARCHAR(32)
);
CREATE INDEX ix_heartbeat_device ON device_heartbeat (device_id, received_at DESC);

CREATE TABLE audit_event (
    id               BIGSERIAL PRIMARY KEY,
    organization_id  UUID REFERENCES organization(id) ON DELETE SET NULL,
    actor_user_id    UUID REFERENCES app_user(id) ON DELETE SET NULL,
    actor_type       VARCHAR(8) NOT NULL CHECK (actor_type IN ('USER','DEVICE','SYSTEM')),
    action           VARCHAR(64) NOT NULL,
    target_type      VARCHAR(32),
    target_id        VARCHAR(80),
    device_id        UUID,
    ip               INET,
    user_agent       VARCHAR(255),
    result           VARCHAR(8) NOT NULL CHECK (result IN ('SUCCESS','DENIED','ERROR')),
    details          JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_org_time ON audit_event (organization_id, created_at DESC);

-- Auditoría de solo inserción: prohibido modificar o borrar eventos.
CREATE FUNCTION audit_event_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_event es de solo inserción';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_event
    FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();

-- Row Level Security: cada sesión solo ve filas de su organización.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['policy','device','device_enrollment','device_capability','policy_assignment',
                             'application','application_configuration','command','device_heartbeat','audit_event']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (organization_id = current_setting(''app.current_org'', true)::uuid)',
            t);
    END LOOP;
END $$;
