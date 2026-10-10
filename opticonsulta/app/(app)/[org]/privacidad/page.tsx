import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { CONSENT_KINDS } from "@/modules/privacy/schemas";
import { ConsentTextForm } from "./consent-text-form";

export const metadata: Metadata = { title: "Privacidad" };

export default async function PrivacidadPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "privacy.manage")) return <Forbidden what="la gestión de privacidad" />;

  const supabase = await createClient();
  const { data: texts } = await supabase
    .from("consent_texts")
    .select("*")
    .eq("organization_id", ctx.org.id)
    .order("kind")
    .order("version", { ascending: false });

  return (
    <>
      <PageHeader
        title="Privacidad"
        description="Textos de autorización que firman los pacientes. Cada publicación crea una versión nueva; las autorizaciones ya firmadas conservan el texto que aceptaron."
      />
      <div className="mb-6 max-w-3xl">
        <p role="status" className="rounded-[var(--radius-control)] border border-aviso/30 bg-aviso-fondo px-3 py-2.5 text-sm text-aviso">
          OptiConsulta no redacta estos textos. Publícalos con la revisión de tu asesor jurídico (Ley 1581 de 2012 y normas de
          historia clínica). Sin una autorización de tratamiento de datos vigente no se pueden iniciar consultas.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <Panel title="Textos publicados">
          {texts?.length ? (
            <ul className="grid gap-4">
              {texts.map((t) => (
                <li key={t.id} className="grid gap-1 border-b border-linea pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-tinta">
                      {t.title} <span className="font-normal text-texto-suave">v{t.version}</span>
                    </p>
                    <Badge tone={t.is_active ? "exito" : "neutro"}>{t.is_active ? "Vigente" : "Versión anterior"}</Badge>
                  </div>
                  <p className="text-[13px] text-texto-suave">
                    {CONSENT_KINDS.find((k) => k.value === t.kind)?.label} · publicado el {formatDate(t.created_at, ctx.org.timezone)}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-sm text-turquesa">Ver texto</summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{t.body}</p>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-texto-suave">Aún no hay textos publicados.</p>
          )}
        </Panel>
        <Panel title="Publicar texto o versión nueva">
          <ConsentTextForm slug={slug} />
        </Panel>
      </div>
    </>
  );
}
