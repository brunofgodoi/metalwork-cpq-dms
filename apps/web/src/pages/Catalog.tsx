import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Download,
  Plus,
  FileImage,
  Search,
  Loader2,
  Upload,
  File,
  FileText,
  ArrowUpDown,
} from 'lucide-react';
import { fmtBRL } from '@/lib/format';
import { downloadBlob } from '@/lib/download';
import { CurrencyInput } from '@/components/ui/masked-input';
import { toast } from 'sonner';
import { CatalogDetailPanel } from './catalog/CatalogDetailPanel';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

interface StandardDrawing {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  categoryId?: string;
  category?: { id: string; name: string };
  basePrice?: number;
  thumbnail?: string;
  versions?: { version: number; filePath?: string; docFilePath?: string }[];
}

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  code: '',
  name: '',
  type: 'PRODUCT',
  categoryId: '',
  basePrice: '',
  description: '',
};

export function Catalog() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailDrawingId, setDetailDrawingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [basePriceStr, setBasePriceStr] = useState('');
  const [basePriceNum, setBasePriceNum] = useState<number | undefined>();
  const limit = 20;
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['standard-drawings', page, typeFilter, searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (typeFilter && typeFilter !== 'ALL') params.set('type', typeFilter);
      if (searchTerm) params.set('search', searchTerm);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      const { data } = await api.get(`/catalog/standard-drawings?${params}`);
      return data;
    },
  });

  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/categories?limit=1000');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      const { data } = await api.post('/catalog/standard-drawings', {
        ...payload,
        basePrice: basePriceNum,
        categoryId: payload.categoryId || undefined,
      });
      return data;
    },
    onSuccess: async (drawing) => {
      if (selectedCadFile || selectedDocFile) {
        try {
          const formData = new FormData();
          if (selectedCadFile) formData.append('cadFile', selectedCadFile);
          if (selectedDocFile) formData.append('docFile', selectedDocFile);
          await api.post(`/catalog/standard-drawings/${drawing.id}/versions`, formData);
        } catch {
          toast.error('Desenho criado, mas houve erro ao enviar arquivos.');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      setIsSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setBasePriceStr('');
      setBasePriceNum(undefined);
      setSelectedCadFile(null);
      setSelectedDocFile(null);
      toast.success('Desenho cadastrado com sucesso!');
    },
    onError: () => toast.error('Erro ao cadastrar desenho.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof emptyForm }) => {
      const { data } = await api.put(`/catalog/standard-drawings/${id}`, {
        ...payload,
        basePrice: basePriceNum,
        categoryId: payload.categoryId || undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      setIsSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setBasePriceStr('');
      setBasePriceNum(undefined);
      toast.success('Desenho atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar desenho.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/standard-drawings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      setDeletingId(null);
      toast.success('Desenho removido!');
    },
    onError: () => toast.error('Erro ao remover desenho.'),
  });

  const versionUploadRef = useRef<HTMLInputElement>(null);
  const [versionUploadId, setVersionUploadId] = useState<string | null>(null);
  const cadFileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [selectedCadFile, setSelectedCadFile] = useState<File | null>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);

  const handleVersionUpload = async (drawingId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('cadFile', file);
      await api.post(`/catalog/standard-drawings/${drawingId}/versions`, formData);
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      setVersionUploadId(null);
      toast.success('Versao cadastrada!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar arquivo.');
    }
  };

  const drawings = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit, totalPages: 1 };
  const categories = categoriesData?.data ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setBasePriceStr('');
    setBasePriceNum(undefined);
    setIsSheetOpen(true);
  }

  function openEdit(d: StandardDrawing) {
    setEditingId(d.id);
    setForm({
      code: d.code,
      name: d.name,
      type: d.type,
      categoryId: d.category?.id ?? d.categoryId ?? '',
      basePrice: d.basePrice ? String(d.basePrice) : '',
      description: d.description ?? '',
    });
    setBasePriceStr(d.basePrice ? String(d.basePrice) : '');
    setBasePriceNum(d.basePrice ?? undefined);
    setIsSheetOpen(true);
  }

  function handleSave() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function setField<K extends keyof typeof emptyForm>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
      const val = typeof e === 'string' ? e : e.target.value;
      setForm((prev) => ({ ...prev, [key]: val }));
    };
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogo de Desenhos Padrão</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Desenho
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou descrição..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="PRODUCT">Produto</SelectItem>
            <SelectItem value="HELPER">Auxiliar (CAD)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={sortBy === 'name' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              if (sortBy === 'name') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('name');
                setSortOrder('asc');
              }
            }}
            className="text-xs"
          >
            <ArrowUpDown className="mr-1 h-3 w-3" />
            Nome {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </Button>
          <Button
            variant={sortBy === 'code' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              if (sortBy === 'code') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('code');
                setSortOrder('asc');
              }
            }}
            className="text-xs"
          >
            <ArrowUpDown className="mr-1 h-3 w-3" />
            Código {sortBy === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Empty>
          <EmptyMedia variant="icon">
            <FileImage />
          </EmptyMedia>
          <EmptyTitle>Erro ao carregar catálogo</EmptyTitle>
          <EmptyDescription>
            Não foi possível carregar a lista de desenhos. Tente novamente.
          </EmptyDescription>
        </Empty>
      ) : drawings.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <FileImage />
          </EmptyMedia>
          <EmptyTitle>Nenhum desenho encontrado</EmptyTitle>
          <EmptyDescription>
            Cadastre o primeiro desenho padrão para começar sua biblioteca.
          </EmptyDescription>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Desenho
          </Button>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {drawings.map((drawing: StandardDrawing) => (
              <Card
                key={drawing.id}
                className="flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setDetailDrawingId(drawing.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{drawing.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{drawing.code}</p>
                    </div>
                    <Badge
                      variant={drawing.type === 'PRODUCT' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {drawing.type === 'PRODUCT' ? 'Produto' : 'CAD'}
                    </Badge>
                    {drawing.versions?.[0]?.version && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        v{drawing.versions[0].version}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  {drawing.thumbnail ? (
                    <img
                      src={`${API_URL}${drawing.thumbnail}`}
                      alt={drawing.name}
                      className="h-32 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-md bg-muted">
                      <FileImage className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  {drawing.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {drawing.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between">
                    <div>
                      {drawing.basePrice ? (
                        <span className="text-sm font-medium">{fmtBRL(drawing.basePrice)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <p className="text-[10px] text-muted-foreground">{drawing.category?.name}</p>
                    </div>
                    <div className="flex gap-1">
                      {drawing.versions?.[0]?.filePath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download CAD"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const v = drawing.versions![0];
                            try {
                              await downloadBlob(
                                `/catalog/standard-drawings/${drawing.id}/versions/${v.version}/download`,
                                `CAD_${drawing.code}_v${v.version}`,
                              );
                            } catch {
                              toast.error('Erro ao baixar arquivo');
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {drawing.versions?.[0]?.docFilePath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download Documento"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const v = drawing.versions![0];
                            try {
                              await downloadBlob(
                                `/catalog/standard-drawings/${drawing.id}/versions/${v.version}/download-doc`,
                                `DOC_${drawing.code}_v${v.version}`,
                              );
                            } catch {
                              toast.error('Erro ao baixar arquivo');
                            }
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm text-muted-foreground">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    className={
                      page >= meta.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsSheetOpen(false);
            setEditingId(null);
            setForm(emptyForm);
            setBasePriceStr('');
            setBasePriceNum(undefined);
            setSelectedCadFile(null);
            setSelectedDocFile(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-xl w-full px-6">
          <SheetHeader className="mb-4 px-1">
            <SheetTitle>{editingId ? 'Editar Desenho' : 'Novo Desenho'}</SheetTitle>
            <SheetDescription>
              {editingId
                ? 'Altere os dados e arquivos do desenho padrão.'
                : 'Cadastre um novo desenho padrão.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 pb-6 overflow-y-auto flex-1 px-4">
            <Field>
              <FieldLabel>Código</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={setField('code')}
                  placeholder="EX: REB-001"
                  className="flex-1"
                />
                {!editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data } = await api.get('/catalog/standard-drawings/next-code');
                        setForm((prev) => ({ ...prev, code: data.code }));
                      } catch {
                        toast.error('Erro ao gerar código');
                      }
                    }}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Gerar
                  </Button>
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input value={form.name} onChange={setField('name')} placeholder="Nome do desenho" />
            </Field>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select value={form.type} onValueChange={setField('type')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Produto</SelectItem>
                  <SelectItem value="HELPER">Auxiliar (CAD)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Select value={form.categoryId} onValueChange={setField('categoryId')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Custo Base</FieldLabel>
              <CurrencyInput
                value={basePriceStr}
                onValueChange={(raw, numeric) => {
                  setBasePriceStr(raw);
                  setBasePriceNum(numeric);
                }}
                placeholder="0,00"
              />
            </Field>
            <Field>
              <FieldLabel>Descrição</FieldLabel>
              <textarea
                value={form.description}
                onChange={setField('description')}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
              />
            </Field>
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Arquivos (opcional)</p>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => cadFileRef.current?.click()}
              >
                {selectedCadFile ? (
                  <>
                    <File className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{selectedCadFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCadFile(null);
                        if (cadFileRef.current) cadFileRef.current.value = '';
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remover
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground flex-1">
                      Arquivo CAD (.dwg, .dxf, .pdf, .stp)
                    </span>
                  </>
                )}
              </div>
              <input
                ref={cadFileRef}
                type="file"
                accept=".dwg,.dxf,.pdf,.stp,.step,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  setSelectedCadFile(e.target.files?.[0] ?? null);
                }}
              />
              <div
                className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => docFileRef.current?.click()}
              >
                {selectedDocFile ? (
                  <>
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{selectedDocFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocFile(null);
                        if (docFileRef.current) docFileRef.current.value = '';
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remover
                    </button>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground flex-1">
                      Projeto / Documentação (.pdf, .doc)
                    </span>
                  </>
                )}
              </div>
              <input
                ref={docFileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  setSelectedDocFile(e.target.files?.[0] ?? null);
                }}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (editingId) {
                    setDetailDrawingId(editingId);
                  }
                  setIsSheetOpen(false);
                  setEditingId(null);
                  setForm(emptyForm);
                  setBasePriceStr('');
                  setBasePriceNum(undefined);
                  setSelectedCadFile(null);
                  setSelectedDocFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !form.code || !form.name}
                className="flex-1"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Desenho?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CatalogDetailPanel
        drawingId={detailDrawingId}
        onClose={() => setDetailDrawingId(null)}
        onEdit={(id) => {
          const d = drawings.find((dw: StandardDrawing) => dw.id === id);
          if (d) {
            setDetailDrawingId(null);
            openEdit(d);
          }
        }}
      />

      <input
        ref={versionUploadRef}
        type="file"
        accept=".dwg,.dxf,.pdf,.stp,.step,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && versionUploadId) {
            handleVersionUpload(versionUploadId, file);
          }
          if (versionUploadRef.current) versionUploadRef.current.value = '';
        }}
      />
    </div>
  );
}
