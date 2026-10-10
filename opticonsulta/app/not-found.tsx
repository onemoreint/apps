import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-4 px-5">
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-texto-suave">
        La dirección no existe o tu cuenta no tiene acceso a esa óptica. Si te invitaron, abre el enlace de invitación
        con el mismo correo.
      </p>
      <Link href="/" className="font-semibold text-turquesa underline-offset-4 hover:underline">
        Ir a mi óptica
      </Link>
    </main>
  );
}
