import type { Metadata } from "next";
import { requireUserId } from "@/lib/authz";
import { signOut } from "@/modules/auth/actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configura tu óptica" };

export default async function OnboardingPage() {
  await requireUserId();
  return (
    <main className="mx-auto grid max-w-2xl gap-8 px-5 py-10 md:py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-turquesa">OptiConsulta</p>
          <h1 className="text-3xl font-semibold">Configura tu óptica</h1>
          <p className="max-w-prose text-texto-suave">
            Con estos datos creamos el espacio de tu óptica y su primera sede. Quedarás como propietario y luego podrás
            invitar a tu equipo. Puedes cambiar todo después, excepto la dirección web.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-texto-suave underline-offset-4 hover:underline">
            Cerrar sesión
          </button>
        </form>
      </header>
      <OnboardingForm />
    </main>
  );
}
