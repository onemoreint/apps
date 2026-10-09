"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { acceptInvitation } from "@/modules/memberships/actions";

export function AcceptInvitation({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button
        type="button"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptInvitation(token);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending ? "Aceptando…" : "Aceptar invitación"}
      </Button>
    </div>
  );
}
