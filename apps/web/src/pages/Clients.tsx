import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Plus, Trash2, Building2, Pencil, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ClientForm } from '../components/forms/ClientForm';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  isActive?: boolean;
}

interface Client {
  id: string;
  name: string;
  document?: string;
  address?: string;
  isActive?: boolean;
  contacts?: Contact[];
  quotes?: { createdAt: string; status: string }[];
  daysSinceLastQuote?: number | null;
}

interface ClientsResponse {
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function getLastQuoteBadge(
  lastQuote?: { createdAt: string; status: string } | null,
  daysSinceLastQuote?: number | null,
) {
  if (!lastQuote) return { label: 'Sem orçamento', variant: 'secondary' as const };

  const daysSince =
    daysSinceLastQuote ??
    Math.floor((Date.now() - new Date(lastQuote.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= 30) return { label: `${daysSince}d atrás`, variant: 'outline' as const };
  if (daysSince <= 90) return { label: `${daysSince}d atrás`, variant: 'warning' as const };
  return { label: `${daysSince}d atrás`, variant: 'default' as const };
}

// ---- Create Sheet ----
function CreateClientModal({
  onClose,
  onSave,
  isPending,
  error,
}: {
  onClose: () => void;
  onSave: (data: Omit<Client, 'id' | 'quotes'>) => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <CustomDialog
      variant="sheet"
      isOpen={true}
      onClose={onClose}
      title="Cadastrar Novo Cliente"
      description="Preencha os dados da empresa e contatos associados."
      size="half"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="px-4 pb-4">
        <ClientForm
          onSubmit={onSave}
          isPending={isPending}
          onCancel={onClose}
          submitLabel="Salvar Cliente"
        />
      </div>
    </CustomDialog>
  );
}

// ---- Edit Sheet ----
function EditClientModal({
  client: initialClient,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: freshClient } = useQuery<Client>({
    queryKey: ['client', initialClient.id],
    queryFn: async () => {
      const res = await api.get(`/clients/${initialClient.id}?showInactiveContacts=true`);
      return res.data;
    },
  });

  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (updatedData: Omit<Client, 'id'>) => {
      const mappedContacts = (updatedData.contacts || []).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || undefined,
        email: c.email || undefined,
        isActive: c.isActive,
      }));

      return api.put(`/clients/${initialClient.id}`, {
        ...updatedData,
        contacts: mappedContacts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', initialClient.id] });
      onSaved();
      toast.success('Cliente atualizado com sucesso.');
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Erro ao atualizar.'),
  });

  const handleDeleteContactPermanent = async (contactId: string) => {
    await api.delete(`/clients/contacts/${contactId}?force=true`);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['client', initialClient.id] });
  };

  return (
    <CustomDialog
      variant="sheet"
      isOpen={true}
      onClose={onClose}
      title="Editar Cliente"
      description="Edite os dados da empresa e gerencie seus contatos."
      size="half"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="px-4 pb-4">
        <ClientForm
          initialValues={freshClient || initialClient}
          onSubmit={(data) => updateMutation.mutate(data)}
          isPending={updateMutation.isPending}
          onCancel={onClose}
          submitLabel="Salvar Alterações"
          onDeleteContactPermanent={handleDeleteContactPermanent}
        />
      </div>
    </CustomDialog>
  );
}

