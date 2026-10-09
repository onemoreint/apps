"use client";

import { useState } from "react";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { inviteMember } from "@/modules/memberships/actions";
import { inviteSchema, type InviteInput } from "@/modules/memberships/schemas";

export function InviteForm({ slug, roles }: { slug: string; roles: { value: string; label: string }[] }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { form, onSubmit, pending, formError, message, fieldError } = useServerForm<InviteInput, { link: string }>({
    schema: inviteSchema,
    defaultValues: { email: "", role: "asistente" },
    action: (values) => inviteMember(slug, values),
    resetOnSuccess: true,
    onSuccess: ({ data }) => {
      setLink(data?.link ?? null);
      setCopied(false);
    },
  });

  return (
    <div className="grid gap-4">
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {link ? (
        <div className="grid gap-2 rounded-[var(--radius-control)] border border-turquesa/30 bg-agua p-3">
          <p className="text-sm text-tinta">{message} Este enlace se muestra una sola vez:</p>
          <input
            readOnly
            value={link}
            aria-label="Enlace de invitación"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-[var(--radius-control)] border border-linea bg-white px-2 py-1.5 text-[13px]"
          />
          <Button
            type="button"
            variant="secundario"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </Button>
        </div>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <TextField
          label="Correo de la persona"
          type="email"
          inputMode="email"
          autoComplete="off"
          registration={form.register("email")}
          error={fieldError("email")}
        />
        <SelectField label="Rol" registration={form.register("role")} error={fieldError("role")} options={roles} />
        <Button type="submit" pending={pending}>
          {pending ? "Creando invitación…" : "Crear invitación"}
        </Button>
      </form>
    </div>
  );
}
