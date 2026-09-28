import Link from 'next/link';

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
        <span className="logo-mark" aria-hidden />
        SOLARPRO 360
        <span className="tagline">Dimensiona · Costea · Cotiza · Instala</span>
      </Link>
      {right}
    </header>
  );
}
