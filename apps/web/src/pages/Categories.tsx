import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Plus, Trash2, Loader2, Tags, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { CategoryForm } from '../components/forms/CategoryForm';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

interface CategoriesResponse {
  data: Category[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function Categories() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number | 'all'>(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit states
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<CategoriesResponse>({
    queryKey: ['categories', page, limit, search, showInactive],
    queryFn: async () => {
      const limitParam = limit === 'all' ? 10000 : limit;
      const response = await api.get(
        `/categories?page=${page}&limit=${limitParam}${search ? `&search=${encodeURIComponent(search)}` : ''}${showInactive ? '&showInactive=true' : ''}`,
      );
      return response.data;
    },
  });

  // Query to fetch all categories for parent selections
  const { data: allCategoriesData } = useQuery<CategoriesResponse>({
    queryKey: ['categories', 'all-active'],
    queryFn: async () => {
      const response = await api.get('/categories?limit=10000');
      return response.data;
    },
  });
  const allCategories = allCategoriesData?.data || [];

  const createMutation = useMutation({
    // We expect the form to submit { name, parentId }
    mutationFn: (data: { name: string; parentId: string | null }) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
      setFormError(null);
      toast.success('Categoria criada com sucesso!');
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      const message = apiError.response?.data?.message || 'Ocorreu um erro inesperado.';
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, parentId }: { id: string; name: string; parentId: string | null }) =>
      api.put(`/categories/${id}`, { name, parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setEditError(null);
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      const message = apiError.response?.data?.message || 'Ocorreu um erro inesperado.';
      setEditError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api.delete(`/categories/${id}${force ? '?force=true' : ''}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setSelectedCategory(null);
      toast.success(
        variables.force
          ? 'Categoria excluída permanentemente!'
          : 'Categoria desativada com sucesso!',
      );
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      setSelectedCategory(null);
      toast.error(apiError.response?.data?.message || 'Erro ao realizar operação.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/categories/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria reativada com sucesso!');
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Erro ao reativar categoria.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Tags className="mr-3 text-primary" />
            Categorias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie linhas de produtos e famílias de projetos.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/20 p-4 rounded-lg border justify-between">
        <Input
          placeholder="Buscar categorias por nome..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md bg-background"
        />
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Mostrar categorias desativadas
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead className="text-right font-medium pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <Tags />
                      </EmptyMedia>
                      <EmptyTitle>Erro ao carregar</EmptyTitle>
                      <EmptyDescription>
                        {(error as { normalizedError?: { message?: string } })?.normalizedError
                          ?.message || 'Não foi possível carregar as categorias.'}
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-[200px]" />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <Tags />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma categoria encontrada</EmptyTitle>
                      <EmptyDescription>
                        Crie a primeira categoria para estruturar seus projetos.
                      </EmptyDescription>
                      <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Categoria
                      </Button>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((category) => (
                  <TableRow key={category.id} className="even:bg-muted/30">
                    <TableCell className="font-medium py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              category.isActive ? '' : 'text-muted-foreground line-through'
                            }
                          >
                            {category.name}
                          </span>
                          {!category.isActive && (
                            <Badge
                              variant="outline"
                              className="border-red-500/30 text-red-500 bg-red-500/10 text-[10px] px-1.5 py-0 animate-pulse"
                            >
                              Desativada
                            </Badge>
                          )}
                        </div>
                        {category.parent && (
                          <span className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                            Subcategoria de:{' '}
                            <span className="font-semibold text-primary/80">
                              {category.parent.name}
                            </span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3 pr-6 space-x-1">
                      {category.isActive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar Categoria"
                          onClick={() => {
                            setEditingCategory(category);
                            setEditError(null);
                          }}
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {!category.isActive ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Reativar Categoria"
                            onClick={() => restoreMutation.mutate(category.id)}
                            disabled={restoreMutation.isPending}
                          >
                            {restoreMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                              <RotateCcw className="h-4 w-4 text-emerald-600 hover:text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Excluir Permanentemente"
                            onClick={() => setSelectedCategory(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Desativar Categoria"
                          onClick={() => setSelectedCategory(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {data && data.data.length > 0 && (
          <CardHeader className="py-3 px-6 border-t bg-muted/10">
            <div className="flex items-center justify-between w-full">
              <Field orientation="horizontal" className="w-fit">
                <FieldLabel
                  htmlFor="select-rows-per-page"
                  className="text-muted-foreground text-sm font-normal hidden sm:inline-block"
                >
                  Linhas por página
                </FieldLabel>
                <Select
                  value={String(limit)}
                  onValueChange={(val) => {
                    setLimit(val === 'all' ? 'all' : Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 bg-background h-8" id="select-rows-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-disabled={data.meta.page === 1}
                      className={
                        data.meta.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm font-medium px-4">
                      Página {data.meta.page} de {data.meta.totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                      aria-disabled={
                        data.meta.page >= data.meta.totalPages || data.meta.totalPages === 0
                      }
                      className={
                        data.meta.page >= data.meta.totalPages || data.meta.totalPages === 0
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardHeader>
        )}
      </Card>

      {/* Create Sheet */}
      <Sheet
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setFormError(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[35vw] w-full px-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Nova Categoria</SheetTitle>
            <SheetDescription>
              Crie uma nova linha de produto ou subcategoria para estruturar os orçamentos.
            </SheetDescription>
          </SheetHeader>

          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <CategoryForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
            onCancel={() => setIsModalOpen(false)}
            submitLabel="Salvar Categoria"
          />
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
            setEditError(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[35vw] w-full px-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Editar Categoria</SheetTitle>
            <SheetDescription>
              Altere os dados da categoria e suas relações hierárquicas.
            </SheetDescription>
          </SheetHeader>

          {editError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}

          {editingCategory && (
            <CategoryForm
              initialValues={{
                name: editingCategory.name,
                parentId: editingCategory.parentId ?? null,
              }}
              excludeCategoryId={editingCategory.id}
              disableParentSelection={allCategories.some(
                (c) => c.isActive && c.parentId === editingCategory.id,
              )}
              onSubmit={(data) =>
                updateMutation.mutate({
                  id: editingCategory.id,
                  name: data.name,
                  parentId: data.parentId,
                })
              }
              isPending={updateMutation.isPending}
              onCancel={() => setEditingCategory(null)}
              submitLabel="Salvar Alterações"
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!selectedCategory}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCategory?.isActive ? 'Desativar Categoria?' : 'Excluir Permanentemente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCategory?.isActive
                ? selectedCategory.parentId
                  ? 'Esta ação desativará a subcategoria temporariamente. Você poderá reativá-la a qualquer momento.'
                  : 'Esta ação desativará a categoria e todas as suas subcategorias temporariamente. Você poderá reativá-la a qualquer momento.'
                : 'Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria (e suas subcategorias, se houver) do banco de dados. Atenção: a exclusão falhará se houver orçamentos vinculados.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCategory) {
                  deleteMutation.mutate({
                    id: selectedCategory.id,
                    force: !selectedCategory.isActive,
                  });
                }
              }}
              className="bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 border-none"
            >
              {deleteMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {selectedCategory?.isActive ? 'Desativar' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
