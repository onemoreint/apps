"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchRefCodes, type CodeHit } from "@/modules/catalogs/actions";
import type { SearchableCatalog } from "@/modules/catalogs/queries";

type Props = {
  catalog: SearchableCatalog;
  label: string;
  value: { code: string; label: string } | null;
  onChange: (value: { code: string; label: string } | null) => void;
  error?: string | undefined;
  placeholder?: string;
};

/**
 * Combobox accesible (patrón ARIA 1.2) para catálogos grandes: CIE-10, CUPS,
 * municipios. Busca en el servidor a partir de 2 caracteres.
 */
export function CodeSearch({ catalog, label, value, onChange, error, placeholder }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchRefCodes(catalog, q);
        setHits(found);
        setOpen(true);
        setActive(found.length ? 0 : -1);
      });
    }, 250);
  };

  const choose = (hit: CodeHit) => {
    onChange(hit);
    setQuery("");
    setHits([]);
    setOpen(false);
  };

  if (value) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-tinta">{label}</span>
        <div className="flex min-h-10 items-center justify-between gap-2 rounded-[var(--radius-control)] border border-linea bg-agua/40 px-3 py-2 text-sm">
          <span>
            <span className="font-semibold text-tinta">{value.code}</span> {value.label}
          </span>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-turquesa underline-offset-4 hover:underline">
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder ?? "Escribe código o nombre"}
        onChange={(e) => search(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            const hit = hits[active];
            if (hit) choose(hit);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-3 py-2 text-[15px] aria-[invalid=true]:border-error"
      />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-error">
          {error}
        </p>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-control)] border border-linea bg-white shadow-sm"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-texto-suave">{pending ? "Buscando…" : "Sin resultados en el catálogo"}</li>
          ) : (
            hits.map((hit, i) => (
              <li
                key={hit.code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(hit);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-agua" : ""}`}
              >
                <span className="font-semibold text-tinta">{hit.code}</span> {hit.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
