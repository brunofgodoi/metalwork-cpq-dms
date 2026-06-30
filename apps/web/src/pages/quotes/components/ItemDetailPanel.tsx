import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Upload, FileText, Download } from 'lucide-react';
import { fmtBRL, pct } from '@/lib/format';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface ItemDetailPanelProps {
  item: {
    id: string;
    project: string;
    description: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    discountPercent: number;
    process: string | null;
    material: string | null;
    estimatedHours: number | null;
    notes: string | null;
    drawingRef?: string | null;
    thumbnailUrl?: string | null;
    cadFile?: File | null;
  };
  onUpdate: (data: Partial<any>) => void;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onUpdate, onClose }: ItemDetailPanelProps) {
  const cadInputRef = useRef<HTMLInputElement>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'select'],
    queryFn: async () => {
      const { data } = await api.get('/categories?limit=500&isActive=true');
      return data.data || [];
    },
  });

  const allCategories = categoriesData ?? [];
  const parentCategories = allCategories.filter((c: any) => !c.parentId);
  const categoryOptions = parentCategories.flatMap((parent: any) => {
    const subs = allCategories.filter((c: any) => c.parentId === parent.id);
    return [
      { id: parent.id, name: parent.name },
      ...subs.map((sub: any) => ({ id: sub.id, name: `─ ${parent.name} > ${sub.name}` })),
    ];
  });
  const orphans = allCategories.filter(
    (c: any) => c.parentId && !parentCategories.some((p: any) => p.id === c.parentId),
  );
  orphans.forEach((o: any) => categoryOptions.push({ id: o.id, name: o.name }));

  const { data: defaultMarkupMarginData } = useQuery({
    queryKey: ['config', 'default_markup_margin'],
    queryFn: async () => {
      const { data } = await api.get('/config/default_markup_margin');
      return data;
    },
  });

  const { data: roundingRuleData } = useQuery({
    queryKey: ['config', 'price_rounding_rule'],
    queryFn: async () => {
      const { data } = await api.get('/config/price_rounding_rule');
      return data;
    },
  });

  const handleCadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdate({ cadFile: file, isDirty: true });
    toast.success('Arquivo CAD adicionado ao rascunho!');
    if (cadInputRef.current) cadInputRef.current.value = '';
  };

  const lineCost = item.unitCost * item.quantity;
  const margin = item.unitPrice > 0 ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 : 0;

  return (
    <div className="max-h-[calc(100vh-290px)] overflow-y-auto px-4 py-2 space-y-4">
      <div className="sticky top-0 bg-background z-10 flex items-center justify-between pb-2 border-b">
        <h3 className="font-medium">Detalhe do Item</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Projeto</Label>
        <Input value={item.project} onChange={(e) => onUpdate({ project: e.target.value })} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Descrição</Label>
        <Textarea
          value={item.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select
              value={item.process || ''}
              onValueChange={(v) => onUpdate({ process: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((opt: { id: string; name: string }) => (
                  <SelectItem key={opt.id} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Custo Unit. (R$)</Label>
            <Input
              type="number"
              step={0.01}
              min={0}
              value={item.unitCost}
              onChange={(e) => {
                const unitCost = parseFloat(e.target.value) || 0;
                const marginPercent =
                  defaultMarkupMarginData?.value != null
                    ? Number(defaultMarkupMarginData.value)
                    : 20;
                const roundingRule =
                  roundingRuleData?.value != null ? String(roundingRuleData.value) : 'NONE';
                const rawPrice =
                  marginPercent < 100 ? unitCost / (1 - marginPercent / 100) : unitCost;
                const unitPrice = applyRoundingRule(rawPrice, roundingRule);
                onUpdate({ unitCost, unitPrice });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Preço Unit. (R$)</Label>
            <Input
              type="number"
              step={0.01}
              min={0}
              value={item.unitPrice}
              onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Custo Total</span>
          <span>{fmtBRL(lineCost)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="text-muted-foreground">Margem</span>
          <span
            className={margin < 15 ? 'font-medium text-destructive' : 'font-medium text-green-600'}
          >
            {pct(margin)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Material</Label>
          <Input
            value={item.material || ''}
            onChange={(e) => onUpdate({ material: e.target.value || null })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Horas Estimadas</Label>
          <Input
            type="number"
            step={0.5}
            min={0}
            value={item.estimatedHours ?? ''}
            onChange={(e) =>
              onUpdate({ estimatedHours: e.target.value ? parseFloat(e.target.value) : null })
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Arquivo CAD</Label>
        {item.drawingRef || item.cadFile ? (
          <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">
              {item.drawingRef ? item.drawingRef.split('/').pop() : item.cadFile?.name}
            </span>
            {item.drawingRef && (
              <a
                href={
                  item.drawingRef.startsWith('http')
                    ? item.drawingRef
                    : `${api.defaults.baseURL?.replace('/api', '') || ''}${item.drawingRef}`
                }
                download
                target="_blank"
                rel="noreferrer"
                className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Baixar arquivo"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive shrink-0"
              onClick={() => onUpdate({ drawingRef: null, cadFile: null, isDirty: true })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <input
              ref={cadInputRef}
              type="file"
              accept=".dwg,.dxf,.pdf,.stp,.step,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleCadUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => cadInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Adicionar CAD
            </Button>
          </>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Observações</Label>
        <Textarea
          value={item.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          rows={2}
        />
      </div>
    </div>
  );
}

function applyRoundingRule(price: number, rule: string): number {
  if (price <= 0) return 0;
  switch (rule) {
    case 'UP_50_CENTS':
      return Math.ceil(price * 2) / 2;
    case 'UP_1_REAL':
      return Math.ceil(price);
    case 'UP_10_REAIS':
      return Math.ceil(price / 10) * 10;
    case 'NEAREST_50_CENTS':
      return Math.round(price * 2) / 2;
    case 'NEAREST_1_REAL':
      return Math.round(price);
    case 'NEAREST_10_REAIS':
      return Math.round(price / 10) * 10;
    default:
      return Number(price.toFixed(2));
  }
}
