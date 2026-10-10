"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Notice } from "@/components/ui/notice";
import { annulQuote, reviewQuoteDiscount, saleFromQuote } from "@/modules/commerce/actions";

export function QuoteActions({
  slug,
  quoteId,
  canReview,
  canConvert,
  canAnnul,
}: {
  slug: string;
  quoteId: string;
  canReview: boolean;
  canConvert: boolean;
  canAnnul: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string } | undefined>) =>
    start(async () => {
      setError(null);
      setMessage(null);
      const r = await fn();
      if (r && !r.ok) setError(r.error ?? "No se pudo completar.");
      else if (r?.message) setMessage(r.message);
    });

  return (
    <div className="grid gap-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="exito">{message}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        {canReview ? (
          <>
            <Button type="button" pending={pending} onClick={() => run(() => reviewQuoteDiscount(slug, quoteId, true))}>
              Aprobar descuento
            </Button>
            <Button type="button" variant="secundario" pending={pending} onClick={() => run(() => reviewQuoteDiscount(slug, quoteId, false))}>
              Rechazar descuento
            </Button>
          </>
        ) : null}
        {canConvert ? (
          <Button type="button" pending={pending} onClick={() => run(() => saleFromQuote(slug, quoteId))}>
            Convertir en venta
          </Button>
        ) : null}
        {canAnnul ? (
          <ConfirmAction
            label="Anular cotización"
            variant="texto"
            question="¿Anular la cotización?"
            reasonLabel="Motivo"
            confirmLabel="Sí, anular"
            onConfirm={(reason) => annulQuote(slug, quoteId, reason)}
          />
        ) : null}
      </div>
    </div>
  );
}
