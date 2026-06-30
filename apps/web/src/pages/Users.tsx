import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Search,
  UserPlus,
  Edit,
  UserMinus,
  UserCheck,
  Key,
  Copy,
  Check,
  ShieldAlert,
  Users as UsersIcon,
} from 'lucide-react';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ESTIMATOR' | 'VIEWER';
  isActive: boolean;
  changePasswordNextLogin: boolean;
  createdAt: string;
}

export function Users() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'ESTIMATOR' | 'VIEWER'>('ESTIMATOR');
  const [formIsActive, setFormIsActive] = useState(true);

  // Generated password state
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch users
  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users?limit=100');
      return data.data ?? data;
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/users', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setIsSuccessOpen(true);
      toast.success('Usuário criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário.');
    },
  });

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditOpen(false);
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao atualizar usuário.');
    },
  });

  const handleOpenCreate = () => {
    const tempPass = Math.random().toString(36).substring(2, 10).toUpperCase();
    setGeneratedPassword(tempPass);
    setFormName('');
    setFormEmail('');
    setFormRole('ESTIMATOR');
    setIsCreateOpen(true);
  };

  const isAnonymizedName = (name: string) => name === 'Usuário Anonimizado';

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (isAnonymizedName(formName)) {
      toast.error('Nome de usuário inválido.');
      return;
    }
    createUserMutation.mutate({
      name: formName,
      email: formEmail,
      role: formRole,
      password: generatedPassword,
    });
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (isAnonymizedName(selectedUser.name) && formIsActive) {
      toast.error('Não é possível reativar um usuário anonimizado.');
      return;
    }
    if (isAnonymizedName(formName)) {
      toast.error('Nome de usuário inválido.');
      return;
    }

    updateUserMutation.mutate({
      id: selectedUser.id,
      payload: {
        name: formName,
        email: formEmail,
        role: formRole,
        isActive: formIsActive,
      },
    });
  };

  const handleToggleStatus = (user: UserItem) => {
    if (isAnonymizedName(user.name) && !user.isActive) {
      toast.error('Não é possível reativar um usuário anonimizado.');
      return;
    }
    updateUserMutation.mutate({
      id: user.id,
      payload: {
        isActive: !user.isActive,
      },
    });
  };

  const handleForcePasswordReset = (user: UserItem) => {
    const tempPass = Math.random().toString(36).substring(2, 10).toUpperCase();
    setGeneratedPassword(tempPass);
    setSelectedUser(user);
    setIsResetOpen(true);
  };

  const handleCopyPassword = () => {
    const copy = () => {
      setCopied(true);
      toast.success('Senha copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    };

    const fallbackCopy = () => {
      try {
        const el = document.createElement('textarea');
        el.value = generatedPassword;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const success = document.execCommand('copy');
        document.body.removeChild(el);
        if (success) {
          copy();
        } else {
          toast.error('Não foi possível copiar a senha automaticamente.');
        }
      } catch (err) {
        console.error('Fallback copy failed', err);
        toast.error('Não foi possível copiar a senha automaticamente.');
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(generatedPassword)
        .then(copy)
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Controle os acessos, cargos (RBAC) e politicas de segurança dos usuários do sistema.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/95 text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-md bg-card border rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-sm"
        />
      </div>

      <Card className="border shadow-xs">
        <CardHeader className="py-4">
          <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
          <CardDescription>Visualização completa de contas ativas e inativas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>Erro ao carregar usuários</EmptyTitle>
                <EmptyDescription>
                  Não foi possível carregar a lista de usuários. Tente novamente.
                </EmptyDescription>
              </Empty>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>Nenhum usuário encontrado</EmptyTitle>
                <EmptyDescription>
                  Nenhum usuário corresponde aos critérios de busca.
                </EmptyDescription>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo (RBAC)</TableHead>
                  <TableHead>Primeiro Acesso / Reset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userItem) => (
                  <TableRow
                    key={userItem.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                  >
                    <TableCell className="font-medium pl-6">{userItem.name}</TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      {userItem.role === 'ADMIN' && (
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/15 border-0">
                          Administrador
                        </Badge>
                      )}
                      {userItem.role === 'ESTIMATOR' && (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 border-0">
                          Orçamentista
                        </Badge>
                      )}
                      {userItem.role === 'VIEWER' && (
                        <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/15 border-0">
                          Visualizador
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {userItem.changePasswordNextLogin ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border-0 gap-1.5 font-normal">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Pendente
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border-0 font-normal">
                          Concluído
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {userItem.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                          Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(userItem)}
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          aria-label="Editar dados do usuário"
                          title={
                            isAnonymizedName(userItem.name)
                              ? 'Usuário anonimizado não pode ser editado'
                              : 'Editar cargo e dados'
                          }
                          disabled={isAnonymizedName(userItem.name)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleForcePasswordReset(userItem)}
                          className="h-8 w-8 text-amber-600 hover:text-amber-900 hover:bg-amber-50/50"
                          disabled={isAnonymizedName(userItem.name)}
                          aria-label="Forçar redefinição de senha"
                          title={
                            isAnonymizedName(userItem.name)
                              ? 'Usuário anonimizado'
                              : 'Forçar redefinição de senha no próximo login'
                          }
                        >
                          <Key className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(userItem)}
                          className={`h-8 w-8 ${userItem.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50/50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/50'}`}
                          aria-label={userItem.isActive ? 'Desativar usuário' : 'Ativar usuário'}
                          title={
                            userItem.isActive
                              ? 'Desativar usuário'
                              : isAnonymizedName(userItem.name)
                                ? 'Usuário anonimizado não pode ser reativado'
                                : 'Ativar usuário'
                          }
                          disabled={isAnonymizedName(userItem.name) && !userItem.isActive}
                        >
                          {userItem.isActive ? (
                            <UserMinus className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <CustomDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Criar Novo Usuário"
        description="Cadastre um novo funcionário. Ele precisará redefinir a senha no primeiro acesso."
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Nome Completo</Label>
            <Input
              id="create-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-email">E-mail Corporativo</Label>
            <Input
              id="create-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Ex: joao.silva@empresa.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-role">Cargo (Nível de Acesso)</Label>
            <Select value={formRole} onValueChange={(val: any) => setFormRole(val)}>
              <SelectTrigger id="create-role">
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador (Controle Total)</SelectItem>
                <SelectItem value="ESTIMATOR">Orçamentista (Criação e Edição)</SelectItem>
                <SelectItem value="VIEWER">Visualizador (Apenas Leitura)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Senha Temporária Gerada:</p>
            <p className="mt-1 font-mono text-sm tracking-widest text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-1 rounded border text-center select-all">
              {generatedPassword}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <CustomButton type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </CustomButton>
            <CustomButton type="submit" isLoading={createUserMutation.isPending}>
              Criar Usuário
            </CustomButton>
          </div>
        </form>
      </CustomDialog>

      {/* SUCCESS CREATED DIALOG */}
      <CustomDialog
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Usuário Criado!"
        description="Copie a senha abaixo e envie para o novo funcionário."
        size="md"
        className="text-center"
      >
        <div className="my-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed flex flex-col items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Senha Temporária
          </span>
          <div className="font-mono text-2xl font-bold tracking-widest text-primary bg-white dark:bg-slate-950 px-4 py-2 rounded-md shadow-sm border border-slate-200/50">
            {generatedPassword}
          </div>
          <CustomButton
            size="sm"
            variant="outline"
            onClick={handleCopyPassword}
            className="gap-1.5 mt-1"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiada!' : 'Copiar Senha'}
          </CustomButton>
        </div>
        <div className="flex justify-center pt-2">
          <CustomButton onClick={() => setIsSuccessOpen(false)} className="w-full sm:w-auto">
            Entendido
          </CustomButton>
        </div>
      </CustomDialog>

      {/* EDIT DIALOG */}
      <CustomDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar Dados do Usuário"
        description={`Atualize as permissões ou status da conta de ${selectedUser?.name}.`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome Completo</Label>
            <Input
              id="edit-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">E-mail Corporativo</Label>
            <Input
              id="edit-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Ex: joao.silva@empresa.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Cargo (Nível de Acesso)</Label>
            <Select value={formRole} onValueChange={(val: any) => setFormRole(val)}>
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador (Controle Total)</SelectItem>
                <SelectItem value="ESTIMATOR">Orçamentista (Criação e Edição)</SelectItem>
                <SelectItem value="VIEWER">Visualizador (Apenas Leitura)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Status da Conta</Label>
            <Select
              value={formIsActive ? 'true' : 'false'}
              onValueChange={(val) => setFormIsActive(val === 'true')}
            >
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true" disabled={isAnonymizedName(selectedUser?.name || '')}>
                  Ativo
                </SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <CustomButton type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </CustomButton>
            <CustomButton type="submit" isLoading={updateUserMutation.isPending}>
              Salvar Alterações
            </CustomButton>
          </div>
        </form>
      </CustomDialog>

      {/* RESET PASSWORD DIALOG */}
      <CustomDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Redefinir Senha do Usuário"
        description={`Gerar uma nova senha temporária para ${selectedUser?.name}.`}
        size="md"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            O usuário <strong className="text-foreground">{selectedUser?.email}</strong> receberá
            uma nova senha temporária e será obrigado a alterá-la no próximo login.
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex flex-col items-center gap-3">
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium uppercase tracking-wider">
              Nova Senha Temporária
            </span>
            <div className="font-mono text-2xl font-bold tracking-widest text-amber-900 dark:text-amber-100 bg-white dark:bg-slate-900 px-4 py-2 rounded-md shadow-sm border border-amber-200 dark:border-amber-800 select-all">
              {generatedPassword}
            </div>
            <CustomButton
              size="sm"
              variant="outline"
              onClick={handleCopyPassword}
              className="gap-1.5 mt-1 border-amber-200 hover:bg-amber-100/50"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" text-amber-700 />
              )}
              {copied ? 'Copiada!' : 'Copiar Senha'}
            </CustomButton>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <CustomButton type="button" variant="outline" onClick={() => setIsResetOpen(false)}>
              Cancelar
            </CustomButton>
            <CustomButton
              onClick={() => {
                if (!selectedUser) return;
                updateUserMutation.mutate({
                  id: selectedUser.id,
                  payload: {
                    password: generatedPassword,
                    changePasswordNextLogin: true,
                  },
                });
                setIsResetOpen(false);
              }}
              isLoading={updateUserMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar Redefinição
            </CustomButton>
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
