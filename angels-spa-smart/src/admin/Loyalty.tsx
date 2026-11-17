import { useEffect, useMemo, useState } from 'react'
import { Crown, Gift, Plus, Trash2 } from 'lucide-react'
import { useData, useStore } from '../data/store'
import type { LoyaltySettings } from '../types'
import { clientPoints, loyaltyTier } from '../lib/loyalty'
import { uid } from '../lib/id'
import { formatDateShort } from '../lib/time'
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, PageHeader, Select, cx, useToast } from '../components/ui'

export function Loyalty() {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [s, setS] = useState<LoyaltySettings>(data.loyalty)
  const [redeem, setRedeem] = useState<string | null>(null)
  useEffect(() => setS(data.loyalty), [data.loyalty])
  const ranking = useMemo(
    () => data.clients.filter((c) => !c.anonymized).map((c) => ({ c, pts: clientPoints(data.loyaltyTx, c.id) })).filter((x) => x.pts > 0).sort((a, b) => b.pts - a.pts),
    [data],
  )
  const history = data.loyaltyTx.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25)
  const name = (id: string) => data.clients.find((c) => c.id === id)?.name ?? '—'
  const dirty = JSON.stringify(s) !== JSON.stringify(data.loyalty)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Fidelización" subtitle="Programa de puntos Ángel. Solo las citas completadas suman puntos." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl font-semibold">Reglas del programa</h2>
          <div className="space-y-4">
            <Checkbox checked={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} label="Programa activo" />
            <Field label="Puntos por visita completada">{(id) => <Input id={id} type="number" min={0} max={1000} value={s.pointsPerVisit} onChange={(e) => setS({ ...s, pointsPerVisit: Math.max(0, Number(e.target.value)) })} />}</Field>
            <div>
              <p className="mb-2 text-sm font-medium">Beneficios canjeables</p>
              <div className="space-y-2">
                {s.rewards.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Input value={r.name} onChange={(e) => setS({ ...s, rewards: s.rewards.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Beneficio" />
                    <Input type="number" min={1} value={r.cost} onChange={(e) => setS({ ...s, rewards: s.rewards.map((x, j) => (j === i ? { ...x, cost: Math.max(1, Number(e.target.value)) } : x)) })} className="w-24" aria-label="Puntos" />
                    <button onClick={() => setS({ ...s, rewards: s.rewards.filter((_, j) => j !== i) })} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-red-50" aria-label="Quitar beneficio"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setS({ ...s, rewards: [...s.rewards, { id: uid(), name: 'Nuevo beneficio', cost: 50 }] })}><Plus className="h-4 w-4" /> Agregar beneficio</Button>
              </div>
            </div>
            <p className="text-xs text-ink-400">Ofrece solo beneficios que el salón haya aprobado. Niveles: Ángel (0–99), Ángel Rosa (100–299), Ángel Oro (300+).</p>
            <Button disabled={!dirty} onClick={async () => { const r = await run((a) => a.saveLoyaltySettings(s)); toast(r.ok ? 'Reglas guardadas' : r.error, r.ok ? 'success' : 'error') }}>Guardar reglas</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Crown className="h-5 w-5 text-champagne-700" /> Clientas con puntos</h2>
          {ranking.length === 0 ? (
            <EmptyState icon={Crown} title="Aún sin puntos" text="Se acumulan al marcar citas como completadas." />
          ) : (
            <ul className="divide-y divide-blush-100">
              {ranking.map(({ c, pts }) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <Badge tone={loyaltyTier(pts).tone === 'champagne' ? 'champagne' : 'rose'}>{loyaltyTier(pts).label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl font-semibold">{pts}</span>
                    <Button size="sm" variant="secondary" onClick={() => setRedeem(c.id)}><Gift className="h-4 w-4" /> Canjear</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <h2 className="mb-3 font-display text-2xl font-semibold">Historial de acumulación y redención</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-600">Sin movimientos.</p>
        ) : (
          <ul className="divide-y divide-blush-100 text-sm">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <span>{formatDateShort(t.createdAt.slice(0, 10))} · {name(t.clientId)} · <span className="text-ink-600">{t.description}</span></span>
                <span className={cx('font-semibold', t.points > 0 ? 'text-emerald-700' : 'text-red-700')}>{t.points > 0 ? '+' : ''}{t.points}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <RedeemModal clientId={redeem} onClose={() => setRedeem(null)} />
    </div>
  )
}

function RedeemModal({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  const data = useData()
  const { run } = useStore()
  const toast = useToast()
  const [rewardId, setRewardId] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setRewardId(data.loyalty.rewards[0]?.id ?? ''); setError(null) }, [clientId, data.loyalty.rewards])
  if (!clientId) return null
  const pts = clientPoints(data.loyaltyTx, clientId)
  return (
    <Modal open onClose={onClose} title="Canjear puntos">
      <div className="space-y-4">
        <p className="text-sm">{data.clients.find((c) => c.id === clientId)?.name} tiene <strong>{pts} puntos</strong>.</p>
        {error && <Alert>{error}</Alert>}
        <Field label="Beneficio">
          {(id) => (
            <Select id={id} value={rewardId} onChange={(e) => setRewardId(e.target.value)}>
              {data.loyalty.rewards.map((r) => <option key={r.id} value={r.id} disabled={r.cost > pts}>{r.name} · {r.cost} pts{r.cost > pts ? ' (insuficiente)' : ''}</option>)}
            </Select>
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={async () => { const r = await run((a) => a.redeemReward(clientId, rewardId)); if (!r.ok) return setError(r.error); toast('Canje registrado'); onClose() }}>Confirmar canje</Button>
        </div>
      </div>
    </Modal>
  )
}
