// Criterio de aceptación 1: un usuario de una organización no puede acceder
// a datos de otra. Criterio 2 (parcial, Fase B): un cajero no tiene permisos
// clínicos. Criterio 13 (parcial): operaciones sensibles generan auditoría.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import {
  asAdmin,
  asAnon,
  closePool,
  createOrg,
  createUser,
  errorCode,
  inviteAndAccept,
  queryAs,
} from "./db";

let ownerA: string;
let ownerB: string;
let cajeroA: string;
let optoA: string;
let adminA: string;
let outsider: string;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  await prepareTestDatabase();
  ownerA = await createUser("propietaria@optica-a.test");
  ownerB = await createUser("propietario@optica-b.test");
  outsider = await createUser("sin-organizacion@test.test");
  orgA = await createOrg(ownerA, "optica-a", "Óptica A");
  orgB = await createOrg(ownerB, "optica-b", "Óptica B");
  cajeroA = await inviteAndAccept(ownerA, orgA, "cajero@optica-a.test", "cajero");
  optoA = await inviteAndAccept(ownerA, orgA, "optometra@optica-a.test", "optometra");
  adminA = await inviteAndAccept(ownerA, orgA, "admin@optica-a.test", "administrador");
});

afterAll(async () => {
  await closePool();
});

describe("aislamiento entre organizaciones (lectura)", () => {
  const tables = [
    "organizations",
    "locations",
    "memberships",
    "role_permissions",
    "org_settings",
    "audit_logs",
    "invitations",
  ] as const;

  for (const table of tables) {
    it(`${table}: la propietaria de A solo ve filas de A`, async () => {
      const column = table === "organizations" ? "id" : "organization_id";
      const res = await queryAs<{ org: string }>(ownerA, `select ${column} as org from public.${table}`);
      expect(res.rows.length).toBeGreaterThan(0);
      expect(new Set(res.rows.map((r) => r.org))).toEqual(new Set([orgA]));
    });

    it(`${table}: el propietario de B no ve ninguna fila de A`, async () => {
      const column = table === "organizations" ? "id" : "organization_id";
      const res = await queryAs(ownerB, `select 1 from public.${table} where ${column} = $1`, [orgA]);
      expect(res.rowCount).toBe(0);
    });
  }

  it("un usuario sin organización no ve organizaciones ni membresías ajenas", async () => {
    const orgs = await queryAs(outsider, "select 1 from public.organizations");
    const members = await queryAs(outsider, "select 1 from public.memberships");
    expect(orgs.rowCount).toBe(0);
    expect(members.rowCount).toBe(0);
  });

  it("los perfiles visibles se limitan a colegas de organizaciones compartidas", async () => {
    const res = await queryAs<{ id: string }>(ownerB, "select id from public.profiles");
    expect(res.rows.map((r) => r.id)).toEqual([ownerB]);
  });

  it("un visitante anónimo no tiene acceso a ninguna tabla", async () => {
    for (const table of ["organizations", "memberships", "profiles", "permissions", "audit_logs"]) {
      expect(await errorCode(asAnon((q) => q(`select 1 from public.${table}`)))).toBe("42501");
    }
  });
});

