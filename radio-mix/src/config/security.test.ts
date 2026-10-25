import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CSP_DIRECTIVES, SECURITY_HEADERS, cspString } from './security';

const file = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('política de seguridad del contenido', () => {
  it('solo ejecuta código propio: sin eval, sin scripts en línea, sin CDNs', () => {
    expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'"]);
    expect(cspString()).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline|\*/);
  });
  it('bloquea plugins, cambios de base y envíos de formularios a terceros', () => {
    expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
    expect(CSP_DIRECTIVES['form-action']).toEqual(["'self'"]);
  });
  it('audio, imágenes y conexiones solo por https; iframes solo de Spotify', () => {
    for (const d of ['media-src', 'img-src', 'connect-src']) expect(CSP_DIRECTIVES[d]).not.toContain('http:');
    expect(CSP_DIRECTIVES['frame-src']).toEqual(['https://open.spotify.com']);
  });
  it('la versión de cabecera añade anti-clickjacking y mejora a https', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain('upgrade-insecure-requests');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toMatch(/max-age=\d{8}/);
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
  });
  it('vercel.json está sincronizado con la fuente única (npm run headers)', () => {
    const v = JSON.parse(file('vercel.json')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const all = Object.fromEntries(v.headers[0]!.headers.map((h) => [h.key, h.value]));
    expect(all).toEqual(SECURITY_HEADERS);
  });
  it('security.txt es válido y no ha caducado (RFC 9116: máximo un año)', () => {
    const txt = file('public/.well-known/security.txt');
    expect(txt).toMatch(/^Contact: mailto:/m);
    const exp = new Date(/^Expires: (.+)$/m.exec(txt)![1]!);
    expect(exp.getTime()).toBeGreaterThan(Date.now());
    expect(exp.getTime() - Date.now()).toBeLessThan(366 * 864e5);
  });
});
