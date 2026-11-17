// Adaptador de PRODUCCIÓN (Supabase). Esqueleto preparado para la Fase 3.
// No se conecta a ningún servicio hasta que exista autorización y credenciales en .env.
// Toda escritura sensible pasa por funciones RPC con SECURITY DEFINER y RLS (ver supabase/migrations).
import type { DataAdapter } from './adapter'

export function createSupabaseAdapter(): DataAdapter {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anon) {
    throw new Error('Modo producción no configurado: faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
  }
  // Fase 3: instalar @supabase/supabase-js e implementar cada método con:
  //  - load(): selects filtrados por business_id (RLS garantiza el aislamiento)
  //  - createPublicBooking(): supabase.rpc('book_appointment', {...})  ← única vía pública de escritura
  //  - setAppointmentStatus(): supabase.rpc('set_appointment_status', {...}) (puntos y auditoría en servidor)
  throw new Error('El adaptador de Supabase se implementa en la Fase 3 (pendiente de autorización).')
}