// ---- Main Page ----
export function Clients() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number | 'all'>(5);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showInactive, setShowInactive] = useState(false);
  const [lastPurchaseFilter, setLastPurchaseFilter] = useState('all');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  const lastPurchaseQuery = (() => {
    switch (lastPurchaseFilter) {
      case '30':
        return 'lastPurchaseMax=30';
      case '90':
        return 'lastPurchaseMax=90';
      case '180':
        return 'lastPurchaseMax=180';
      case '360':
        return 'lastPurchaseMax=360';
      case '360+':
        return 'lastPurchaseMin=360';
      case 'null':
        return 'lastPurchaseNull=true';
      default:
        return '';
    }
  })();

  const { data, isLoading, isError, error } = useQuery<ClientsResponse>({
    queryKey: ['clients', page, limit, search, showInactive, lastPurchaseFilter],
    queryFn: async () => {
      const limitParam = limit === 'all' ? 10000 : limit;
      const response = await api.get(
        `/clients?page=${page}&limit=${limitParam}${search ? `&search=${encodeURIComponent(search)}` : ''}${showInactive ? '&showInactive=true' : ''}${lastPurchaseQuery ? `&${lastPurchaseQuery}` : ''}`,
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newClient: Omit<Client, 'id' | 'quotes'>) => api.post('/clients', newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsCreateOpen(false);
      setCreateError(null);
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (err: any) =>
      setCreateError(err.response?.data?.message || 'Ocorreu um erro inesperado.'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api.delete(`/clients/${id}${force ? '?force=true' : ''}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClient(null);
      toast.success(
        variables.force ? 'Cliente excluído permanentemente!' : 'Cliente desativado com sucesso!',
      );
    },
    onError: (err: any) => {
      setSelectedClient(null);
      toast.error(err.response?.data?.message || 'Erro ao realizar operação.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/clients/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente reativado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao reativar cliente.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Building2 className="mr-3 text-primary" />
            Clientes & Contatos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie clientes corporativos e seus respectivos contatos.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/20 p-4 rounded-lg border justify-between">
        <Input
          placeholder="Buscar clientes por Razão Social ou CNPJ/CPF..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md bg-background"
        />
        <Select
          value={lastPurchaseFilter}
          onValueChange={(val) => {
            setLastPurchaseFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px] bg-background h-9">
            <SelectValue placeholder="Última compra" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="360">Últimos 360 dias</SelectItem>
              <SelectItem value="360+">Mais de 360 dias</SelectItem>
              <SelectItem value="null">Sem orçamento</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
          Mostrar clientes desativados
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ / CPF</TableHead>
                <TableHead>Contatos</TableHead>
                <TableHead>Último Orçamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <Building2 />
                      </EmptyMedia>
                      <EmptyTitle>Erro ao carregar</EmptyTitle>
                      <EmptyDescription>
                        {(error as { normalizedError?: { message?: string } })?.normalizedError
                          ?.message || 'Não foi possível carregar os clientes.'}
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
                    <TableCell>
                      <Skeleton className="h-5 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[200px] rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[100px] rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <Building2 />
                      </EmptyMedia>
                      <EmptyTitle>Nenhum cliente encontrado</EmptyTitle>
                      <EmptyDescription>
                        Cadastre seu primeiro cliente para começar.
                      </EmptyDescription>
                      <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cliente
                      </Button>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((client) => {
                  const lastQuote = client.quotes?.[0] ?? null;
                  const badge = getLastQuoteBadge(lastQuote, client.daysSinceLastQuote);
                  const isClientActive = client.isActive !== false;
                  return (
                    <TableRow key={client.id} className="even:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={isClientActive ? '' : 'text-muted-foreground line-through'}
                          >
                            {client.name}
                          </span>
                          {!isClientActive && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Desativado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={isClientActive ? '' : 'text-muted-foreground'}>
                        {client.document || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.contacts && client.contacts.length > 0 ? (
                            client.contacts.map((c, i) => (
                              <Badge key={i} variant="secondary" className="font-normal">
                                {c.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              Sem contatos
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant as any}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {isClientActive && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Editar cliente"
                            title="Editar Cliente"
                            onClick={() => setEditingClient(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {!isClientActive ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Reativar cliente"
                              title="Reativar Cliente"
                              onClick={() => restoreMutation.mutate(client.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 text-emerald-600 hover:text-emerald-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Excluir cliente permanentemente"
                              title="Excluir Permanentemente"
                              onClick={() => setSelectedClient(client)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Desativar cliente"
                            title="Desativar Cliente"
                            onClick={() => setSelectedClient(client)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
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

      {isCreateOpen && (
        <CreateClientModal
          onClose={() => {
            setIsCreateOpen(false);
            setCreateError(null);
          }}
          onSave={(d) => createMutation.mutate(d)}
          isPending={createMutation.isPending}
          error={createError}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => setEditingClient(null)}
        />
      )}

      {/* Delete Confirmation CustomDialog */}
      <CustomDialog
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={
          selectedClient?.isActive !== false ? 'Desativar Cliente?' : 'Excluir Permanentemente?'
        }
        description={
          selectedClient?.isActive !== false
            ? 'Esta ação desativará o cliente temporariamente. Você poderá reativá-lo a qualquer momento.'
            : 'Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente e todos os seus contatos associados do banco de dados. Atenção: a exclusão falhará se houver orçamentos vinculados.'
        }
        footerActions={
          <>
            <CustomButton variant="outline" onClick={() => setSelectedClient(null)}>
              Cancelar
            </CustomButton>
            <CustomButton
              semantic="destructive"
              onClick={() => {
                if (selectedClient) {
                  deleteMutation.mutate({
                    id: selectedClient.id,
                    force: selectedClient.isActive === false,
                  });
                }
              }}
              isLoading={deleteMutation.isPending}
            >
              {selectedClient?.isActive !== false ? 'Desativar' : 'Excluir Permanentemente'}
            </CustomButton>
          </>
        }
      />
    </div>
  );
}
