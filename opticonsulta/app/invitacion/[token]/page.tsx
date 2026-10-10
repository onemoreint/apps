import type { Metadata } from "next";
import { requireUserId } from "@/lib/authz";
import { AcceptInvitation } from "./accept-invitation";

export const metadata: Metadata = { title: "Invitación" };

// proxy.ts redirige al inicio de sesión (con regreso aquí) si no hay sesión.
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  await requireUserId();
  const { token } = await params;

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-5">
      <p className="text-sm font-semibold text-turquesa">OptiConsulta</p>
      <h1 className="text-2xl font-semibold">Te invitaron a una óptica</h1>
      <p className="text-texto-suave">
        Al aceptar, tu cuenta quedará vinculada a la óptica con el rol que te asignaron. La invitación solo funciona con
        el correo al que fue enviada.
      </p>
      <AcceptInvitation token={token} />
    </main>
  );
}
