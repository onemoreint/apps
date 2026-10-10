// Siembra una óptica de DEMOSTRACIÓN con datos 100 % ficticios.
//
// Todo pasa por la API como lo haría cada usuario (RLS y RPC incluidos): la
// clave service_role solo se usa para crear las cuentas de demostración y para
// marcar la organización como demo (is_demo = true).
//
// Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//            SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD (opcional), DEMO_SLUG (opcional)
// Uso: node --env-file=.env.local scripts/seed-demo.mjs
//
// Nombres, documentos, teléfonos y valores clínicos son inventados. Los
// documentos empiezan por 9999 y los correos usan el dominio reservado .test.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const password = process.env.DEMO_PASSWORD ?? `Demo-${randomBytes(6).toString("hex")}A1`;
const slug = process.env.DEMO_SLUG ?? "optica-demo";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);

const USERS = {
  propietario: { email: "propietario@demo-opticonsulta.test", name: "Ana Demo Propietaria" },
  administrador: { email: "admin@demo-opticonsulta.test", name: "Bruno Demo Administrador" },
  optometra: { email: "optometra@demo-opticonsulta.test", name: "Carla Demo Optómetra" },
  asistente: { email: "asistente@demo-opticonsulta.test", name: "Diego Demo Asistente" },
  cajero: { email: "caja@demo-opticonsulta.test", name: "Elena Demo Caja" },
};

function must(res, what) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

async function ensureUser({ email, name }) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (!created.error) return created.data.user.id;
  // Ya existía: se actualiza la contraseña para poder entrar.
  const list = must(await admin.auth.admin.listUsers({ perPage: 1000 }), "listar usuarios");
  const user = list.users.find((u) => u.email === email);
  if (!user) throw new Error(`No se pudo crear ${email}: ${created.error.message}`);
  must(await admin.auth.admin.updateUserById(user.id, { password }), "actualizar contraseña");
  return user.id;
}

async function as(email) {
  const client = createClient(url, anonKey, opts);
  must(await client.auth.signInWithPassword({ email, password }), `entrar como ${email}`);
  return client;
}

const ids = {};
for (const [role, u] of Object.entries(USERS)) ids[role] = await ensureUser(u);
const owner = await as(USERS.propietario.email);

const existing = await owner.from("organizations").select("id").eq("slug", slug).maybeSingle();
if (existing.data) {
  console.error(`Ya existe la óptica «${slug}». Usa DEMO_SLUG=otro-nombre para sembrar otra.`);
  process.exit(1);
}
const org = must(
  await owner.rpc("create_organization", {
    p_trade_name: "Óptica Demostración",
    p_slug: slug,
    p_legal_name: "Óptica Demostración S.A.S. (ficticia)",
    p_nit: null,
    p_timezone: "America/Bogota",
    p_location_name: "Sede Centro",
    p_location_city: "Ciudad Ficticia",
  }),
  "crear óptica",
);
must(await admin.from("organizations").update({ is_demo: true }).eq("id", org), "marcar demo");
const loc = must(await owner.from("locations").select("id").eq("organization_id", org).single(), "sede").id;

for (const role of ["administrador", "optometra", "asistente", "cajero"]) {
  const token = must(await owner.rpc("invite_member", { p_org: org, p_email: USERS[role].email, p_role: role }), `invitar ${role}`);
  const c = await as(USERS[role].email);
  must(await c.rpc("accept_invitation", { p_token: token }), `aceptar ${role}`);
}
const [adminC, opto, asist, caja] = await Promise.all(["administrador", "optometra", "asistente", "cajero"].map((r) => as(USERS[r].email)));

// Configuración: autorización de datos, profesional, catálogo, laboratorio.
must(
  await owner.from("consent_texts").insert({
    organization_id: org,
    kind: "tratamiento_datos",
    title: "Autorización de tratamiento de datos (TEXTO DE DEMOSTRACIÓN)",
    body: "Texto ficticio para demostración. Cada óptica debe redactar el suyo con su asesor jurídico conforme a la Ley 1581 de 2012.",
  }),
  "texto de autorización",
);
const consentText = must(await owner.from("consent_texts").select("id").eq("organization_id", org).single(), "texto").id;
const optoMembership = must(await owner.from("memberships").select("id").eq("organization_id", org).eq("user_id", ids.optometra).single(), "membresía").id;
must(
  await owner.from("professionals").insert({
    organization_id: org,
    membership_id: optoMembership,
    full_name: USERS.optometra.name,
    doc_type: "CC",
    doc_number: "9999000001",
    profession: "optometra",
    professional_card: "DEMO-0001",
  }),
  "profesional",
);
const professional = must(await owner.from("professionals").select("id").eq("organization_id", org).single(), "profesional").id;

