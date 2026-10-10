"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { invalidInput, type ActionResult } from "@/lib/errors";
import {
  loginSchema,
  recoverSchema,
  resetSchema,
  safeNextPath,
  signupSchema,
} from "@/modules/auth/schemas";

type Guard = { allowed: boolean; retry_after_seconds: number };

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { email, password } = parsed.data;

  const supabase = await createClient();

  const { data: guardData } = await supabase.rpc("login_guard", { p_email: email });
  const guard = guardData as Guard | null;
  if (guard && !guard.allowed) {
    const minutes = Math.max(1, Math.ceil(guard.retry_after_seconds / 60));
    return {
      ok: false,
      error: `Demasiados intentos fallidos. Espera ${minutes} ${minutes === 1 ? "minuto" : "minutos"} o recupera tu contraseña.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Confirma tu correo con el enlace que te enviamos antes de entrar." };
    }
    await supabase.rpc("record_login_failure", { p_email: email });
    // Mismo mensaje si el correo no existe o la contraseña falla.
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  await supabase.rpc("clear_login_failures");
  redirect(safeNextPath(next, "/"));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { email, password, fullName } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${serverEnv().APP_BASE_URL}/auth/confirm?next=/`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, error: "La contraseña no cumple los requisitos.", fieldErrors: { password: "Elige una contraseña más segura" } };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { ok: false, error: "Se alcanzó el límite de correos por ahora. Inténtalo en unos minutos." };
    }
    return { ok: false, error: "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo." };
  }

  // No se confirma ni se niega si el correo ya estaba registrado.
  return { ok: true, message: `Te enviamos un enlace a ${email} para confirmar tu cuenta.` };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${serverEnv().APP_BASE_URL}/auth/confirm?next=/restablecer`,
  });

  // Respuesta idéntica exista o no la cuenta.
  return {
    ok: true,
    message: "Si el correo está registrado, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.",
  };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return { ok: false, error: "El enlace venció. Solicita uno nuevo desde «Olvidé mi contraseña»." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "La contraseña nueva debe ser distinta de la anterior.", fieldErrors: { password: "Usa una contraseña distinta" } };
    }
    return { ok: false, error: "No se pudo cambiar la contraseña. Solicita un enlace nuevo." };
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
