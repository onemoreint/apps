import { describe, expect, it } from 'vitest';
import { checkCompliance } from '../src/domain/compliance';
import { analyzeObjection } from '../src/domain/content/objections';
import { SCENARIOS, evaluateResponse } from '../src/domain/content/simulator';
import { SITUATIONS, CHANNELS, STYLES } from '../src/domain/content/conversations';
import { localAiService } from '../src/services/aiService';

describe('Cumplimiento', () => {
  it('detecta promesas de ingresos, afirmaciones médicas y presión', () => {
    expect(checkCompliance('Ingresos garantizados desde el primer mes').some((i) => i.kind === 'ingresos')).toBe(true);
    expect(checkCompliance('Este parche cura la diabetes').some((i) => i.kind === 'medico')).toBe(true);
    expect(checkCompliance('Es tu última oportunidad, solo hoy').some((i) => i.kind === 'presion')).toBe(true);
    expect(checkCompliance('Hola, ¿cómo estás? ¿Qué te pareció la presentación?')).toHaveLength(0);
  });
});

describe('Generador de conversaciones', () => {
  it('todas las combinaciones generan texto sin problemas de cumplimiento', () => {
    for (const s of SITUATIONS)
      for (const ch of CHANNELS)
        for (const st of STYLES) {
          const r = localAiService.generateConversation({ situation: s.key, channel: ch.key, style: st.key, name: 'Carlos', company: 'One More International', productCategory: 'productos de bienestar' });
          expect(r.text.length).toBeGreaterThan(20);
          expect(r.text).not.toContain('{');
          expect(r.compliance, `${s.key}/${ch.key}/${st.key}: ${r.text}`).toHaveLength(0);
        }
  });
  it('las variantes cambian la pregunta', () => {
    const base = { situation: 'seguimiento' as const, channel: 'whatsapp' as const, style: 'natural' as const, company: 'X', productCategory: 'y' };
    expect(localAiService.generateConversation({ ...base, variant: 0 }).text).not.toBe(localAiService.generateConversation({ ...base, variant: 1 }).text);
  });
});

describe('Laboratorio de objeciones', () => {
  it.each([
    ['No tengo tiempo', 'tiempo'],
    ['¿Eso no es una pirámide?', 'desconfianza'],
    ['Ahorita no tengo plata', 'dinero'],
    ['Déjame pensarlo', 'pensarlo'],
    ['Tengo que consultarlo con mi esposa', 'consultar'],
    ['Yo no sé vender', 'no_vendedor'],
    ['Está muy caro', 'precio'],
  ])('"%s" → %s', (text, key) => {
    expect(analyzeObjection(text).detected?.key).toBe(key);
  });
  it('texto sin objeción conocida → no identificada', () => {
    expect(analyzeObjection('Hmm, no sé qué decirte').confidence).toBe('no_identificada');
  });
});

describe('Simulador', () => {
  const turn = SCENARIOS[0].turns[0];
  it('una buena respuesta (empatía + pregunta abierta, sin presión) se evalúa bien', () => {
    const e = evaluateResponse(turn, 'Te entiendo, gracias por decírmelo con sinceridad. ¿Es un tema del momento con el dinero o todavía no ves claro si valdría la pena invertir?');
    expect(e.quality).toBe('buena');
    expect(e.good.length).toBeGreaterThan(2);
    expect(e.suggestedQuestion.length).toBeGreaterThan(10);
  });
  it('una respuesta con presión se marca como débil y lo explica', () => {
    const e = evaluateResponse(turn, 'Tienes que invertir ya, es tu última oportunidad. Vas a ganar mucho, ingresos garantizados!!!!');
    expect(e.quality).toBe('debil');
    expect(e.dimensions.find((d) => d.key === 'presion')!.level).toBe(0);
    expect(e.improve.length).toBeGreaterThan(0);
  });
  it('"entiendo, pero" se detecta como validación anulada', () => {
    const e = evaluateResponse(turn, 'Entiendo, pero si no inviertes nunca vas a salir de donde estás.');
    expect(e.dimensions.find((d) => d.key === 'empatia')!.level).toBe(1);
  });
});