describe("aislamiento entre organizaciones (escritura)", () => {
  it("B no puede modificar los datos de A (0 filas afectadas)", async () => {
    const res = await queryAs(ownerB, "update public.organizations set trade_name = 'Hackeada' where id = $1", [orgA]);
    expect(res.rowCount).toBe(0);
    const check = await asAdmin<{ trade_name: string }>("select trade_name from public.organizations where id = $1", [orgA]);
    expect(check.rows[0]!.trade_name).toBe("Óptica A");
  });

  it("B no puede crear una sede dentro de A", async () => {
    const code = await errorCode(
      queryAs(ownerB, "insert into public.locations (organization_id, name) values ($1, 'Sede intrusa')", [orgA]),
    );
    expect(code).toBe("42501");
  });

  it("B no puede invitar usuarios ni cambiar permisos de A", async () => {
    expect(
      await errorCode(queryAs(ownerB, "select public.invite_member($1, 'x@x.test', 'administrador')", [orgA])),
    ).toBe("42501");
    expect(
      await errorCode(queryAs(ownerB, "select public.set_role_permission($1, 'cajero', 'audit.read', true)", [orgA])),
    ).toBe("42501");
  });

  it("B no puede cambiar el rol ni suspender a un miembro de A", async () => {
    const m = await asAdmin<{ id: string }>(
      "select id from public.memberships where organization_id = $1 and user_id = $2",
      [orgA, cajeroA],
    );
    const membershipId = m.rows[0]!.id;
    expect(await errorCode(queryAs(ownerB, "select public.update_member_role($1, 'administrador')", [membershipId]))).toBe("42501");
    expect(await errorCode(queryAs(ownerB, "select public.set_member_status($1, 'suspendida')", [membershipId]))).toBe("42501");
  });

  it("nadie puede insertar membresías, organizaciones ni auditoría directamente", async () => {
    expect(
      await errorCode(
        queryAs(ownerB, "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'propietario')", [orgA, ownerB]),
      ),
    ).toBe("42501");
    expect(
      await errorCode(queryAs(ownerB, "insert into public.organizations (slug, trade_name) values ('nueva-x', 'X')")),
    ).toBe("42501");
    expect(
      await errorCode(
        queryAs(ownerA, "insert into public.audit_logs (organization_id, action, entity) values ($1, 'falso', 'x')", [orgA]),
      ),
    ).toBe("42501");
  });

  it("un usuario no puede editar el perfil de otro", async () => {
    const res = await queryAs(ownerB, "update public.profiles set full_name = 'Cambiado' where id = $1", [ownerA]);
    expect(res.rowCount).toBe(0);
  });
});

describe("permisos por rol", () => {
  it("el cajero no tiene permisos clínicos", async () => {
    const res = await queryAs<{ p: string }>(cajeroA, "select public.my_permissions($1) as p", [orgA]);
    const perms = res.rows.map((r) => r.p);
    expect(perms).toContain("payments.register");
    expect(perms).not.toContain("clinical.read");
    expect(perms).not.toContain("clinical.write");
    expect(perms).not.toContain("prescription.write");
    const direct = await queryAs<{ ok: boolean }>(cajeroA, "select private.has_permission($1, 'clinical.read') as ok", [orgA]);
    expect(direct.rows[0]!.ok).toBe(false);
  });

  it("el optómetra sí tiene permisos clínicos", async () => {
    const res = await queryAs<{ ok: boolean }>(optoA, "select private.has_permission($1, 'clinical.write') as ok", [orgA]);
    expect(res.rows[0]!.ok).toBe(true);
  });

  it("la propietaria no tiene permisos clínicos por defecto", async () => {
    const res = await queryAs<{ ok: boolean }>(ownerA, "select private.has_permission($1, 'clinical.read') as ok", [orgA]);
    expect(res.rows[0]!.ok).toBe(false);
  });

  it("no se pueden asignar permisos clínicos a roles distintos de optómetra", async () => {
    for (const role of ["cajero", "asistente", "administrador"]) {
      expect(
        await errorCode(queryAs(ownerA, "select public.set_role_permission($1, $2::public.membership_role, 'clinical.read', true)", [orgA, role])),
      ).toBe("42501");
    }
  });

  it("el cajero no puede invitar usuarios ni editar la configuración", async () => {
    expect(
      await errorCode(queryAs(cajeroA, "select public.invite_member($1, 'y@y.test', 'cajero')", [orgA])),
    ).toBe("42501");
    const upd = await queryAs(cajeroA, "update public.org_settings set discount_threshold_pct = 99 where organization_id = $1", [orgA]);
    expect(upd.rowCount).toBe(0);
  });

  it("el cajero no puede leer la auditoría", async () => {
    const res = await queryAs(cajeroA, "select 1 from public.audit_logs");
    expect(res.rowCount).toBe(0);
  });

  it("el administrador no puede modificar permisos de roles (solo propietario)", async () => {
    expect(
      await errorCode(queryAs(adminA, "select public.set_role_permission($1, 'cajero', 'audit.read', true)", [orgA])),
    ).toBe("42501");
  });

  it("el administrador no puede ascender a nadie a propietario", async () => {
    const m = await asAdmin<{ id: string }>(
      "select id from public.memberships where organization_id = $1 and user_id = $2",
      [orgA, cajeroA],
    );
    expect(await errorCode(queryAs(adminA, "select public.update_member_role($1, 'propietario')", [m.rows[0]!.id]))).toBe("42501");
  });

  it("la propietaria no puede cambiar su propio rol ni dejar la óptica sin propietario", async () => {
    const m = await asAdmin<{ id: string }>(
      "select id from public.memberships where organization_id = $1 and user_id = $2",
      [orgA, ownerA],
    );
    expect(await errorCode(queryAs(ownerA, "select public.update_member_role($1, 'administrador')", [m.rows[0]!.id]))).toBe("42501");
  });

  it("los permisos personalizados aplican solo a su organización", async () => {
    await queryAs(ownerA, "select public.set_role_permission($1, 'cajero', 'reports.financial', true)", [orgA]);
    const inA = await asAdmin("select 1 from public.role_permissions where organization_id = $1 and role = 'cajero' and permission_code = 'reports.financial'", [orgA]);
    const inB = await asAdmin("select 1 from public.role_permissions where organization_id = $1 and role = 'cajero' and permission_code = 'reports.financial'", [orgB]);
    expect(inA.rowCount).toBe(1);
    expect(inB.rowCount).toBe(0);
  });

  it("un miembro suspendido pierde el acceso", async () => {
    const extra = await inviteAndAccept(ownerA, orgA, "temporal@optica-a.test", "asistente");
    const before = await queryAs(extra, "select 1 from public.organizations where id = $1", [orgA]);
    expect(before.rowCount).toBe(1);
    const m = await asAdmin<{ id: string }>(
      "select id from public.memberships where organization_id = $1 and user_id = $2",
      [orgA, extra],
    );
    await queryAs(ownerA, "select public.set_member_status($1, 'suspendida')", [m.rows[0]!.id]);
    const after = await queryAs(extra, "select 1 from public.organizations where id = $1", [orgA]);
    expect(after.rowCount).toBe(0);
    const perms = await queryAs(extra, "select public.my_permissions($1)", [orgA]);
    expect(perms.rowCount).toBe(0);
  });
});

