import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { QuotePrintModal } from '@/components/quotes/QuotePrintModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  QuickCreateClientModal,
  QuickCreateContactModal,
  QuickCreateCategoryModal,
} from '../components/QuickCreateModals';
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Pencil,
  FileUp,
  Printer,
  Download,
  RotateCcw,
} from 'lucide-react';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { type Quote, SendModal, ApproveModal, RejectModal, CancelModal } from './QuoteModals';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxSeparator,
} from '@/components/ui/combobox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencyInput } from '@/components/ui/masked-input';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkPaths } from '@/hooks/use-network-paths';
import { NetworkPathInput } from '@/components/ui/network-path-input';

type ModalType = 'send' | 'approve' | 'reject' | 'edit' | 'cancel' | null;

interface Client {
  id: string;
  name: string;
  contacts: { id: string; name: string }[];
}
interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}
interface QuotesResponse {
  data: Quote[];
  meta: { total: number; page: number; limit: number; totalPages: number; overdueCount?: number };
}

function StatusBadge({ status }: { status: Quote['status'] }) {
  const map = {
    DRAFT: {
      label: 'Rascunho',
      icon: <Clock size={12} className="mr-1" />,
      className:
        'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900',
    },
    SENT: {
      label: 'Enviado',
      icon: <Send size={12} className="mr-1" />,
      className:
        'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-950/60',
    },
    APPROVED: {
      label: 'Aprovado',
      icon: <CheckCircle size={12} className="mr-1" />,
      className:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/60',
    },
    REJECTED: {
      label: 'Rejeitado',
      icon: <XCircle size={12} className="mr-1" />,
      className:
        'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/60',
    },
    CANCELED: {
      label: 'Cancelado',
      icon: <XCircle size={12} className="mr-1" />,
      className:
        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-150 dark:hover:bg-slate-750',
    },
    SUPERSEDED: {
      label: 'Substituído',
      icon: <XCircle size={12} className="mr-1" />,
      className:
        'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:bg-purple-100 dark:hover:bg-purple-950/60',
    },
    PENDING_APPROVAL: {
      label: 'Alçada Gerencial',
      icon: <Clock size={12} className="mr-1" />,
      className:
        'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/60',
    },
  };
  const s = map[status];
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap font-medium px-2 py-0.5', s.className)}
    >
      {s.icon}
      {s.label}
    </Badge>
  );
}

function QuickActions({
  quote,
  onAction,
  onPrint,
}: {
  quote: Quote;
  onAction: (t: ModalType, q: Quote) => void;
  onPrint: (id: string) => void;
}) {
  const printBtn = (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Imprimir proposta"
      title="Imprimir Proposta"
      className="h-7 w-7"
      onClick={(e) => {
        e.stopPropagation();
        onPrint(quote.id);
      }}
    >
      <Printer className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
  const editBtn = (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Editar orçamento"
      className="h-7 w-7"
      onClick={(e) => {
        e.stopPropagation();
        onAction('edit', quote);
      }}
    >
      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );

  if (quote.status === 'DRAFT')
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          aria-label="Enviar orçamento para cliente"
          className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 h-7 text-xs px-2"
          onClick={(e) => {
            e.stopPropagation();
            onAction('send', quote);
          }}
        >
          <Send className="h-3 w-3 mr-1" /> Enviar
        </Button>
        {printBtn}
        {editBtn}
      </div>
    );
  if (quote.status === 'SENT')
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          aria-label="Aprovar orçamento"
          className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-950/30 h-7 text-xs px-2"
          onClick={(e) => {
            e.stopPropagation();
            onAction('approve', quote);
          }}
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label="Rejeitar orçamento"
          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 text-xs px-2"
          onClick={(e) => {
            e.stopPropagation();
            onAction('reject', quote);
          }}
        >
          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
        </Button>
        {printBtn}
        {editBtn}
      </div>
    );
  if (quote.status === 'APPROVED')
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          aria-label="Cancelar orçamento"
          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 text-xs px-2"
          onClick={(e) => {
            e.stopPropagation();
            onAction('cancel', quote);
          }}
        >
          Cancelar
        </Button>
        {printBtn}
        {editBtn}
      </div>
    );
  return (
    <div className="flex items-center gap-1">
      {printBtn}
      {editBtn}
    </div>
  );
}

