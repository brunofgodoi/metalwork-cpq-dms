import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Field, FieldLabel, FieldGroup, FieldError } from '../ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  parentId?: string | null;
}

interface CategoryFormProps {
  initialValues?: { name: string; parentId: string | null };
  onSubmit: (data: { name: string; parentId: string | null }) => void;
  isPending: boolean;
  onCancel: () => void;
  submitLabel?: string;
  excludeCategoryId?: string; // To avoid selecting self as parent
  disableParentSelection?: boolean; // If category has children, it cannot become a subcategory
}

export function CategoryForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
  submitLabel = 'Salvar',
  excludeCategoryId,
  disableParentSelection = false,
}: CategoryFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [parentId, setParentId] = useState<string | null>(initialValues?.parentId ?? null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setParentId(initialValues.parentId ?? null);
    }
  }, [initialValues]);

  // Query to fetch all categories for parent selection
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories', 'all-active-top-form'],
    queryFn: async () => (await api.get('/categories?limit=10000')).data,
  });

  const parentCategories =
    categoriesData?.data.filter((c) => c.isActive && !c.parentId && c.id !== excludeCategoryId) ||
    [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (!name.trim()) {
      toast.error('O nome da categoria é obrigatório.');
      return;
    }

    onSubmit({
      name: name.trim(),
      parentId: parentId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldGroup>
        <Field data-invalid={triedSubmit && !name.trim()}>
          <FieldLabel>Nome da Categoria *</FieldLabel>
          <Input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Corte Laser, Usinagem, Dobra"
          />
          {triedSubmit && !name.trim() && (
            <FieldError>O nome da categoria é obrigatório.</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel>Categoria Pai (Opcional)</FieldLabel>
          {disableParentSelection ? (
            <div className="space-y-2">
              <Select disabled value="none">
                <SelectTrigger className="bg-muted text-muted-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-amber-600 font-medium">
                Esta categoria possui subcategorias e não pode ser convertida em subcategoria.
              </p>
            </div>
          ) : (
            <Select
              value={parentId || 'none'}
              onValueChange={(val) => setParentId(val === 'none' ? null : val)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione uma categoria pai se for subcategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                {parentCategories.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
