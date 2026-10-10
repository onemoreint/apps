"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { resetPassword } from "@/modules/auth/actions";
import { resetSchema, type ResetInput } from "@/modules/auth/schemas";

export function ResetForm() {
  const { form, onSubmit, pending, formError, fieldError } = useServerForm<ResetInput>({
    schema: resetSchema,
    defaultValues: { password: "", confirm: "" },
    action: resetPassword,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextField
        label="Contraseña nueva"
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
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
