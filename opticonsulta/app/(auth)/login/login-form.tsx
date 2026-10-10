"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { signIn } from "@/modules/auth/actions";
import { loginSchema, type LoginInput } from "@/modules/auth/schemas";

export function LoginForm({ next }: { next: string }) {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<LoginInput>({
    schema: loginSchema,
    defaultValues: { email: "", password: "" },
    action: (values) => signIn(values, next),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextField
        label="Correo"
        type="email"
        autoComplete="username"
        inputMode="email"
        registration={form.register("email")}
        error={fieldError("email")}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        registration={form.register("password")}
        error={fieldError("password")}
      />
      <Button type="submit" pending={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
