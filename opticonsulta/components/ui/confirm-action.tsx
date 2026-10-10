"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ActionResult } from "@/lib/errors";

type Props = {
  label: string;
  confirmLabel: string;
  question: string;
  variant?: "primario" | "secundario" | "peligro" | "texto";
  /** Si se indica, pide un motivo antes de confirmar. */
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<ActionResult<unknown> | void>;
};

/** Acción sensible en dos pasos: el primer clic muestra la pregunta (y el motivo). */
export function ConfirmAction({ label, confirmLabel, question, variant = "secundario", reasonLabel, onConfirm }: Props) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div role="group" aria-label={question} className="grid gap-2 rounded-[var(--radius-control)] border border-linea bg-white p-3">
      <p className="text-sm font-medium text-tinta">{question}</p>
      {reasonLabel ? (
        <div className="grid gap-1">
          <label htmlFor={reasonId} className="text-[13px] text-texto-suave">
            {reasonLabel}
          </label>
          <textarea
            id={reasonId}
            rows={2}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-linea px-2 py-1.5 text-sm"
          />
        </div>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={variant === "texto" ? "secundario" : variant}
          pending={pending}
          disabled={Boolean(reasonLabel) && reason.trim().length < 5}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await onConfirm(reason.trim());
              if (result && !result.ok) setError(result.error);
              else if (result?.ok) setOpen(false);
            })
          }
        >
          {confirmLabel}
        </Button>
        <Button type="button" variant="texto" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
