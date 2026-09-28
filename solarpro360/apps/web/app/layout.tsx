import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOLARPRO 360 — Dimensiona · Costea · Cotiza · Instala',
  description: 'Plataforma profesional para dimensionar, costear y cotizar sistemas solares fotovoltaicos.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
