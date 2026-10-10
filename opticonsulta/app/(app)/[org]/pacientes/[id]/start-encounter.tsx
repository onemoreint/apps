"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { startEncounter } from "@/modules/clinical/actions";

export function StartEncounterForm({
  slug,
  patientId,
  locations,
  appointments,
}: {
  slug: string;
  patientId: string;
  locations: { id: string; name: string }[];
  appointments: { id: string; label: string }[];
}) {
  const locId = useId();
  const apptId = useId();
  const [location, setLocation] = useState(locations[0]?.id ?? "");
  const [appointment, setAppointment] = useState(appointments[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-end gap-3">
        {locations.length > 1 ? (
          <div className="grid gap-1">
            <label htmlFor={locId} className="text-sm font-medium text-tinta">
              Sede
            </label>
            <select id={locId} value={location} onChange={(e) => setLocation(e.target.value)} className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-2 text-sm">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {appointments.length ? (
          <div className="grid gap-1">
            <label htmlFor={apptId} className="text-sm font-medium text-tinta">
              Cita de hoy
            </label>
            <select id={apptId} value={appointment} onChange={(e) => setAppointment(e.target.value)} className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-2 text-sm">
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
              <option value="">Sin cita</option>
            </select>
          </div>
        ) : null}
        <Button
          type="button"
          pending={pending}
          disabled={!location}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await startEncounter(slug, { patientId, locationId: location, appointmentId: appointment || null });
              if (result && !result.ok) setError(result.error);
            })
          }
        >
          {pending ? "Abriendo consulta…" : "Iniciar consulta"}
        </Button>
      </div>
    </div>
  );
}
