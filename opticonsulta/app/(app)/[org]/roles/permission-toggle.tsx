"use client";

import { useState, useTransition } from "react";
import { setRolePermission } from "@/modules/memberships/actions";

/** Casilla que concede o retira un permiso a un rol. La base valida las reglas. */
export function PermissionToggle({ slug, role, permission, granted, label, disabled }: { slug: string; role: string; permission: string; granted: boolean; label: string; disabled?: boolean }) {
  const [checked, setChecked] = useState(granted);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-grid justify-items-center gap-1">
      <input
        type="checkbox"
        aria-label={label}
        className="size-4"
        checked={checked}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          setError(null);
          start(async () => {
            const r = await setRolePermission(slug, role, permission, next);
            if (!r.ok) {
              setChecked(!next);
              setError(r.error);
            }
          });
        }}
      />
      {error ? <span role="alert" className="max-w-32 text-[11px] text-error">{error}</span> : null}
    </span>
  );
}