describe("organizaciones y perfiles", () => {
  it("no se puede crear una óptica con una dirección reservada ni duplicada", async () => {
    const user = await createUser("nueva@test.test");
    expect(await errorCode(createOrg(user, "login"))).toBe("23514");
    expect(await errorCode(createOrg(user, "optica-a"))).toBe("23505");
  });

  it("un usuario no puede crear más de 3 ópticas reales", async () => {
    const user = await createUser("muchas@test.test");
    await createOrg(user, "una-optica");
    await createOrg(user, "dos-optica");
    await createOrg(user, "tres-optica");
    expect(await errorCode(createOrg(user, "cuatro-optica"))).toBe("54000");
  });

  it("el perfil copia el correo y el usuario no puede alterarlo", async () => {
    const res = await queryAs<{ email: string }>(ownerA, "select email from public.profiles where id = $1", [ownerA]);
    expect(res.rows[0]!.email).toBe("propietaria@optica-a.test");
    expect(await errorCode(queryAs(ownerA, "update public.profiles set email = 'otro@x.test' where id = $1", [ownerA]))).toBe("42501");
    await asAdmin("update auth.users set email = 'propietaria.nueva@optica-a.test' where id = $1", [ownerA]);
    const after = await queryAs<{ email: string }>(ownerA, "select email from public.profiles where id = $1", [ownerA]);
    expect(after.rows[0]!.email).toBe("propietaria.nueva@optica-a.test");
  });

  it("una sede no puede asignarse a una membresía de otra organización", async () => {
    const locB = await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1 limit 1", [orgB]);
    const code = await errorCode(
      asAdmin("update public.memberships set location_id = $1 where organization_id = $2 and user_id = $3", [locB.rows[0]!.id, orgA, cajeroA]),
    );
    expect(code).toBe("23503");
  });
});

