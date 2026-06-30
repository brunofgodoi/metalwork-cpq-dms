import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface QuoteItemRowProps {
  item: {
    id: string;
    project: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
  };
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (data: Partial<any>) => void;
  onRemove: () => void;
}

export function QuoteItemRow({
  item,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: QuoteItemRowProps) {
  const effectivePrice = item.unitPrice * (1 - item.discountPercent / 100);
  const lineTotal = effectivePrice * item.quantity;

  return (
    <tr
      className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''} ${index % 2 === 1 ? 'bg-muted/20' : ''}`}
      onClick={onSelect}
    >
      <td className="w-10 px-2 py-1 text-xs text-muted-foreground text-center">{index + 1}</td>
      <td className="px-2 py-1 min-w-[140px]">
        <Input
          value={item.project}
          onChange={(e) => onUpdate({ project: e.target.value })}
          placeholder="Projeto"
          className="h-7 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="w-24 px-2 py-1">
        <Input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
          className="h-7 text-right text-sm tabular-nums"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="min-w-[130px] px-2 py-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground shrink-0">R$</span>
          <Input
            type="number"
            step={0.01}
            min={0}
            value={item.unitPrice}
            onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
            className="h-7 flex-1 text-right text-sm tabular-nums"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="w-20 px-2 py-1">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step={0.1}
            min={0}
            max={100}
            value={item.discountPercent}
            onChange={(e) => onUpdate({ discountPercent: parseFloat(e.target.value) || 0 })}
            className="h-7 flex-1 text-right text-sm tabular-nums"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-xs text-muted-foreground shrink-0">%</span>
        </div>
      </td>
      <td className="min-w-[100px] px-2 py-1 text-right font-medium tabular-nums whitespace-nowrap">
        R$ {lineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </td>
      <td className="w-12 px-1 py-1 text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
