import type { ImageAsset, ImageSearchProvider, LicenseInfo, Orientation, SearchResult } from '../core/types';
import { assetFromBlob } from './assets';

/**
 * BÚSQUEDA WEB — capa ImageSearchProvider.
 * Proveedores incluidos: bancos de imágenes con licencias abiertas y API pública
 * (Openverse y Wikimedia Commons). Siempre se muestra la licencia y la fuente;
 * nunca se asume que una imagen de Internet es de uso comercial libre.
 * Para añadir otro proveedor (Unsplash, Pexels, uno propio…), implemente la
 * interfaz ImageSearchProvider y regístrelo en SEARCH_PROVIDERS. Si requiere
 * API key, hágalo a través de su backend (nunca en el frontend).
 */

function ccLicense(code: string, version?: string, url?: string, creator?: string): LicenseInfo {
  const c = (code || '').toLowerCase();
  const commercial = ['by', 'by-sa', 'cc0', 'pdm', 'by-nd'].includes(c);
  const name = c === 'cc0' ? 'CC0 (dominio público)' : c === 'pdm' ? 'Dominio público' : c ? `CC ${c.toUpperCase()}${version ? ' ' + version : ''}` : 'Desconocida';
  return { name, url, commercialUse: c ? commercial : 'unknown', attribution: creator };
}

async function fetchBlob(urls: string[]): Promise<Blob> {
  let lastErr: unknown;
  for (const u of urls) {
    try {
      const r = await fetch(u, { mode: 'cors' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = await r.blob();
      if (!b.type.startsWith('image/')) throw new Error('No es imagen');
      return b;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    'Esta fuente no permite incorporar la imagen directamente desde el navegador. Puedes guardarla como referencia o descargarla y subirla desde tu dispositivo si su licencia lo permite.' +
      (lastErr instanceof Error ? ` (${lastErr.message})` : ''),
  );
}

async function toAsset(provider: string, r: SearchResult): Promise<ImageAsset> {
  const blob = await fetchBlob([r.fullUrl, r.thumbUrl]);
  return assetFromBlob(blob, {
    source: 'web',
    title: r.title,
    tags: r.title.toLowerCase().split(/\s+/).slice(0, 6),
    origin: { provider, pageUrl: r.pageUrl, creator: r.creator },
    license: r.license,
  });
}

export class OpenverseProvider implements ImageSearchProvider {
  readonly id = 'openverse';
  readonly name = 'Openverse (licencias abiertas)';
  async search(query: string, opts?: { page?: number; orientation?: Orientation }): Promise<SearchResult[]> {
    const p = new URLSearchParams({ q: query, page_size: '24', page: String(opts?.page ?? 1), mature: 'false' });
    if (opts?.orientation) p.set('aspect_ratio', opts.orientation === 'horizontal' ? 'wide' : opts.orientation === 'vertical' ? 'tall' : 'square');
    const res = await fetch(`https://api.openverse.org/v1/images/?${p}`);
    if (!res.ok) throw new Error(`Openverse respondió ${res.status}`);
    const data = await res.json();
    type OV = { id: string; title?: string; url: string; thumbnail: string; width?: number; height?: number; creator?: string; license: string; license_version?: string; license_url?: string; foreign_landing_url?: string; source?: string; provider?: string };
    return (data.results as OV[]).map((x) => ({
      id: x.id,
      providerId: 'openverse',
      thumbUrl: x.thumbnail,
      fullUrl: x.url,
      width: x.width ?? 0,
      height: x.height ?? 0,
      title: x.title || 'Imagen sin título',
      sourceName: x.source || x.provider || 'Openverse',
      pageUrl: x.foreign_landing_url || x.url,
      creator: x.creator,
      license: ccLicense(x.license, x.license_version, x.license_url, x.creator),
    }));
  }
  fetchAsset(r: SearchResult) { return toAsset(this.name, r); }
}

export class WikimediaProvider implements ImageSearchProvider {
  readonly id = 'wikimedia';
  readonly name = 'Wikimedia Commons';
  async search(query: string, opts?: { page?: number }): Promise<SearchResult[]> {
    const offset = ((opts?.page ?? 1) - 1) * 24;
    const p = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '24', gsroffset: String(offset),
      prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '480', format: 'json', origin: '*',
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${p}`);
    if (!res.ok) throw new Error(`Wikimedia respondió ${res.status}`);
    const data = await res.json();
    type Page = { pageid: number; title: string; imageinfo?: { url: string; thumburl: string; width: number; height: number; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] };
    const pages: Page[] = Object.values(data.query?.pages ?? {});
    return pages
      .filter((pg) => pg.imageinfo?.[0])
      .map((pg) => {
        const ii = pg.imageinfo![0];
        const md = ii.extmetadata ?? {};
        const lic = (md.LicenseShortName?.value ?? '').trim();
        const creator = (md.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
        const l = lic.toLowerCase();
        const commercial: LicenseInfo['commercialUse'] = !lic ? 'unknown' : /nc/.test(l) ? false : /(cc|public domain|pd|gfdl)/.test(l) ? true : 'unknown';
        return {
          id: String(pg.pageid),
          providerId: 'wikimedia',
          thumbUrl: ii.thumburl,
          fullUrl: ii.url,
          width: ii.width,
          height: ii.height,
          title: pg.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
          sourceName: 'Wikimedia Commons',
          pageUrl: ii.descriptionurl,
          creator,
          license: { name: lic || 'Desconocida', url: md.LicenseUrl?.value, commercialUse: commercial, attribution: creator },
        };
      });
  }
  fetchAsset(r: SearchResult) { return toAsset(this.name, r); }
}

export const SEARCH_PROVIDERS: ImageSearchProvider[] = [new OpenverseProvider(), new WikimediaProvider()];
