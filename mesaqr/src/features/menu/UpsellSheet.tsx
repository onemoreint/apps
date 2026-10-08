import type { MenuProduct } from '@/shared/types/menu';
import { Sheet } from '@/shared/ui/Sheet';
import { SuggestionList } from './SuggestionList';

interface Props {
  products: MenuProduct[];
  onPick: (p: MenuProduct) => void;
  onClose: () => void;
}

/** "Completa tu pedido": sugerencias contextuales tras agregar. Aparece una vez por visita. */
export function UpsellSheet({ products, onPick, onClose }: Props) {
  return (
    <Sheet
      open
      onClose={onClose}
      title="🍟 Completa tu pedido"
      footer={
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full bg-shelf font-display font-bold">
          No, gracias
        </button>
      }
    >
      <SuggestionList products={products} onPick={onPick} />
    </Sheet>
  );
}