must(await owner.from("suppliers").insert({ organization_id: org, name: "Distribuidora Ficticia de Monturas" }), "proveedor");
const products = [
  { sku: "MON-001", name: "Montura acetato clásica", kind: "montura", unit_price: 180000, cost: 70000, stock_min: 3 },
  { sku: "MON-002", name: "Montura metálica ligera", kind: "montura", unit_price: 240000, cost: 95000, stock_min: 2 },
  { sku: "LEN-MONO", name: "Lentes monofocales según fórmula", kind: "lente_oftalmico", unit_price: 0, tracks_stock: false },
  { sku: "LEN-PROG", name: "Lentes progresivos según fórmula", kind: "lente_oftalmico", unit_price: 0, tracks_stock: false },
  { sku: "LC-30", name: "Lentes de contacto mensuales (caja)", kind: "lente_contacto", unit_price: 95000, cost: 50000, stock_min: 4 },
  { sku: "ACC-EST", name: "Estuche rígido", kind: "accesorio", unit_price: 25000, cost: 8000, stock_min: 5 },
  { sku: "SRV-AJ", name: "Ajuste y limpieza", kind: "servicio", unit_price: 15000, tracks_stock: false },
];
for (const p of products) must(await owner.from("products").insert({ organization_id: org, tracks_stock: true, ...p }), `producto ${p.sku}`);
const prod = Object.fromEntries(must(await owner.from("products").select("id, sku").eq("organization_id", org), "productos").map((p) => [p.sku, p.id]));
for (const [sku, qty] of [["MON-001", 12], ["MON-002", 2], ["LC-30", 10], ["ACC-EST", 20]]) {
  must(await asist.rpc("register_inventory_movement", { p_product: prod[sku], p_location: loc, p_type: "entrada", p_quantity: qty, p_unit_cost: null, p_reason: "Inventario inicial de demostración" }), "entrada");
}
must(await owner.from("laboratories").insert({ organization_id: org, name: "Laboratorio Óptico Ficticio" }), "laboratorio");
const lab = must(await owner.from("laboratories").select("id").eq("organization_id", org).single(), "laboratorio").id;

// Pacientes ficticios con autorización registrada.
const PATIENTS = [
  ["9999100001", "Mariana", "Ficticia", "1988-04-12"],
  ["9999100002", "Julián", "Ejemplo", "1975-09-30"],
  ["9999100003", "Sofía", "Prueba", "2001-01-05"],
  ["9999100004", "Andrés", "Demostración", "1962-11-21"],
  ["9999100005", "Lucía", "Inventada", "1994-07-17"],
];
const patients = [];
for (const [doc, first, last, birth] of PATIENTS) {
  const p = must(
    await asist
      .from("patients")
      .insert({ organization_id: org, doc_type: "CC", doc_number: doc, first_name: first, first_surname: last, birth_date: birth, phone: `300000${doc.slice(-4)}`, email: `${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@paciente-demo.test` })
      .select("id")
      .single(),
    "paciente",
  );
  must(await asist.from("consents").insert({ organization_id: org, patient_id: p.id, consent_text_id: consentText, decision: "otorgado", channel: "firma_presencial" }), "autorización");
  patients.push(p.id);
}