describe("invitaciones", () => {
  it("una invitación solo la acepta el correo invitado, una vez", async () => {
    const tok = await queryAs<{ t: string }>(ownerA, "select public.invite_member($1, 'invitada@optica-a.test', 'asistente') as t", [orgA]);
    const token = tok.rows[0]!.t;
    const wrong = await createUser("otra-persona@test.test");
    expect(await errorCode(queryAs(wrong, "select public.accept_invitation($1)", [token]))).toBe("42501");

    const right = await createUser("invitada@optica-a.test");
    await queryAs(right, "select public.accept_invitation($1)", [token]);
    expect(await errorCode(queryAs(right, "select public.accept_invitation($1)", [token]))).toBe("42501");
  });

  it("no se acepta con correo sin confirmar ni con token vencido", async () => {
    const tok = await queryAs<{ t: string }>(ownerA, "select public.invite_member($1, 'sinconfirmar@optica-a.test', 'cajero') as t", [orgA]);
    const unconfirmed = await createUser("sinconfirmar@optica-a.test", { confirmed: false });
    expect(await errorCode(queryAs(unconfirmed, "select public.accept_invitation($1)", [tok.rows[0]!.t]))).toBe("42501");

    const tok2 = await queryAs<{ t: string }>(ownerA, "select public.invite_member($1, 'vencida@optica-a.test', 'cajero') as t", [orgA]);
    await asAdmin("update public.invitations set expires_at = now() - interval '1 minute' where email = 'vencida@optica-a.test'");
    const late = await createUser("vencida@optica-a.test");
    expect(await errorCode(queryAs(late, "select public.accept_invitation($1)", [tok2.rows[0]!.t]))).toBe("42501");
  });

  it("solo se guarda el hash del token", async () => {
    const tok = await queryAs<{ t: string }>(ownerA, "select public.invite_member($1, 'hash@optica-a.test', 'cajero') as t", [orgA]);
    const stored = await asAdmin("select 1 from public.invitations where token_hash = $1", [tok.rows[0]!.t]);
    expect(stored.rowCount).toBe(0);
  });
});

describe("auditoría", () => {
  it("las operaciones sensibles quedan auditadas", async () => {
    const res = await asAdmin<{ action: string }>(
      "select distinct action from public.audit_logs where organization_id = $1",
      [orgA],
    );
    const actions = res.rows.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(["organization.create", "invitation.create", "invitation.accept", "insert", "update"]));
  });

  it("los cambios de fila registran nombres de columnas, no valores", async () => {
    await queryAs(ownerA, "update public.org_settings set receipt_footer = 'Gracias por su compra' where organization_id = $1", [orgA]);
    const res = await asAdmin<{ metadata: { changed: string[] } }>(
      "select metadata from public.audit_logs where entity = 'org_settings' and organization_id = $1 order by id desc limit 1",
      [orgA],
    );
    expect(res.rows[0]!.metadata.changed).toEqual(["receipt_footer"]);
    expect(JSON.stringify(res.rows[0]!.metadata)).not.toContain("Gracias");
  });

  it("la auditoría no se puede modificar ni borrar, ni siquiera como superusuario", async () => {
    expect(await errorCode(asAdmin("update public.audit_logs set action = 'x'"))).toBe("42501");
    expect(await errorCode(asAdmin("delete from public.audit_logs"))).toBe("42501");
    expect(await errorCode(asAdmin("truncate public.audit_logs"))).toBe("42501");
  });
});

describe("control de intentos de acceso", () => {
  const email = "objetivo@optica-a.test";

  it("bloquea tras 5 fallos y solo el titular autenticado puede reiniciar", async () => {
    const target = await createUser(email);
    for (let i = 0; i < 5; i++) {
      await asAnon((q) => q("select public.record_login_failure($1)", [email]));
    }
    const guard = await asAnon((q) => q<{ g: { allowed: boolean; retry_after_seconds: number } }>("select public.login_guard($1) as g", [email.toUpperCase()]));
    expect(guard.rows[0]!.g.allowed).toBe(false);
    expect(guard.rows[0]!.g.retry_after_seconds).toBeGreaterThan(0);

    // Un anónimo no puede reiniciar el contador.
    expect(await errorCode(asAnon((q) => q("select public.clear_login_failures()")))).toBe("42501");
    // Otro usuario autenticado tampoco afecta el contador ajeno.
    await queryAs(ownerB, "select public.clear_login_failures()");
    const still = await asAnon((q) => q<{ g: { allowed: boolean } }>("select public.login_guard($1) as g", [email]));
    expect(still.rows[0]!.g.allowed).toBe(false);

    await queryAs(target, "select public.clear_login_failures()");
    const after = await asAnon((q) => q<{ g: { allowed: boolean } }>("select public.login_guard($1) as g", [email]));
    expect(after.rows[0]!.g.allowed).toBe(true);
  });

  it("los correos se guardan como hash", async () => {
    const res = await asAdmin("select 1 from private.login_failures where email_hash like '%@%'");
    expect(res.rowCount).toBe(0);
  });
});
