import { useState, type FormEvent } from 'react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { isValidE164, normalizePhone } from '@/shared/lib/phone';
import { readableOn } from '@/shared/lib/color';
import { toast } from '@/shared/ui/Toast';
import { useAdmin } from '../AdminContext';
import { ImageField } from '../ImageField';
import { must } from '../lib';
import type { Business } from '../types';
import { Button, Card, Field, Input, TextArea, ToggleRow } from '../ui';
import { ExchangeRateCard } from './DashboardPage';
import { ShareLinkCard } from '../ShareLinkCard';
import { PasswordCard } from '../PasswordCard';
import { X } from 'lucide-react';

const PRESETS = ['#D62828', '#E85D04', '#2B7A3D', '#1D4E89', '#6A1B9A', '#1A1714'];

export default function SettingsPage() {
  const { business, setBusiness } = useAdmin();
  const [f, setF] = useState({
    name: business.name,
    description: business.description ?? '',
    address: business.address ?? '',
    phone: business.phone ?? '',
    whatsapp: business.whatsapp,
    instagram: business.instagram ?? '',
    show_bs: business.show_bs,
    primary_color: business.primary_color,
    logo_url: business.logo_url,
    payment_methods: business.payment_methods,
    pickup_enabled: business.pickup_enabled,
    delivery_enabled: business.delivery_enabled,
    dine_in_enabled: business.dine_in_enabled,
  });
  const [newPayment, setNewPayment] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string; color?: string; types?: string }>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const whatsapp = normalizePhone(f.whatsapp);
    const errs: typeof errors = {};
    if (!f.name.trim()) errs.name = 'Escribe el nombre del negocio.';
    if (!isValidE164(whatsapp)) errs.whatsapp = 'Usa el formato internacional, por ejemplo +58 412 1234567.';
    if (!/^#[0-9a-f]{6}$/i.test(f.primary_color)) errs.color = 'Color no válido.';
    if (!f.pickup_enabled && !f.delivery_enabled && !f.dine_in_enabled) errs.types = 'Activa al menos un tipo de pedido.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const updated = must(
        await db()
          .from('businesses')
          .update({
            name: f.name.trim().slice(0, 80),
            description: f.description.trim().slice(0, 300) || null,
            address: f.address.trim().slice(0, 200) || null,
            phone: f.phone.trim().slice(0, 30) || null,
            whatsapp,
            instagram: f.instagram.trim().replace(/^@/, '').slice(0, 60) || null,
            show_bs: f.show_bs,
            primary_color: f.primary_color.toUpperCase(),
            logo_url: f.logo_url,
            payment_methods: f.payment_methods,
            pickup_enabled: f.pickup_enabled,
            delivery_enabled: f.delivery_enabled,
            dine_in_enabled: f.dine_in_enabled,
          })
          .eq('id', business.id)
          .select()
          .single(),
      ) as Business;
      setBusiness(updated);
      set('whatsapp', updated.whatsapp);
      toast('Configuración guardada');
    } catch (err) {
      toast(adminMessage(err), 'warn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Configuración</h1>

      <ShareLinkCard />
      <ExchangeRateCard />

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Tipos de pedido</h2>
        <ToggleRow label="🥡 Para llevar" checked={f.pickup_enabled} onChange={(v) => set('pickup_enabled', v)} />
        <ToggleRow label="🛵 Delivery" hint="Al cliente se le pide la dirección." checked={f.delivery_enabled} onChange={(v) => set('delivery_enabled', v)} />
        <ToggleRow label="🍽️ Comer en el local" checked={f.dine_in_enabled} onChange={(v) => set('dine_in_enabled', v)} />
        {errors.types && <p className="text-sm text-danger">{errors.types}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Formas de pago</h2>
        <p className="text-sm text-ink-2">El cliente elige una al enviar su pedido. Si dejas la lista vacía, no se le pregunta.</p>
        <div className="flex flex-wrap gap-2">
          {f.payment_methods.map((m) => (
            <span key={m} className="inline-flex h-10 items-center gap-1 rounded-full bg-shelf pr-1 pl-4 font-medium">
              {m}
              <button
                type="button"
                aria-label={`Quitar ${m}`}
                onClick={() => set('payment_methods', f.payment_methods.filter((x) => x !== m))}
                className="grid size-8 place-items-center rounded-full text-ink-2"
              >
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
        {f.payment_methods.length < 8 && (
          <div className="flex gap-2">
            <Input
              aria-label="Nueva forma de pago"
              placeholder="Ej.: Binance"
              value={newPayment}
              maxLength={40}
              onChange={(e) => setNewPayment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = newPayment.trim();
                  if (v && !f.payment_methods.includes(v)) set('payment_methods', [...f.payment_methods, v]);
                  setNewPayment('');
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const v = newPayment.trim();
                if (v && !f.payment_methods.includes(v)) set('payment_methods', [...f.payment_methods, v]);
                setNewPayment('');
              }}
            >
              Agregar
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Pedidos por WhatsApp</h2>
        <Field label="Número que recibe los pedidos" htmlFor="wa" error={errors.whatsapp} hint="Con código de país. Ej.: +58 412 1234567">
          <Input id="wa" type="tel" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} aria-invalid={!!errors.whatsapp} />
        </Field>
        {isValidE164(normalizePhone(f.whatsapp)) && (
          <a
            href={`https://wa.me/${normalizePhone(f.whatsapp).slice(1)}?text=${encodeURIComponent('Prueba de MesaQR ✅')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold underline underline-offset-2"
          >
            Probar este número en WhatsApp
          </a>
        )}
        <ToggleRow label="Mostrar precios en Bs." hint="Se calculan con la tasa del día; los precios se guardan en USD." checked={f.show_bs} onChange={(v) => set('show_bs', v)} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">Datos del negocio</h2>
        <Field label="Nombre" htmlFor="bname" error={errors.name}>
          <Input id="bname" value={f.name} maxLength={80} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Descripción" htmlFor="bdesc">
          <TextArea id="bdesc" value={f.description} maxLength={300} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Dirección" htmlFor="baddr">
          <Input id="baddr" value={f.address} maxLength={200} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" htmlFor="bphone">
            <Input id="bphone" type="tel" value={f.phone} maxLength={30} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Instagram" htmlFor="big" hint="Solo el usuario, sin @">
            <Input id="big" value={f.instagram} maxLength={60} onChange={(e) => set('instagram', e.target.value)} />
          </Field>
        </div>
        <ImageField label="Logo" square value={f.logo_url} onChange={(v) => set('logo_url', v)} />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Color principal</h2>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('primary_color', c)}
              aria-label={`Color ${c}`}
              aria-pressed={f.primary_color.toUpperCase() === c}
              className={`size-10 rounded-full ring-offset-2 ${f.primary_color.toUpperCase() === c ? 'ring-2 ring-ink' : ''}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            aria-label="Elegir otro color"
            value={f.primary_color}
            onChange={(e) => set('primary_color', e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-paper"
          />
        </div>
        {errors.color && <p className="text-sm text-danger">{errors.color}</p>}
        <div className="inline-flex h-11 items-center rounded-full px-5 font-display font-bold" style={{ background: f.primary_color, color: readableOn(f.primary_color) }}>
          Vista previa del botón
        </div>
      </Card>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button type="submit" busy={saving} className="w-full shadow-lg sm:w-auto">
          Guardar configuración
        </Button>
      </div>
      <PasswordCard />
    </form>
  );
}
