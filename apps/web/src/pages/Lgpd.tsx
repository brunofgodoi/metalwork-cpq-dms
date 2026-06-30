import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ShieldAlert,
  Search,
  Users,
  Building2,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContactItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
}

interface ClientItem {
  id: string;
  name: string;
  document?: string;
  isActive: boolean;
  contacts?: ContactItem[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Sub-component to fetch and display client contacts under-demand
function ClientContactsList({
  clientId,
  onAnonymizeContact,
}: {
  clientId: string;
  onAnonymizeContact: (contactId: string, name: string) => void;
}) {
  const { data: client, isLoading } = useQuery<ClientItem>({
    queryKey: ['lgpd-client-details', clientId],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${clientId}?showInactiveContacts=true`);
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        Carregando contatos vinculados...
      </div>
    );
  }

  const contacts = client?.contacts || [];

  if (contacts.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed">
        Nenhum contato cadastrado para este cliente.
      </div>
    );
  }

  return (
    <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
        <UserCheck className="h-3.5 w-3.5 text-primary" />
        Contatos Vinculados (Pessoas Físicas)
      </h4>
      <Table className="bg-card rounded-md border border-slate-100 dark:border-slate-800">
        <TableHeader className="bg-slate-100/50 dark:bg-slate-900/50">
          <TableRow className="h-8">
            <TableHead className="text-xs py-1 h-8 pl-4">Nome do Contato</TableHead>
            <TableHead className="text-xs py-1 h-8">E-mail</TableHead>
            <TableHead className="text-xs py-1 h-8">Telefone</TableHead>
            <TableHead className="text-xs py-1 h-8">Status</TableHead>
            <TableHead className="text-xs py-1 h-8 text-right pr-4">Ação LGPD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const isAnonimized =
              contact.name === 'Contato Anonimizado' && !contact.email && !contact.phone;
            return (
              <TableRow
                key={contact.id}
                className="h-10 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
              >
                <TableCell className="text-xs py-1.5 pl-4 font-medium">{contact.name}</TableCell>
                <TableCell className="text-xs py-1.5">{contact.email || '-'}</TableCell>
                <TableCell className="text-xs py-1.5">{contact.phone || '-'}</TableCell>
                <TableCell className="text-xs py-1.5">
                  {isAnonimized ? (
                    <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-0 text-[10px] py-0.5">
                      Anonimizado
                    </Badge>
                  ) : contact.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border-0 text-[10px] py-0.5">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border-0 text-[10px] py-0.5">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right py-1.5 pr-4">
                  <Button
                    variant="destructive"
                    size="xs"
                    className="gap-1 h-7 text-[10px] hover:bg-red-600 px-2.5"
                    disabled={isAnonimized}
                    onClick={() => onAnonymizeContact(contact.id, contact.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Anonimizar Contato
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function Lgpd() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'clients' | 'users'>('clients');

  // Search terms
  const [clientSearch, setClientSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Expandable clients for contacts view
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'client' | 'user' | 'contact';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'client',
    id: '',
    name: '',
  });

  const [confirmationInput, setConfirmationInput] = useState('');

  // Fetch clients
  const { data: clientsResponse, isLoading: loadingClients } = useQuery<{ data: ClientItem[] }>({
    queryKey: ['lgpd-clients', clientSearch],
    queryFn: async () => {
      const { data } = await api.get(
        `/clients?limit=100&search=${encodeURIComponent(clientSearch)}`,
      );
      return data;
    },
    enabled: activeTab === 'clients',
  });
  const clients = clientsResponse?.data || [];

  // Fetch users
  const { data: usersResponse, isLoading: loadingUsers } = useQuery<{ data: UserItem[] }>({
    queryKey: ['lgpd-users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
    enabled: activeTab === 'users',
  });
  const users = usersResponse?.data || [];

  // Filter inactive users for Aba 2
  const inactiveUsers = users.filter((u) => !u.isActive);
  const filteredUsers = inactiveUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // Anonymize Client Mutation
  const anonymizeClientMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/lgpd/client/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.success('Cliente anonimizado com sucesso em conformidade com a LGPD!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao anonimizar cliente.');
    },
  });

  // Anonymize User Mutation
  const anonymizeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/lgpd/user/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-users'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.success('Conta de usuário anonimizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao anonimizar usuário.');
    },
  });

  // Anonymize Contact Mutation
  const anonymizeContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/lgpd/contact/${id}`);
    },
    onSuccess: () => {
      if (expandedClientId) {
        queryClient.invalidateQueries({ queryKey: ['lgpd-client-details', expandedClientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['lgpd-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.success('Contato individual anonimizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao anonimizar contato.');
    },
  });

  const handleOpenConfirm = (type: 'client' | 'user' | 'contact', id: string, name: string) => {
    setConfirmationInput('');
    setConfirmDialog({
      isOpen: true,
      type,
      id,
      name,
    });
  };

  const handleExecuteAnonymization = () => {
    const isMatched =
      confirmationInput.toUpperCase() === 'ANONIMIZAR' || confirmationInput === confirmDialog.name;

    if (!isMatched) {
      toast.error('Confirmação inválida. Digite o termo correto.');
      return;
    }

    if (confirmDialog.type === 'client') {
      anonymizeClientMutation.mutate(confirmDialog.id);
    } else if (confirmDialog.type === 'user') {
      anonymizeUserMutation.mutate(confirmDialog.id);
    } else {
      anonymizeContactMutation.mutate(confirmDialog.id);
    }
  };

  const isButtonEnabled =
    confirmationInput.toUpperCase() === 'ANONIMIZAR' || confirmationInput === confirmDialog.name;

  return (
    <div className="space-y-6">
      <div className="border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" />
          Conformidade e Privacidade (LGPD)
        </h1>
        <p className="text-muted-foreground mt-1">
          Anonimize dados pessoais e corporativos de clientes, contatos ou usuários de forma
          irreversível para conformidade legal.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 dark:bg-slate-900 border">
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" />
            Clientes (Empresas)
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Contas de Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center gap-2 max-w-md bg-card border rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cliente por nome..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-sm"
            />
          </div>

          <Card className="border shadow-xs">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Clientes e Contatos Associados</CardTitle>
              <CardDescription>
                Selecione o cliente corporativo para anonimizar a empresa inteira ou expanda o
                registro para anonimizar contatos individuais (pessoas físicas).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingClients ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span>Buscando clientes...</span>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum cliente corporativo encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-6"></TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Ação LGPD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const isAnonimized = client.name === 'Anonimizado LGPD';
                      const isExpanded = expandedClientId === client.id;
                      return (
                        <Fragment key={client.id}>
                          <TableRow
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer"
                            onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                          >
                            <TableCell className="pl-6 py-3" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500"
                                onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>{client.document || '-'}</TableCell>
                            <TableCell>
                              {isAnonimized ? (
                                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0">
                                  Anonimizado
                                </Badge>
                              ) : client.isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border-0">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border-0">
                                  Inativo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell
                              className="text-right pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                                >
                                  Contatos
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-1.5 h-8 text-xs hover:bg-red-600"
                                  disabled={isAnonimized}
                                  onClick={() =>
                                    handleOpenConfirm('client', client.id, client.name)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Anonimizar Empresa
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-slate-50/30 dark:bg-slate-900/10 hover:bg-transparent">
                              <TableCell colSpan={5} className="pl-12 pr-6 py-3 border-t-0">
                                <ClientContactsList
                                  clientId={client.id}
                                  onAnonymizeContact={(contactId, name) =>
                                    handleOpenConfirm('contact', contactId, name)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2 max-w-md bg-card border rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar contas inativas por nome..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-sm"
            />
          </div>

          <Card className="border shadow-xs">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Usuários Inativos</CardTitle>
              <CardDescription>
                Apenas contas de usuários desativadas podem ser anonimizadas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span>Buscando usuários...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma conta de usuário desativada encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cargo (RBAC)</TableHead>
                      <TableHead className="text-right pr-6">Ação LGPD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => {
                      const isAnonimized = userItem.name === 'Usuário Anonimizado';
                      return (
                        <TableRow
                          key={userItem.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                        >
                          <TableCell className="font-medium pl-6">{userItem.name}</TableCell>
                          <TableCell>{userItem.email}</TableCell>
                          <TableCell>
                            <Badge className="bg-slate-100 text-slate-700 border-0 uppercase text-[10px]">
                              {userItem.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1.5 h-8 text-xs hover:bg-red-600"
                              disabled={isAnonimized}
                              onClick={() => handleOpenConfirm('user', userItem.id, userItem.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Anonimizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CONFIRMATION DIALOG */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-bounce" />
              Ação Crítica e Irreversível!
            </DialogTitle>
            <DialogDescription className="text-slate-500 pt-1.5">
              Você está prestes a anonimizar os dados de{' '}
              <strong className="text-slate-800 dark:text-slate-100">{confirmDialog.name}</strong>.
              Em conformidade com a LGPD, esta ação:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              {confirmDialog.type === 'client' && (
                <>
                  <li>Renomeará o cliente para "Anonimizado LGPD".</li>
                  <li>Apagará documento, CNPJ e endereço do banco de dados.</li>
                  <li>
                    Renomeará contatos vinculados para "Contato Anonimizado" e removerá seus e-mails
                    e telefones.
                  </li>
                </>
              )}
              {confirmDialog.type === 'user' && (
                <>
                  <li>Renomeará a conta para "Usuário Anonimizado".</li>
                  <li>Substituirá o e-mail por um hash irreversível.</li>
                  <li>Invalidará permanentemente a senha de acesso à conta.</li>
                </>
              )}
              {confirmDialog.type === 'contact' && (
                <>
                  <li>Renomeará o contato individual para "Contato Anonimizado".</li>
                  <li>Apagará o e-mail e telefone pessoais do contato.</li>
                  <li>
                    Desativará o contato mantendo o vínculo com os orçamentos históricos de forma
                    anônima.
                  </li>
                </>
              )}
              <li className="font-semibold text-red-500">
                Esta operação não pode ser desfeita sob nenhuma circunstância.
              </li>
            </ul>

            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="confirm-input" className="text-xs font-semibold">
                Para prosseguir, digite{' '}
                <span className="font-mono text-red-600 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded">
                  ANONIMIZAR
                </span>{' '}
                ou o nome exato:
              </Label>
              <Input
                id="confirm-input"
                placeholder={confirmDialog.name}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border-red-200/60 focus-visible:ring-red-500 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="hover:bg-red-650"
              disabled={
                !isButtonEnabled ||
                anonymizeClientMutation.isPending ||
                anonymizeUserMutation.isPending ||
                anonymizeContactMutation.isPending
              }
              onClick={handleExecuteAnonymization}
            >
              {anonymizeClientMutation.isPending ||
              anonymizeUserMutation.isPending ||
              anonymizeContactMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Anonimização'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
