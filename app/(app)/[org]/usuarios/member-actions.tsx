"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { changeMemberRole, changeMemberStatus, revokeInvitation } from "@/modules/memberships/actions";
import type { MembershipRole, MembershipStatus } from "@/lib/supabase/database.types";

export function MemberActions({
  slug,
  membershipId,
  name,
  role,
  status,
  roles,
}: {
  slug: string;
  membershipId: string;
  name: string;
  role: MembershipRole;
  status: MembershipStatus;
  roles: { value: string; label: string }[];
}) {
  const selectId = useId();
  const [selected, setSelected] = useState<string>(role);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "No se pudo completar la operación.");
      setConfirming(false);
    });

  const suspending = status === "activa";

  return (
    <div className="grid gap-2 md:justify-items-end">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Rol de {name}
        </label>
        <select
          id={selectId}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending}
          className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-2 text-sm"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {selected !== role ? (
          <Button
            type="button"
            variant="secundario"
            pending={pending}
            onClick={() => run(() => changeMemberRole(slug, { membershipId, role: selected }))}
          >
            Guardar rol
          </Button>
        ) : null}

        {confirming ? (
          <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar cambio de acceso">
            <span className="text-sm text-tinta">{suspending ? `¿Suspender a ${name}?` : `¿Reactivar a ${name}?`}</span>
            <Button
              type="button"
              variant={suspending ? "peligro" : "primario"}
              pending={pending}
              onClick={() =>
                run(() => changeMemberStatus(slug, { membershipId, status: suspending ? "suspendida" : "activa" }))
              }
            >
              {suspending ? "Sí, suspender" : "Sí, reactivar"}
            </Button>
            <Button type="button" variant="texto" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </span>
        ) : (
          <Button type="button" variant={suspending ? "peligro" : "secundario"} onClick={() => setConfirming(true)}>
            {suspending ? "Suspender acceso" : "Reactivar acceso"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function RevokeInvitationButton({ slug, invitationId }: { slug: string; invitationId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (error) return <p className="text-[13px] text-error">{error}</p>;

  return confirming ? (
    <span className="flex shrink-0 gap-2">
      <Button
        type="button"
        variant="peligro"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revokeInvitation(slug, invitationId);
            if (!result.ok) setError(result.error);
          })
        }
      >
        Anular
      </Button>
      <Button type="button" variant="texto" onClick={() => setConfirming(false)}>
        No
      </Button>
    </span>
  ) : (
    <Button type="button" variant="texto" className="shrink-0" onClick={() => setConfirming(true)}>
      Anular
    </Button>
  );
}
