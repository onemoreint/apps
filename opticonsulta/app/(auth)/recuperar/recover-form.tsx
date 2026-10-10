"use client";

import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { requestPasswordReset } from "@/modules/auth/actions";
import { recoverSchema, type RecoverInput } from "@/modules/auth/schemas";

export function RecoverForm() {
  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<RecoverInput>({
    schema: recoverSchema,
    defaultValues: { email: "" },
    action: requestPasswordReset,
  });

  if (message) return <Notice tone="exito">{message}</Notice>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <TextField
        label="Correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        registration={form.register("email")}
        error={fieldError("email")}
      />
      <Button type="submit" pending={pending}>
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
