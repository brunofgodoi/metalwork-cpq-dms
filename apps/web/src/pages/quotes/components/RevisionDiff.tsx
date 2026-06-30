import { Badge } from '@/components/ui/badge';

interface DiffEntry {
  field: string;
  from: any;
  to: any;
}

export function RevisionDiff({
  changes,
  revFrom,
  revTo,
}: {
  changes: DiffEntry[];
  revFrom: string;
  revTo: string;
}) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma alteração entre as revisões.</p>;
  }

  const fieldLabels: Record<string, string> = {
    price: 'Preço',
    estimatedPrice: 'Preço Estimado',
    contractedPrice: 'Preço Contratado',
    discountPercent: 'Desconto (%)',
    discountFixed: 'Desconto (R$)',
    deliveryDate: 'Data de Entrega',
    validUntil: 'Validade',
    totalCost: 'Custo Total',
    items: 'Itens',
  };

  return (
    <div className="space-y-3 max-w-full overflow-x-hidden">
      <p className="text-sm text-muted-foreground">
        Comparando revisão <Badge variant="outline">{revFrom}</Badge> →{' '}
        <Badge variant="outline">{revTo}</Badge>
      </p>
      <div className="divide-y rounded-lg border">
        {changes.map((c, i) => {
          if (c.field === 'items') {
            return (
              <div key={i} className="p-3">
                <p className="text-sm font-medium mb-2 text-muted-foreground">Itens</p>
                <ItemDiff fromItems={c.from} toItems={c.to} />
              </div>
            );
          }
          return (
            <div key={i} className="flex items-start gap-4 p-3">
              <span className="text-sm font-medium w-36 shrink-0 text-muted-foreground">
                {fieldLabels[c.field] || c.field}
              </span>
              <div className="flex-1 min-w-0 flex gap-4">
                <span className="text-sm line-through text-muted-foreground flex-1 break-words">
                  {formatValue(c.field, c.from)}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium flex-1 break-words">
                  {formatValue(c.field, c.to)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemDiff({ fromItems, toItems }: { fromItems: any; toItems: any }) {
  const from: any[] = Array.isArray(fromItems) ? fromItems : [];
  const to: any[] = Array.isArray(toItems) ? toItems : [];
  const maxLen = Math.max(from.length, to.length);

  const itemFields = ['unitPrice', 'unitCost', 'discountPercent', 'quantity'] as const;

  const itemFieldLabels: Record<string, string> = {
    unitPrice: 'Preço Unit.',
    unitCost: 'Custo Unit.',
    discountPercent: 'Desc. (%)',
    quantity: 'Quantidade',
  };

  return (
    <div className="space-y-2 overflow-x-auto">
      {Array.from({ length: maxLen }).map((_, idx) => {
        const f = from[idx];
        const t = to[idx];
        const hasFrom = !!f;
        const hasTo = !!t;
        const changedFields = itemFields.filter(
          (field) => hasFrom && hasTo && JSON.stringify(f[field]) !== JSON.stringify(t[field]),
        );
        if (!changedFields.length && hasFrom && hasTo) return null;

        return (
          <div key={idx} className="rounded-md bg-muted/30 p-2 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Item {idx + 1}</p>
            {changedFields.length === 0 && hasFrom && hasTo && (
              <p className="text-muted-foreground">Sem alterações</p>
            )}
            {changedFields.map((field) => (
              <div key={field} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-muted-foreground">
                  {itemFieldLabels[field]}
                </span>
                {hasFrom && (
                  <span className="line-through text-muted-foreground">
                    {formatItemValue(field, f[field])}
                  </span>
                )}
                {hasTo && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {formatItemValue(field, t[field])}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function formatItemValue(field: string, value: any): string {
  if (value == null) return '—';
  if (field === 'unitPrice' || field === 'unitCost') {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (field === 'discountPercent') return `${Number(value)}%`;
  if (field === 'quantity') return String(Number(value));
  return String(value);
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return '—';
  if (
    field === 'price' ||
    field === 'estimatedPrice' ||
    field === 'contractedPrice' ||
    field === 'totalCost' ||
    field === 'discountFixed'
  ) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (field === 'discountPercent') return `${Number(value)}%`;
  if (field === 'deliveryDate' || field === 'validUntil')
    return new Date(value).toLocaleDateString('pt-BR');
  return String(value);
}