// Agenda de hoy y mañana.
const day = (offset, hour) => {
  const d = new Date(Date.now() + offset * 86400000);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
  return new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00-05:00`).toISOString();
};
for (const [i, [off, h]] of [[0, 9], [0, 10], [0, 15], [1, 9], [1, 11]].entries()) {
  must(
    await asist.from("appointments").insert({
      organization_id: org, location_id: loc, patient_id: patients[i], professional_id: professional,
      starts_at: day(off, h), ends_at: day(off, h).replace(/T(\d\d):00/, (_, x) => `T${x}:30`), reason: "Control visual (demostración)",
    }),
    "cita",
  );
}

// Fórmulas internas ficticias validadas por la optómetra.
async function rx(patient, od, oi, lens = "monofocal") {
  const id = must(await opto.rpc("save_prescription_draft", { p_prescription: null, p_draft_version: null, p_payload: { patient_id: patient, origin: "interna", lens_type: lens, eyes: [{ eye: "OD", ...od }, { eye: "OI", ...oi }] } }), "fórmula");
  must(await opto.rpc("validate_prescription", { p_prescription: id, p_draft_version: 1 }), "validar fórmula");
  return id;
}
const rx1 = await rx(patients[0], { sphere: "-1.25", cylinder: "-0.50", axis: 180 }, { sphere: "-1.00" });
const rx2 = await rx(patients[1], { sphere: "+1.50", addition: "+2.00" }, { sphere: "+1.75", addition: "+2.00" }, "progresivo");
await rx(patients[2], { sphere: "-2.50" }, { sphere: "-2.25", cylinder: "-0.75", axis: 10 });

// Caja, ventas, pagos, cotización con descuento por aprobar, laboratorio.
const cash = must(await caja.from("payment_methods").select("id, kind").eq("organization_id", org), "medios");
const methodOf = (k) => cash.find((m) => m.kind === k).id;
must(await caja.rpc("open_cash_session", { p_location: loc, p_opening: 100000 }), "abrir caja");

const sale1 = must(await caja.rpc("create_sale", { p_payload: { location_id: loc, patient_id: patients[0], prescription_id: rx1, items: [{ product_id: prod["MON-001"], quantity: 1 }, { product_id: prod["LEN-MONO"], quantity: 1, unit_price: 220000, discount_amount: 20000 }] } }), "venta 1");
must(await caja.rpc("register_payment", { p_sale: sale1, p_method: methodOf("efectivo"), p_amount: 200000, p_reference: null }), "abono venta 1");
const sale2 = must(await caja.rpc("create_sale", { p_payload: { location_id: loc, patient_id: patients[1], prescription_id: rx2, items: [{ product_id: prod["MON-002"], quantity: 1 }, { product_id: prod["LEN-PROG"], quantity: 1, unit_price: 650000 }] } }), "venta 2");
must(await caja.rpc("register_payment", { p_sale: sale2, p_method: methodOf("tarjeta"), p_amount: 890000, p_reference: "APROB-DEMO-01" }), "pago venta 2");
const sale3 = must(await caja.rpc("create_sale", { p_payload: { location_id: loc, items: [{ product_id: prod["LC-30"], quantity: 2 }, { product_id: prod["ACC-EST"], quantity: 1 }] } }), "venta 3");
must(await caja.rpc("register_payment", { p_sale: sale3, p_method: methodOf("efectivo"), p_amount: 215000, p_reference: null }), "pago venta 3");

must(await asist.rpc("save_quote", { p_quote: null, p_version: null, p_payload: { location_id: loc, patient_id: patients[2], items: [{ product_id: prod["MON-002"], quantity: 1, discount_amount: 60000 }] } }), "cotización");

const order1 = must(await asist.rpc("create_lab_order", { p_payload: { sale_id: sale1, laboratory_id: lab, promised_date: day(5, 12).slice(0, 10), lens_description: "Monofocal antirreflejo 1.56 (demo)", frame_description: "Montura acetato clásica" } }), "orden 1");
const order2 = must(await asist.rpc("create_lab_order", { p_payload: { sale_id: sale2, laboratory_id: lab, promised_date: day(3, 12).slice(0, 10), lens_description: "Progresivo digital 1.60 (demo)", frame_description: "Montura metálica ligera" } }), "orden 2");
const statuses = must(await asist.from("lab_order_statuses").select("id, kind, position").eq("organization_id", org).order("position"), "estados");
const statusOf = (k) => statuses.find((s) => s.kind === k).id;
must(await asist.rpc("change_lab_order_status", { p_order: order1, p_status: statusOf("proceso"), p_note: "Enviada al laboratorio" }), "estado 1");
must(await asist.rpc("change_lab_order_status", { p_order: order2, p_status: statusOf("proceso"), p_note: "Enviada al laboratorio" }), "estado 2a");
must(await asist.rpc("change_lab_order_status", { p_order: order2, p_status: statusOf("recibido"), p_note: "Llegó a la óptica" }), "estado 2b");

must(await asist.rpc("register_privacy_request", { p_org: org, p_payload: { requester_name: "Titular Ficticio", requester_doc: "9999200001", kind: "consulta", description: "Solicita conocer qué datos personales tiene registrados la óptica (demostración)." } }), "solicitud");

await Promise.all([owner, adminC, opto, asist, caja].map((c) => c.auth.signOut()));
console.log(`\nÓptica de demostración lista: /${slug}/inicio`);
console.log("Usuarios (todos con la misma contraseña):");
for (const [role, u] of Object.entries(USERS)) console.log(`  ${role.padEnd(14)} ${u.email}`);
console.log(`Contraseña: ${password}${process.env.DEMO_PASSWORD ? " (DEMO_PASSWORD)" : " (generada; guárdala)"}`);
