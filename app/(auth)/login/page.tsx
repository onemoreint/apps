import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { safeNextPath } from "@/modules/auth/schemas";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirmado?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-texto-suave">Entra con el correo con el que te registraste o te invitaron.</p>
      </div>
      <LoginForm next={next} />
      <div className="grid gap-2 text-sm">
        <Link href="/recuperar" className="text-turquesa underline-offset-4 hover:underline">
          Olvidé mi contraseña
        </Link>
        <p className="text-texto-suave">
          ¿Tu óptica aún no usa OptiConsulta?{" "}
          <Link href="/registro" className="text-turquesa underline-offset-4 hover:underline">
            Crear una cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
