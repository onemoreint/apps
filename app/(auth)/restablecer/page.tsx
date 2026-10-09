import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/authz";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega aquí desde el enlace de recuperación, que abre una sesión temporal.
export default async function ResetPage() {
  if (!(await getSessionUserId())) redirect("/recuperar");
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Crea una contraseña nueva</h1>
        <p className="text-sm text-texto-suave">Al guardarla entrarás directamente a tu óptica.</p>
      </div>
      <ResetForm />
    </div>
  );
}
