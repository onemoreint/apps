import { describe, expect, it } from 'vitest';
import { FORMAT_CATALOG, formatFromCatalog, documentResolution, exportableDpi, reorient, customFormat, recommendProduct, toMm, fromMm, aspectRatioLabel } from '../core/formats';
import { layoutBoard, bestGrid } from '../core/layout';
import { getTemplate, TEMPLATES } from '../core/templates';
import { qualityLevel, validateBoard } from '../core/validation';
import { buildSearchQuery, toEnglishQuery, buildAIPrompt } from '../providers/query';
import type { BoardContent, ImageAsset } from '../core/types';

const cat = (id: string) => FORMAT_CATALOG.find((f) => f.id === id)!;

describe('formatos y resolución', () => {
  it('50×70 cm a 300 DPI ≈ 5906 × 8268 px (sin sangrado)', () => {
    const f = formatFromCatalog(cat('pos-50x70'));
    f.quality = 'profesional';
    const r = documentResolution(f);
    expect(r.trimPxW).toBe(5906);
    expect(r.trimPxH).toBe(8268);
    expect(r.bleedPx).toBe(35); // 3 mm
    expect(r.totalPxW).toBe(5906 + 70);
  });

  it('formatos digitales usan píxeles exactos', () => {
    const r = documentResolution(formatFromCatalog(cat('dig-wallpaper')));
    expect([r.totalPxW, r.totalPxH]).toEqual([1080, 1920]);
  });

  it('orientación intercambia dimensiones y el cuadrado usa el lado corto', () => {
    const f = formatFromCatalog(cat('imp-a4'));
    const h = reorient(f, 'horizontal');
    expect(h.widthMm).toBeCloseTo(297);
    expect(h.heightMm).toBeCloseTo(210);
    const s = reorient(f, 'cuadrado');
    expect(s.widthMm).toBeCloseTo(210);
    expect(s.heightMm).toBeCloseTo(210);
  });

  it('conversiones de unidades', () => {
    expect(toMm(1, 'in')).toBeCloseTo(25.4);
    expect(fromMm(254, 'cm')).toBeCloseTo(25.4);
    expect(customFormat(60, 160, 'cm').widthMm).toBe(600);
  });

  it('limita el DPI de exportación en navegadores con poca memoria', () => {
    const f = formatFromCatalog(cat('pen-150x200'));
    f.quality = 'profesional';
    const e = exportableDpi(f, 16_777_216);
    expect(e.capped).toBe(true);
    expect(e.dpi).toBeLessThan(80);
    const small = formatFromCatalog(cat('imp-a4'));
    expect(exportableDpi(small, 100_000_000)).toEqual({ dpi: 300, capped: false });
  });

  it('recomienda póster grande para la habitación', () => {
    expect(recommendProduct('Quiero imprimir un mapa de sueños grande para colocarlo en mi habitación')?.id).toBe('poster-grande');
    expect(recommendProduct('lo quiero de fondo para el celular')?.id).toBe('celular');
    expect(recommendProduct('para un evento, un pendón')?.id).toBe('pendon');
  });

  it('relación de aspecto', () => {
    expect(aspectRatioLabel(1080, 1920)).toBe('9:16');
  });
});

