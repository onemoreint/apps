import Link from "next/link";

export const metadata = { title: "Enlace no válido" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-4 px-5">
      <h1 className="text-2xl font-semibold">El enlace no es válido o ya venció</h1>
      <p className="text-texto-suave">
        Los enlaces de confirmación y de recuperación solo se pueden usar una vez y vencen en una hora.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/recuperar" className="font-semibold text-turquesa underline-offset-4 hover:underline">
          Pedir un enlace nuevo
        </Link>
        <Link href="/login" className="text-turquesa underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
