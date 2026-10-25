import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act, cleanup } from '@testing-library/react';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => Promise.resolve() }));

const toggle = vi.fn();
vi.mock('@/player/engine', () => ({ engine: () => ({ toggle, resume: vi.fn(), pause: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), toggleMute: vi.fn() }) }));

const { default: App } = await import('./App');

function goTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('interfaz', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    sessionStorage.setItem('radiomix:splash', '1');
    toggle.mockClear();
  });

  it('la pantalla de categorías muestra las 19 y marca las pendientes sin simular transmisión', () => {
    render(<App />);
    goTo('#/categorias');
    const main = screen.getByRole('main');
    const cards = within(main).getAllByRole('button', { name: /Salsa clásica|Merengue|Bachata|Vallenato|llanera|popular|Regional|Reguetón|Pop|Rock|Baladas|electrónica|tropical|cristiana|Instrumental|Éxitos|nueva/ });
    expect(cards.length).toBeGreaterThanOrEqual(19);
    expect(within(main).getByRole('button', { name: /Salsa clásica y romántica \(pendiente de configuración\)/ })).toBeInTheDocument();
    expect(within(main).getByRole('button', { name: /^Instrumental y relajación$/ })).toBeInTheDocument();
  });

  it('una categoría pendiente no ofrece botón de reproducir', () => {
    render(<App />);
    goTo('#/categoria/salsa');
    expect(screen.getByText('Pendiente de configuración')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Escuchar / })).toBeNull();
  });

  it('en una categoría con fuente, pulsar escuchar arranca el motor de audio', () => {
    render(<App />);
    goTo('#/categoria/instrumental');
    const btn = screen.getByRole('button', { name: 'Escuchar Clásica Musopen' });
    act(() => btn.click());
    expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'clasica-musopen' }));
  });

  it('la búsqueda ignora tildes', () => {
    render(<App />);
    goTo('#/buscar?q=electronica');
    expect(screen.getByRole('heading', { name: 'Pulso Electrónico' })).toBeInTheDocument();
  });

  it('el panel de administración carga', async () => {
    render(<App />);
    goTo('#/admin');
    expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument();
  });
});
