import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar acceso" };

export default function RecoverPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Recuperar acceso</h1>
        <p className="text-sm text-texto-suave">Te enviaremos un enlace para crear una contraseña nueva. Vence en una hora.</p>
      </div>
      <RecoverForm />
      <Link href="/login" className="text-sm text-turquesa underline-offset-4 hover:underline">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
