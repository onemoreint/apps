import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

const controlClass =
  "w-full min-h-10 rounded-[var(--radius-control)] border bg-white px-3 py-2 text-[15px] text-texto placeholder:text-texto-suave/70 aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-fondo border-linea";

type BaseProps = {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  optional?: boolean;
  registration: UseFormRegisterReturn;
};

function FieldShell({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: { id: string; label: string; error?: string | undefined; hint?: ReactNode; optional?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {label}
        {optional ? <span className="font-normal text-texto-suave"> (opcional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] text-texto-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  label,
  error,
  hint,
  optional,
  registration,
  ...props
}: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional ?? false}>
      <input
        id={id}
        {...props}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  registration,
  options,
  ...props
}: BaseProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional ?? false}>
      <select
        id={id}
        {...props}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  registration,
  ...props
}: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional ?? false}>
      <textarea
        id={id}
        rows={3}
        {...props}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass}
      />
    </FieldShell>
  );
}
