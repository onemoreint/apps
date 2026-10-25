export function Eq({ className = '' }: { className?: string }) {
  return (
    <span className={`eq ${className}`} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}
