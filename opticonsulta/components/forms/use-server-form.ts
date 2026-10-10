"use client";

import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { ActionResult } from "@/lib/errors";

/**
 * Formulario con validación en cliente (Zod + React Hook Form) que envía a una
 * Server Action. El servidor vuelve a validar con el mismo esquema; sus errores
 * por campo se reflejan en el formulario.
 */
export function useServerForm<TValues extends FieldValues, TData = undefined>(options: {
  schema: z.ZodType<unknown, TValues>;
  defaultValues: DefaultValues<TValues>;
  action: (values: TValues) => Promise<ActionResult<TData>>;
  onSuccess?: (result: { data?: TData; message?: string }) => void;
  resetOnSuccess?: boolean;
}) {
  const form = useForm<TValues>({
    resolver: zodResolver(options.schema as never) as unknown as Resolver<TValues>,
    defaultValues: options.defaultValues,
    mode: "onTouched",
  });
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Se envían los valores crudos del formulario: el servidor aplica el esquema.
  const onSubmit = form.handleSubmit(
    () => {
      const raw = form.getValues();
      setFormError(null);
      setMessage(null);
      startTransition(async () => {
        const result = await options.action(raw);
        if (!result) return; // La acción redirigió.
        if (result.ok) {
          setMessage(result.message ?? null);
          if (options.resetOnSuccess) form.reset(options.defaultValues);
          options.onSuccess?.({ ...(result.data !== undefined ? { data: result.data } : {}), ...(result.message ? { message: result.message } : {}) });
        } else {
          setFormError(result.error);
          for (const [field, msg] of Object.entries(result.fieldErrors ?? {})) {
            form.setError(field as Path<TValues>, { type: "server", message: msg });
          }
        }
      });
    },
    () => setFormError("Revisa los campos marcados."),
  );

  const fieldError = (name: Path<TValues>): string | undefined => {
    const err = name.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], form.formState.errors);
    return (err as { message?: string } | undefined)?.message;
  };

  return { form, onSubmit, pending, formError, message, fieldError, setMessage };
}
