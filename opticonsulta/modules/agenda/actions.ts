"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { emptyToNull } from "@/lib/text";
import { zonedToUtc } from "@/lib/tz";
import { appointmentSchema } from "@/modules/agenda/schemas";

export async function createAppointment(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "agenda.write", async (ctx) => {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;

    const starts = zonedToUtc(v.date, v.time, ctx.org.timezone);
    const ends = new Date(starts.getTime() + Number(v.duration) * 60_000);

    const supabase = await createClient();
    const { error } = await supabase.from("appointments").insert({
      organization_id: ctx.org.id,
      location_id: v.locationId,
      patient_id: v.patientId,
      professional_id: v.professionalId,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      reason: emptyToNull(v.reason),
    });
    if (error?.code === "23P01") {
      return {
        ok: false,
        error: "El profesional ya tiene una cita en ese horario. Elige otra hora u otro profesional.",
        fieldErrors: { time: "Horario ocupado" },
      };
    }
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/agenda`);
    revalidatePath(`/${slug}/pacientes/${v.patientId}`);
    return { ok: true, message: `Cita agendada para el ${v.date} a las ${v.time}.` };
  });
}

type StatusChange = { status: "confirmada" | "no_asistio" } | { status: "cancelada"; reason: string };

export async function changeAppointmentStatus(slug: string, appointmentId: string, change: StatusChange): Promise<ActionResult> {
  return withOrgPermission(slug, "agenda.write", async (ctx) => {
    if (change.status === "cancelada" && change.reason.trim().length < 3) {
      return { ok: false, error: "Escribe el motivo de la cancelación." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appointments")
      .update(
        change.status === "cancelada"
          ? { status: "cancelada", cancel_reason: change.reason.trim().slice(0, 200) }
          : { status: change.status },
      )
      .eq("id", appointmentId)
      .eq("organization_id", ctx.org.id)
      .in("status", ["programada", "confirmada"])
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "La cita ya no está pendiente." };
    revalidatePath(`/${slug}/agenda`);
    const labels = { confirmada: "Cita confirmada.", no_asistio: "Inasistencia registrada.", cancelada: "Cita cancelada." };
    return { ok: true, message: labels[change.status] };
  });
}
