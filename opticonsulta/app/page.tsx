import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

// Punto de entrada: lleva al usuario a su óptica o a configurar una nueva.
export default async function Home() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, created_at")
    .eq("user_id", userId)
    .eq("status", "activa")
    .order("created_at", { ascending: true })
    .limit(1);

  const first = memberships?.[0];
  if (!first) redirect("/configuracion-inicial");

  const { data: org } = await supabase.from("organizations").select("slug").eq("id", first.organization_id).single();
  redirect(org ? `/${org.slug}/inicio` : "/configuracion-inicial");
}
