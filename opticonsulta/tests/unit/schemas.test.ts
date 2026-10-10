// Criterio 11: los formularios validan campos obligatorios y dan errores útiles.
import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, safeNextPath, signupSchema } from "@/modules/auth/schemas";
import {
  RESERVED_SLUGS,
  onboardingSchema,
  settingsSchema,
  slugSchema,
  suggestSlug,
} from "@/modules/organizations/schemas";
import { inviteSchema } from "@/modules/memberships/schemas";
import { dbErrorMessage, zodFieldErrors } from "@/lib/errors";

describe("acceso", () => {
  it("normaliza el correo y exige contraseña", () => {
    const ok = loginSchema.parse({ email: "  Ana@Optica.COM ", password: "x" });
    expect(ok.email).toBe("ana@optica.com");
    const bad = loginSchema.safeParse({ email: "no-es-correo", password: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const errors = zodFieldErrors(bad.error);
      expect(errors.email).toMatch(/correo válido/);
      expect(errors.password).toBe("Escribe tu contraseña");
    }
  });

  it("aplica la política de contraseñas de config.toml", () => {
    expect(passwordSchema.safeParse("corta1A").success).toBe(false);
    expect(passwordSchema.safeParse("sinmayuscula1").success).toBe(false);
    expect(passwordSchema.safeParse("SINMINUSCULA1").success).toBe(false);
    expect(passwordSchema.safeParse("SinNumeroAqui").success).toBe(false);
    expect(passwordSchema.safeParse("Lentes2026Ok").success).toBe(true);
  });

  it("el registro exige que las contraseñas coincidan", () => {
    const r = signupSchema.safeParse({ fullName: "Ana Ruiz", email: "a@b.co", password: "Lentes2026Ok", confirm: "Otra2026Ok" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).confirm).toBe("Las contraseñas no coinciden");
  });

  it("solo acepta destinos internos tras iniciar sesión (sin redirección abierta)", () => {
    expect(safeNextPath("/optica-a/inicio")).toBe("/optica-a/inicio");
    expect(safeNextPath("https://malicioso.com")).toBe("/");
    expect(safeNextPath("//malicioso.com")).toBe("/");
    expect(safeNextPath("/\\malicioso.com")).toBe("/");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
  });
});

describe("organización", () => {
  it("propone una dirección web sin tildes ni espacios", () => {
    expect(suggestSlug("Óptica Visión Clara S.A.S.")).toBe("optica-vision-clara-s-a-s");
    expect(slugSchema.safeParse(suggestSlug("Óptica Visión Clara")).success).toBe(true);
  });

  it("rechaza direcciones inválidas y reservadas", () => {
    for (const bad of ["-optica", "optica-", "ab", "Óptica", "con espacio", "a".repeat(49)]) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
    }
    for (const reserved of RESERVED_SLUGS) {
      expect(slugSchema.safeParse(reserved).success, reserved).toBe(false);
    }
  });

  it("valida el NIT y convierte campos vacíos opcionales en null", () => {
    const base = {
      tradeName: "Óptica Central",
      slug: "optica-central",
      legalName: "",
      nit: "",
      timezone: "America/Bogota",
      locationName: "Sede principal",
      locationCity: "",
    };
    const ok = onboardingSchema.parse(base);
    expect(ok.nit).toBeNull();
    expect(ok.legalName).toBeNull();
    expect(onboardingSchema.safeParse({ ...base, nit: "900.123.456-7" }).success).toBe(false);
    expect(onboardingSchema.parse({ ...base, nit: "900123456-7" }).nit).toBe("900123456-7");
    expect(onboardingSchema.safeParse({ ...base, timezone: "Europe/Madrid" }).success).toBe(false);
  });

  it("el umbral de descuento acepta coma decimal y rechaza valores fuera de rango", () => {
    const base = { cylinderConvention: "", receiptFooter: "" };
    expect(settingsSchema.parse({ ...base, discountThresholdPct: "12,5" }).discountThresholdPct).toBe("12.5");
    expect(settingsSchema.safeParse({ ...base, discountThresholdPct: "150" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, discountThresholdPct: "-1" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, discountThresholdPct: "10.555" }).success).toBe(false);
  });
});

describe("invitaciones", () => {
  it("exige correo y un rol de la lista", () => {
    expect(inviteSchema.safeParse({ email: "x@y.co", role: "optometra" }).success).toBe(true);
    expect(inviteSchema.safeParse({ email: "x@y.co", role: "superusuario" }).success).toBe(false);
  });
});

describe("mensajes de error de base de datos", () => {
  it("muestra los mensajes propios en español", () => {
    expect(dbErrorMessage({ code: "42501", message: "Solo un propietario puede invitar a otro propietario" })).toBe(
      "Solo un propietario puede invitar a otro propietario",
    );
  });

  it("oculta detalles internos de PostgreSQL", () => {
    const msg = dbErrorMessage({ code: "42501", message: 'new row violates row-level security policy for table "locations"' });
    expect(msg).toBe("No tienes permiso para realizar esta acción.");
    expect(dbErrorMessage({ code: "XX000", message: "internal error at relation foo" })).not.toMatch(/relation/);
  });

  it("explica la dirección web duplicada", () => {
    expect(dbErrorMessage({ code: "23505", message: 'duplicate key value violates unique constraint "organizations_slug_key"' })).toBe(
      "Esa dirección ya está en uso. Elige otra.",
    );
  });
});
