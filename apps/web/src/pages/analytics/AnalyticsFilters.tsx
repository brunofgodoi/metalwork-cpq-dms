import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { FileDown, RefreshCw } from 'lucide-react';
import type { AnalyticsFilters as Filters } from '../../hooks/use-analytics';

interface Client {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface AnalyticsFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onExportCsv: () => void;
}

export function AnalyticsFilters({ filters, onChange, onExportCsv }: AnalyticsFiltersProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Fetch clients
  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients', 'all'],
    queryFn: async () => (await api.get('/clients?limit=10000')).data,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get('/categories?limit=10000')).data,
  });

  const clientOptions = clientsData?.data.map((c) => ({ value: c.id, label: c.name })) || [];

  const categoriesList = categoriesData?.data || [];
  const parents = categoriesList.filter((c) => !c.parentId);
  const subs = categoriesList.filter((c) => c.parentId);

  const categoryOptions: { value: string; label: string; displayLabel: string }[] = [];
  parents.forEach((parent) => {
    categoryOptions.push({
      value: parent.id,
      label: parent.name,
      displayLabel: parent.name,
    });
    subs
      .filter((sub) => sub.parentId === parent.id)
      .forEach((child) => {
        categoryOptions.push({
          value: child.id,
          label: `${parent.name} ➔ ${child.name}`,
          displayLabel: `\u00A0\u00A0\u00A0\u00A0↳ ${child.name}`,
        });
      });
  });

  subs.forEach((child) => {
    if (!categoryOptions.some((c) => c.value === child.id)) {
      const parentName = parents.find((p) => p.id === child.parentId)?.name || '';
      categoryOptions.push({
        value: child.id,
        label: parentName ? `${parentName} ➔ ${child.name}` : child.name,
        displayLabel: child.name,
      });
    }
  });

  const ALL_CLIENTS = { value: '', label: 'Todos os Clientes' };
  const ALL_CATEGORIES = {
    value: '',
    label: 'Todas as Categorias',
    displayLabel: 'Todas as Categorias',
  };

  const allClientItems = [ALL_CLIENTS, ...clientOptions];
  const allCategoryItems = [ALL_CATEGORIES, ...categoryOptions];

  const handlePeriodChange = (period: 'month' | 'year' | 'all') => {
    onChange({
      ...filters,
      period,
      startDate: '',
      endDate: '',
    });
  };

  const handleClientChange = (val: { value: string; label: string } | null) => {
    onChange({
      ...filters,
      clientId: val ? val.value : '',
    });
  };

  const handleCategoryChange = (val: { value: string; label: string } | null) => {
    onChange({
      ...filters,
      categoryId: val ? val.value : '',
    });
  };

  const handleDateChange = (type: 'startDate' | 'endDate', val: string) => {
    onChange({
      ...filters,
      period: undefined,
      [type]: val,
    });
  };

  const handleClearFilters = () => {
    onChange({
      period: 'month',
      clientId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div
      ref={setContainerRef}
      className="bg-card border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col gap-4">
        {/* Left/Main filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {/* Period Button Group */}
          <Field className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Período Padrão
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 h-9">
              <button
                type="button"
                onClick={() => handlePeriodChange('month')}
                className={`flex-1 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  filters.period === 'month'
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('year')}
                className={`flex-1 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  filters.period === 'year'
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ano
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('all')}
                className={`flex-1 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  filters.period === 'all'
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tudo
              </button>
            </div>
          </Field>

          {/* Client Filter */}
          <Field className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cliente
            </span>
            <Combobox
              value={allClientItems.find((o) => o.value === (filters.clientId || '')) || null}
              onValueChange={handleClientChange}
              items={allClientItems}
            >
              <ComboboxInput placeholder="Buscar cliente..." />
              <ComboboxContent container={containerRef} className="z-50">
                <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                <ComboboxList>
                  {allClientItems.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt} className="text-xs cursor-pointer">
                      {opt.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>

          {/* Category Filter */}
          <Field className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Categoria
            </span>
            <Combobox
              value={allCategoryItems.find((o) => o.value === (filters.categoryId || '')) || null}
              onValueChange={handleCategoryChange}
              items={allCategoryItems}
            >
              <ComboboxInput placeholder="Buscar categoria..." />
              <ComboboxContent container={containerRef} className="z-50">
                <ComboboxEmpty>Nenhuma categoria encontrada.</ComboboxEmpty>
                <ComboboxList>
                  {allCategoryItems.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt} className="text-xs cursor-pointer">
                      {opt.displayLabel || opt.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>

          {/* Custom Date Filters */}
          <Field className="flex flex-col gap-1.5 col-span-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Intervalo Customizado
            </span>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="flex-1 text-xs px-2 h-9 border border-slate-200 dark:border-slate-800 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                aria-label="Data Inicial"
              />
              <span className="text-muted-foreground text-xs font-bold">a</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="flex-1 text-xs px-2 h-9 border border-slate-200 dark:border-slate-800 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                aria-label="Data Final"
              />
            </div>
          </Field>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            title="Limpar Filtros"
            className="h-9 px-3 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onExportCsv}
            className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
