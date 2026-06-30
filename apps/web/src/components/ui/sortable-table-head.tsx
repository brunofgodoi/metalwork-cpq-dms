import { type ReactNode } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortableTableHeadProps {
  children: ReactNode;
  active?: 'asc' | 'desc';
  onClick?: () => void;
  className?: string;
}

export function SortableTableHead({
  children,
  active,
  onClick,
  className,
}: SortableTableHeadProps) {
  return (
    <TableHead className={cn(className, onClick && 'cursor-pointer select-none')} onClick={onClick}>
      <div className="flex items-center gap-1">
        {children}
        {active &&
          (active === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </div>
    </TableHead>
  );
}
