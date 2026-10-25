import type { ReactNode } from 'react';

export function Section({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {action && (
          <button type="button" onClick={action.onClick} className="text-sm font-semibold text-accent-3 hover:underline">
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
