"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { signUp } from "@/modules/auth/actions";
import { signupSchema, type SignupInput } from "@/modules/auth/schemas";

export function SignupForm() {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<SignupInput>({
    schema: signupSchema,
    defaultValues: { fullName: "", email: "", password: "", confirm: "" },
    action: signUp,
    resetOnSuccess: true,
  });

  if (message) {
    return (
      <Notice tone="exito">
        {message} Abre el enlace desde este mismo navegador para continuar con la configuración de tu óptica.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextField label="Nombre completo" autoComplete="name" registration={form.register("fullName")} error={fieldError("fullName")} />
      <TextField
        label="Correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        registration={form.register("email")}
        error={fieldError("email")}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
        registration={form.register("password")}
        error={fieldError("password")}
      />
      <TextField
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        registration={form.register("confirm")}
        error={fieldError("confirm")}
      />
      <Button type="submit" pending={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
