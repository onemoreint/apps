import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-texto-suave">
          Para quien administra la óptica. Si tu óptica ya usa OptiConsulta, pide una invitación a su administrador.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-texto-suave">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-turquesa underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