describe('motor de distribución', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  it('todas las celdas quedan dentro de la zona segura en cualquier formato', () => {
    for (const f of FORMAT_CATALOG) {
      for (const o of ['vertical', 'horizontal', 'cuadrado'] as const) {
        const fmt = reorient(formatFromCatalog(f), o);
        const L = layoutBoard(fmt, getTemplate('luxury'), ids, 0.2);
        expect(L.cells).toHaveLength(6);
        for (const c of L.cells) {
          expect(c.rect.x).toBeGreaterThanOrEqual(L.safe.x - 0.01);
          expect(c.rect.y).toBeGreaterThanOrEqual(L.safe.y - 0.01);
          expect(c.rect.x + c.rect.w).toBeLessThanOrEqual(L.safe.x + L.safe.w + 0.01);
          expect(c.rect.y + c.rect.h).toBeLessThanOrEqual(L.safe.y + L.safe.h + 0.01);
        }
      }
    }
  });

  it('todas las plantillas (bento, collage, mosaico) mantienen cada foto girada dentro del área', () => {
    for (const t of TEMPLATES) {
      for (const id of ['dig-wallpaper', 'dig-4k', 'pos-50x70', 'pen-60x160', 'imp-a4']) {
        for (const n of [1, 3, 6, 9]) {
          const L = layoutBoard(formatFromCatalog(cat(id)), t, ids.concat(['g', 'h', 'i']).slice(0, n), 0.3);
          expect(L.cells).toHaveLength(n);
          for (const c of L.cells) {
            const a = c.rotation ?? 0;
            const bw = (c.rect.w * Math.abs(Math.cos(a)) + c.rect.h * Math.abs(Math.sin(a))) / 2;
            const bh = (c.rect.w * Math.abs(Math.sin(a)) + c.rect.h * Math.abs(Math.cos(a))) / 2;
            const cx = c.rect.x + c.rect.w / 2, cy = c.rect.y + c.rect.h / 2;
            expect(cx - bw).toBeGreaterThanOrEqual(L.area.x - 0.5);
            expect(cy - bh).toBeGreaterThanOrEqual(L.area.y - 0.5);
            expect(cx + bw).toBeLessThanOrEqual(L.area.x + L.area.w + 0.5);
            expect(cy + bh).toBeLessThanOrEqual(L.area.y + L.area.h + 0.5);
            expect(c.rect.w).toBeGreaterThan(0);
            expect(c.rect.h).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('reorganiza: vertical en columnas, horizontal con cabecera lateral', () => {
    const v = layoutBoard(formatFromCatalog(cat('dig-wallpaper')), getTemplate('minimal'), ids);
    const h = layoutBoard(formatFromCatalog(cat('dig-fhd')), getTemplate('minimal'), ids);
    expect(v.headerMode).toBe('top');
    expect(h.headerMode).toBe('side');
    expect(bestGrid(6, 1000, 1800, 10, 1).cols).toBe(2);
  });
});

describe('calidad y validación', () => {
  it('umbrales de calidad', () => {
    expect(qualityLevel(300, 300)).toBe('excelente');
    expect(qualityLevel(180, 300)).toBe('aceptable');
    expect(qualityLevel(90, 300)).toBe('insuficiente');
  });

  const content: BoardContent = {
    projectName: 'x', title: 'Mi mapa', subtitle: '', dreams: [
      { id: 'd1', title: 'Casa', description: '', category: 'hogar', imageId: 'small', focusX: 0.5, focusY: 0.5, references: [] },
    ],
  };
  const small: ImageAsset = { id: 'small', source: 'device', src: '', title: 's', width: 640, height: 480, tags: [], createdAt: 0 };

  it('una foto de 640 px es insuficiente para 70×100 cm y bloquea la impresión', () => {
    const f = formatFromCatalog(cat('pos-70x100'));
    const v = validateBoard(f, getTemplate('luxury'), content, new Map([['small', small]]), 100_000_000);
    expect(v.images[0].level).toBe('insuficiente');
    expect(v.ready).toBe(false);
    expect(v.alerts.some((a) => a.message.includes('70 × 100 cm'))).toBe(true);
  });

  it('una foto de 12 MP es excelente en un fondo de celular pero no alcanza para 70×100 cm', () => {
    const photo = { ...small, width: 4000, height: 3000 };
    const v = validateBoard(formatFromCatalog(cat('dig-wallpaper')), getTemplate('luxury'), content, new Map([['small', photo]]));
    const big = validateBoard(formatFromCatalog(cat('pos-70x100')), getTemplate('luxury'), content, new Map([['small', photo]]), 100_000_000);
    expect(big.images[0].level).not.toBe('excelente');
    expect(v.images[0].level).toBe('excelente');
    expect(v.ready).toBe(true);
  });

  it('margen seguro pequeño genera alerta de texto cerca del borde', () => {
    const f = { ...formatFromCatalog(cat('imp-a4')), safeMm: 2 };
    const v = validateBoard(f, getTemplate('luxury'), content, new Map([['small', { ...small, width: 5000, height: 4000 }]]));
    expect(v.alerts.some((a) => a.id === 'safe')).toBe(true);
  });
});

describe('consultas y prompts', () => {
  it('construye consulta visual desde el sueño', () => {
    const q = buildSearchQuery({ title: '', description: 'Quiero un Toyota Fortuner negro 2027.' });
    expect(q).toBe('toyota fortuner negro 2027');
    expect(toEnglishQuery('casa moderna piscina mar')).toBe('house modern pool ocean');
  });
  it('prompt de IA incluye estilo, escena y orientación', () => {
    const p = buildAIPrompt({ dream: { title: 'Casa', description: 'Quiero tener una casa moderna con piscina frente al mar', category: 'hogar' }, style: 'luxury', orientation: 'vertical' });
    expect(p).toContain('casa moderna con piscina frente al mar');
    expect(p).toContain('lujo');
    expect(p).toContain('vertical');
  });
});
