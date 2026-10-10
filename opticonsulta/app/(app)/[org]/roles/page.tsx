import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td } from "@/components/ui/table";
import { ROLES } from "@/modules/memberships/schemas";
import { PermissionToggle } from "./permission-toggle";

export const metadata: Metadata = { title: "Roles y permisos" };

const EDITABLE = ROLES.filter((r) => r.value !== "propietario");

export default async function RolesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "roles.manage")) return <Forbidden what="la edición de roles" />;

  const supabase = await createClient();
  const [{ data: permissions }, { data: grants }] = await Promise.all([
    supabase.from("permissions").select("code, area, description, is_clinical").order("area").order("code"),
    supabase.from("role_permissions").select("role, permission_code").eq("organization_id", ctx.org.id),
  ]);
  const has = new Set((grants ?? []).map((g) => `${g.role}:${g.permission_code}`));

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Ajusta qué puede hacer cada rol. Los cambios aplican de inmediato a todas las personas con ese rol. El propietario conserva todos sus permisos, y los permisos clínicos solo pueden asignarse al rol optómetra."
      />
      <Table caption="Permisos por rol" headers={["Permiso", ...EDITABLE.map((r) => r.label)]} minWidth={760}>
        {(permissions ?? []).map((p) => (
          <tr key={p.code}>
            <Td>
              <span className="font-medium text-tinta">{p.description}</span>
              <span className="block text-[12px] text-texto-suave">
                {p.area} · {p.code}
                {p.is_clinical ? " · clínico" : ""}
              </span>
            </Td>
            {EDITABLE.map((r) => (
              <Td key={r.value} className="text-center">
                <PermissionToggle
                  slug={slug}
                  role={r.value}
                  permission={p.code}
                  granted={has.has(`${r.value}:${p.code}`)}
                  label={`${p.description} para ${r.label}`}
                  disabled={p.is_clinical && r.value !== "optometra"}
                />
              </Td>
            ))}
          </tr>
        ))}
      </Table>
    </>
  );
}