// ---- Dedicated Create Quote Sheet Component (to avoid lag/unnecessary re-renders on the main list) ----
interface CreateQuoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateQuoteSheet({ isOpen, onClose }: CreateQuoteSheetProps) {
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');
  const [path, setPath] = useState('');
  const [price, setPrice] = useState('');
  const [priceFloat, setPriceFloat] = useState<number | undefined>();
  const [deliveryDate, setDeliveryDate] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { recentPaths, addPath } = useNetworkPaths();

  const [cadFile, setCadFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isDragCAD, setIsDragCAD] = useState(false);
  const [isDragThumb, setIsDragThumb] = useState(false);

  const handleCadFileChange = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.dwg', '.dxf', '.pdf'];
    if (!allowed.includes(ext)) {
      toast.error('Arquivo inválido. Formatos permitidos: DWG, DXF, PDF');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('O desenho CAD não pode ser maior que 20MB');
      return;
    }
    setCadFile(file);
  };

  const handleThumbFileChange = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.png', '.jpg', '.jpeg'];
    if (!allowed.includes(ext)) {
      toast.error('Arquivo inválido. Formatos permitidos: PNG, JPG, JPEG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem de miniatura não pode ser maior que 5MB');
      return;
    }
    setThumbnailFile(file);
  };

  const [sheetContainer, setSheetContainer] = useState<HTMLDivElement | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [quickCreateClientOpen, setQuickCreateClientOpen] = useState(false);
  const [quickCreateContactOpen, setQuickCreateContactOpen] = useState(false);
  const [quickCreateCategoryOpen, setQuickCreateCategoryOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients', 'all'],
    queryFn: async () => (await api.get('/clients?limit=10000')).data,
    enabled: isOpen,
  });

  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await api.get('/categories?limit=10000')).data,
    enabled: isOpen,
  });

  const availableContacts =
    clientId && clientsData
      ? (clientsData.data.find((c) => c.id === clientId)?.contacts ?? [])
      : [];

  const clientOptions = clientsData?.data.map((c) => ({ value: c.id, label: c.name })) || [];
  const contactOptions = availableContacts.map((c) => ({ value: c.id, label: c.name }));

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

  const CREATE_NEW_CLIENT = { value: 'CREATE_NEW', label: 'Criar Novo Cliente Rápido' };
  const CREATE_NEW_CONTACT = { value: 'CREATE_NEW_CONTACT', label: 'Criar Novo Contato Rápido' };
  const CREATE_NEW_CATEGORY = {
    value: 'CREATE_NEW_CATEGORY',
    label: 'Criar Nova Categoria Rápida',
    displayLabel: 'Criar Nova Categoria Rápida',
  };
  const NO_CONTACT = { value: 'NO_CONTACT', label: 'Sem contato específico' };

  const allClientItems = [...clientOptions, CREATE_NEW_CLIENT];
  const allContactItems = [
    NO_CONTACT,
    ...contactOptions,
    ...(clientId ? [CREATE_NEW_CONTACT] : []),
  ];
  const allCategoryItems = [...categoryOptions, CREATE_NEW_CATEGORY];

  const createMutation = useMutation({
    mutationFn: async (payload: { body: object; files?: { cadFile?: File; thumbnail?: File } }) => {
      const res = await api.post('/quotes', payload.body);
      const quote = res.data;

      if (payload.files?.cadFile || payload.files?.thumbnail) {
        const formData = new FormData();
        if (payload.files.cadFile) {
          formData.append('cadFile', payload.files.cadFile);
        }
        if (payload.files.thumbnail) {
          formData.append('thumbnail', payload.files.thumbnail);
        }
        await api.post(`/quotes/${quote.id}/cad`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      resetCreate();
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (e: unknown) => {
      const apiError = e as { response?: { data?: { message?: string } } };
      setCreateError(apiError.response?.data?.message || 'Erro ao criar.');
    },
  });

  const resetCreate = () => {
    setCreateError(null);
    setClientId('');
    setContactId('');
    setCategoryId('');
    setDesc('');
    setPath('');
    setPrice('');
    setPriceFloat(undefined);
    setDeliveryDate('');
    setValidUntil('');
    setCadFile(null);
    setThumbnailFile(null);
    setIsDragCAD(false);
    setIsDragThumb(false);
    setTriedSubmit(false);
    onClose();
  };

  const handleCreate = () => {
    setTriedSubmit(true);
    const hasNetworkPath = !!path.trim();
    const hasCadFile = !!cadFile;
    if (!clientId || !categoryId || !desc.trim() || (!hasNetworkPath && !hasCadFile)) {
      toast.error('Formulário incompleto! Preencha o caminho de rede ou anexe um arquivo CAD.');
      return;
    }

    const body: Record<string, unknown> = {
      clientId,
      contactId: contactId || undefined,
      categoryId,
      descriptiveText: desc,
      networkFilePath: path,
    };
    if (priceFloat != null) body.estimatedPrice = priceFloat;
    if (deliveryDate) body.deliveryDate = new Date(deliveryDate + 'T12:00:00').toISOString();
    if (validUntil) body.validUntil = new Date(validUntil + 'T12:00:00').toISOString();

    if (path.trim()) addPath(path.trim());

    createMutation.mutate({
      body,
      files: {
        cadFile: cadFile || undefined,
        thumbnail: thumbnailFile || undefined,
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && resetCreate()}>
      <SheetContent className="sm:max-w-[50vw] w-full overflow-y-auto">
        <div ref={setSheetContainer} className="contents">
          <SheetHeader>
            <SheetTitle>Nova Solicitação de Orçamento</SheetTitle>
            <SheetDescription>
              Preço e prazo podem ser informados agora ou no momento do envio ao cliente.
            </SheetDescription>
          </SheetHeader>

          <div className="p-6 space-y-6">
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={triedSubmit && !clientId} className="col-span-2">
                  <FieldLabel>Cliente *</FieldLabel>
                  <Combobox
                    value={clientOptions.find((o) => o.value === clientId) || null}
                    onValueChange={(val) => {
                      if (!val) {
                        setClientId('');
                        setContactId('');
                        return;
                      }
                      if (val.value === 'CREATE_NEW') {
                        setQuickCreateClientOpen(true);
                        return;
                      }
                      setClientId(val.value);
                      if (val.value !== clientId) setContactId('');
                    }}
                    items={allClientItems}
                  >
                    <ComboboxInput placeholder="Buscar cliente..." />
                    <ComboboxContent container={sheetContainer}>
                      <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                      <ComboboxList>
                        {clientOptions.map((opt) => (
                          <ComboboxItem key={opt.value} value={opt}>
                            {opt.label}
                          </ComboboxItem>
                        ))}
                        <ComboboxSeparator />
                        <ComboboxItem
                          value={CREATE_NEW_CLIENT}
                          className="text-primary font-medium justify-center"
                        >
                          <Plus className="mr-2 h-4 w-4" /> {CREATE_NEW_CLIENT.label}
                        </ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {/* {triedSubmit && !clientId && <FieldError>O cliente é obrigatório.</FieldError>} */}
                </Field>

                <Field>
                  <FieldLabel>Contato</FieldLabel>
                  <Combobox
                    value={
                      contactId ? contactOptions.find((o) => o.value === contactId) || null : null
                    }
                    onValueChange={(val) => {
                      if (!val || val.value === 'NO_CONTACT') {
                        setContactId('');
                        return;
                      }
                      if (val.value === 'CREATE_NEW_CONTACT') {
                        setQuickCreateContactOpen(true);
                        return;
                      }
                      setContactId(val.value);
                    }}
                    disabled={!clientId}
                    items={allContactItems}
                  >
                    <ComboboxInput placeholder="Buscar contato..." />
                    <ComboboxContent container={sheetContainer}>
                      <ComboboxEmpty>Nenhum contato encontrado.</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxItem value={NO_CONTACT}>{NO_CONTACT.label}</ComboboxItem>
                        {contactOptions.map((opt) => (
                          <ComboboxItem key={opt.value} value={opt}>
                            {opt.label}
                          </ComboboxItem>
                        ))}
                        {clientId && (
                          <>
                            <ComboboxSeparator />
                            <ComboboxItem
                              value={CREATE_NEW_CONTACT}
                              className="text-primary font-medium justify-center"
                            >
                              <Plus className="mr-2 h-4 w-4" /> {CREATE_NEW_CONTACT.label}
                            </ComboboxItem>
                          </>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </Field>

                <Field data-invalid={triedSubmit && !categoryId}>
                  <FieldLabel>Categoria *</FieldLabel>
                  <Combobox
                    value={categoryOptions.find((o) => o.value === categoryId) || null}
                    onValueChange={(val) => {
                      if (!val) {
                        setCategoryId('');
                        return;
                      }
                      if (val.value === 'CREATE_NEW_CATEGORY') {
                        setQuickCreateCategoryOpen(true);
                        return;
                      }
                      setCategoryId(val.value);
                    }}
                    items={allCategoryItems}
                  >
                    <ComboboxInput placeholder="Buscar categoria..." />
                    <ComboboxContent container={sheetContainer}>
                      <ComboboxEmpty>Nenhuma categoria encontrada.</ComboboxEmpty>
                      <ComboboxList>
                        {categoryOptions.map((opt) => (
                          <ComboboxItem key={opt.value} value={opt}>
                            {opt.displayLabel}
                          </ComboboxItem>
                        ))}
                        <ComboboxSeparator />
                        <ComboboxItem
                          value={CREATE_NEW_CATEGORY}
                          className="text-primary font-medium justify-center"
                        >
                          <Plus className="mr-2 h-4 w-4" /> {CREATE_NEW_CATEGORY.label}
                        </ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {/* {triedSubmit && !categoryId && (
                    <FieldError>A categoria é obrigatória.</FieldError>
                  )} */}
                </Field>
              </div>

              <Field data-invalid={triedSubmit && !path.trim() && !cadFile}>
                <FieldLabel>Caminho na Rede (ou anexe arquivo CAD)</FieldLabel>
                <NetworkPathInput
                  value={path}
                  onChange={setPath}
                  placeholder="Z:\Engenharia\..."
                  recentPaths={recentPaths}
                  onSelectPath={(p) => setPath(p)}
                />
                {/* {triedSubmit && !path.trim() && (
                  <FieldError>O caminho na rede é obrigatório.</FieldError>
                )} */}
              </Field>

              <Field data-invalid={triedSubmit && !desc.trim()}>
                <FieldLabel>Descrição *</FieldLabel>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Peças, material, espessura..."
                />
                {/* {triedSubmit && !desc.trim() && (
                  <FieldError>O descritivo é obrigatório.</FieldError>
                )} */}
              </Field>

              {/* Drag & Drop CAD and Thumbnail Zone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <FieldLabel>Desenho Técnico (DWG, DXF, PDF)</FieldLabel>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragCAD(true);
                    }}
                    onDragLeave={() => setIsDragCAD(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragCAD(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleCadFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('cad-file-input-create')?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px]',
                      isDragCAD
                        ? 'border-primary bg-primary/5'
                        : cadFile
                          ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-muted hover:border-primary/50 hover:bg-muted/5',
                    )}
                  >
                    <input
                      type="file"
                      id="cad-file-input-create"
                      className="hidden"
                      accept=".dwg,.dxf,.pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleCadFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    {cadFile ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2 max-w-full">
                          <span className="text-2xl shrink-0">📄</span>
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                              {cadFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(cadFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2 flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCadFile(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          Arraste ou clique para enviar
                        </p>
                        <p className="text-xs text-muted-foreground">DWG, DXF ou PDF até 20MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Miniatura de Visualização</FieldLabel>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragThumb(true);
                    }}
                    onDragLeave={() => setIsDragThumb(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragThumb(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleThumbFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('thumb-file-input-create')?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px]',
                      isDragThumb
                        ? 'border-primary bg-primary/5'
                        : thumbnailFile
                          ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-muted hover:border-primary/50 hover:bg-muted/5',
                    )}
                  >
                    <input
                      type="file"
                      id="thumb-file-input-create"
                      className="hidden"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleThumbFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    {thumbnailFile ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2 max-w-full">
                          <img
                            src={URL.createObjectURL(thumbnailFile)}
                            alt="Preview"
                            className="h-8 w-8 object-cover rounded-md border border-muted shrink-0"
                          />
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                              {thumbnailFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2 flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setThumbnailFile(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">
                          Arraste ou clique para enviar
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG até 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel className="text-muted-foreground">Custo Estimado</FieldLabel>
                  <CurrencyInput
                    value={price}
                    onValueChange={(raw, numeric) => {
                      setPrice(raw);
                      setPriceFloat(numeric);
                    }}
                    placeholder="0,00"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-muted-foreground">Data de Entrega</FieldLabel>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-muted-foreground">Validade da Proposta</FieldLabel>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>

          <SheetFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={resetCreate}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Salvar Orçamento
            </Button>
          </SheetFooter>
        </div>
        {quickCreateClientOpen && (
          <QuickCreateClientModal
            isOpen={quickCreateClientOpen}
            onClose={() => setQuickCreateClientOpen(false)}
            onCreated={(newId) => setClientId(newId)}
          />
        )}
        {quickCreateContactOpen && (
          <QuickCreateContactModal
            isOpen={quickCreateContactOpen}
            clientId={clientId}
            onClose={() => setQuickCreateContactOpen(false)}
            onCreated={(newId) => setContactId(newId)}
          />
        )}
        {quickCreateCategoryOpen && (
          <QuickCreateCategoryModal
            isOpen={quickCreateCategoryOpen}
            onClose={() => setQuickCreateCategoryOpen(false)}
            onCreated={(newId) => setCategoryId(newId)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Quotes() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number | 'all'>(5);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [printQuoteId, setPrintQuoteId] = useState<string | null>(null);

  const [showOverdue, setShowOverdue] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      navigate('/quotes/new', { replace: true });
    }
  }, [searchParams, navigate]);

  const sortBy = searchParams.get('sort') || 'quoteNumber';
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  const { data, isLoading, isError, error } = useQuery<QuotesResponse>({
    queryKey: ['quotes', page, limit, sortBy, sortOrder, showOverdue, statusFilter],
    queryFn: async () => {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await api.get(
        `/quotes?page=${page}&limit=${limit === 'all' ? 10000 : limit}&sortBy=${sortBy}&sortOrder=${sortOrder}&overdue=${showOverdue}${statusParam}`,
      );
      return response.data;
    },
  });

  const quotes = data?.data ?? [];
  const overdueCount = data?.meta?.overdueCount ?? 0;
  const displayQuotes = quotes;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotes'] });
      const currentData = queryClient.getQueryData<QuotesResponse>(['quotes', page, limit]);
      if (currentData && currentData.data.length === 0 && page > 1) {
        setPage(page - 1);
      }
      setDeleteQuoteId(null);
      toast.success('Orçamento excluído.');
    },
    onError: (e: unknown) => {
      const apiError = e as {
        normalizedError?: { message?: string };
        response?: { data?: { message?: string } };
      };
      setDeleteQuoteId(null);
      toast.error(
        apiError.normalizedError?.message || apiError.response?.data?.message || 'Erro ao excluir.',
      );
    },
  });

  const handleExportList = async () => {
    try {
      const response = await api.get(`/quotes/export?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `relatorio_orcamentos_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Lista de orçamentos exportada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar lista de orçamentos.');
    }
  };

  const handleExportQuoteItems = async (quoteId: string, quoteNumber: number, revision: string) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/export-items`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_${quoteNumber}_${revision}_itens.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Itens do orçamento #${quoteNumber} exportados com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar itens do orçamento.');
    }
  };

  const handleAction = (type: ModalType, quote: Quote) => {
    if (type === 'edit') {
      navigate(`/quotes/${quote.id}/edit`);
      return;
    }
    setSelectedQuote(quote);
    setActiveModal(type);
  };
  const closeModal = () => {
    setActiveModal(null);
    setSelectedQuote(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="mr-3 text-primary" />
            Orçamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie solicitações de orçamento, valores e aprovações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportList}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => navigate('/quotes/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={showOverdue ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setShowOverdue(!showOverdue);
            setPage(1);
          }}
          className="text-xs gap-1"
        >
          <Clock className="h-3.5 w-3.5" />
          Vencidos
          {overdueCount > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{overdueCount}</Badge>}
        </Button>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
            <SelectValue placeholder="Filtrar por Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="DRAFT">Rascunho</SelectItem>
            <SelectItem value="SENT">Enviado</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Alçada Gerencial</SelectItem>
            <SelectItem value="APPROVED">Aprovado</SelectItem>
            <SelectItem value="REJECTED">Rejeitado</SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
            <SelectItem value="SUPERSEDED">Substituído</SelectItem>
          </SelectContent>
        </Select>

        {(showOverdue || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowOverdue(false);
              setStatusFilter('all');
              setPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar Filtros
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  className="w-[120px]"
                  active={sortBy === 'quoteNumber' ? sortOrder : undefined}
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      const newOrder =
                        sortBy === 'quoteNumber' && sortOrder === 'desc' ? 'asc' : 'desc';
                      next.set('sort', 'quoteNumber');
                      next.set('order', newOrder);
                      return next;
                    });
                    setPage(1);
                  }}
                >
                  Orçamento
                </SortableTableHead>
                <SortableTableHead>Cliente / Contato</SortableTableHead>
                <SortableTableHead>Descrição</SortableTableHead>
                <SortableTableHead>Entrega</SortableTableHead>
                <SortableTableHead
                  active={sortBy === 'status' ? sortOrder : undefined}
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      const newOrder = sortBy === 'status' && sortOrder === 'desc' ? 'asc' : 'desc';
                      next.set('sort', 'status');
                      next.set('order', newOrder);
                      return next;
                    });
                    setPage(1);
                  }}
                >
                  Status
                </SortableTableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon" />
                      <EmptyTitle>Erro ao carregar</EmptyTitle>
                      <EmptyDescription>
                        {(error as { normalizedError?: { message?: string } })?.normalizedError
                          ?.message || 'Não foi possível carregar os orçamentos.'}
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[180px] mb-1" />
                      <Skeleton className="h-3 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[100px] rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <FileText />
                      </EmptyMedia>
                      <EmptyTitle>Nenhum orçamento encontrado</EmptyTitle>
                      <EmptyDescription>
                        Crie seu primeiro orçamento para começar a precificar.
                      </EmptyDescription>
                      <Button onClick={() => navigate('/quotes/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Orçamento
                      </Button>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                displayQuotes.map((q) => (
                  <TableRow
                    key={q.id}
                    className="even:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/quotes/${q.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          #{q.quoteNumber || '—'}
                        </span>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          v{q.revision || 'A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{q.client.name}</div>
                      {q.contact && (
                        <div className="text-xs text-muted-foreground">{q.contact.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <span className="block truncate" title={q.descriptiveText}>
                        {q.descriptiveText}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {q.deliveryDate ? new Date(q.deliveryDate).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusBadge status={q.status} />
                        {q.validUntil &&
                          (() => {
                            const validUntilDate = new Date(q.validUntil);
                            const now = new Date();
                            const diffTime = validUntilDate.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (
                              validUntilDate < now &&
                              (q.status === 'DRAFT' || q.status === 'SENT')
                            ) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] px-1.5 py-0 cursor-help whitespace-nowrap"
                                    >
                                      Expirado
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Orçamento expirou em{' '}
                                    {validUntilDate.toLocaleDateString('pt-BR')}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }

                            if (diffDays >= 0 && diffDays <= 3 && q.status === 'SENT') {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="text-[10px] px-1.5 py-0 cursor-help whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white border-0">
                                      Expira em {diffDays === 0 ? 'hoje' : `${diffDays}d`}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Orçamento expira em {validUntilDate.toLocaleDateString('pt-BR')}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }

                            return null;
                          })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <QuickActions quote={q} onAction={handleAction} onPrint={setPrintQuoteId} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportQuoteItems(q.id, q.quoteNumber, q.revision);
                          }}
                          title="Exportar Itens para ERP (CSV)"
                        >
                          <Download className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteQuoteId(q.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
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

      <CreateQuoteSheet isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* Action Modals */}
      {selectedQuote && activeModal === 'send' && (
        <SendModal quote={selectedQuote} onClose={closeModal} />
      )}
      {selectedQuote && activeModal === 'approve' && (
        <ApproveModal quote={selectedQuote} onClose={closeModal} />
      )}
      {selectedQuote && activeModal === 'reject' && (
        <RejectModal quote={selectedQuote} onClose={closeModal} />
      )}
      {selectedQuote && activeModal === 'cancel' && (
        <CancelModal quote={selectedQuote} onClose={closeModal} />
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteQuoteId} onOpenChange={(open) => !open && setDeleteQuoteId(null)}>
        <AlertDialogContent className="sm:max-w-[600px] p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteQuoteId) deleteMutation.mutate(deleteQuoteId);
              }}
              className="bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 border-none"
            >
              {deleteMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuotePrintModal
        quoteId={printQuoteId || ''}
        open={!!printQuoteId}
        onOpenChange={(open) => {
          if (!open) setPrintQuoteId(null);
        }}
      />
    </div>
  );
}
