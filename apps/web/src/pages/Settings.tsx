import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Building, Cog, Shield, Search, Loader2, Target, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { DocumentInput, PhoneInput } from '@/components/ui/masked-input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface CompanyConfig {
  id: string;
  companyName: string;
  document: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  footer: string | null;
}

interface ConfigItem {
  key: string;
  value: string | number | { algorithm: string; threshold: number };
}

interface SettingsFormProps {
  configs: ConfigItem[];
}

function CompanyForm() {
  const queryClient = useQueryClient();
  const { data: remote, isLoading } = useQuery<CompanyConfig>({
    queryKey: ['company-config'],
    queryFn: async () => {
      const res = await api.get('/config/company');
      return res.data;
    },
  });
  const [form, setForm] = useState<CompanyConfig | null>(null);

  useEffect(() => {
    if (remote && !form) {
      setForm(remote);
    }
  }, [remote, form]);

  const mutation = useMutation({
    mutationFn: async (data: Partial<CompanyConfig>) => {
      const res = await api.put('/config/company', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-config'] });
      toast.success('Dados da empresa salvos!');
    },
    onError: (err: any) => {
      const status = err.response?.status;
      const message = err.response?.data?.message || '';
      if (
        status === 413 ||
        message.toLowerCase().includes('too large') ||
        err.message?.toLowerCase().includes('413')
      ) {
        toast.error('Erro: O arquivo de imagem é muito grande para o servidor.');
      } else {
        toast.error(message || 'Erro ao salvar dados da empresa.');
      }
    },
  });

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const set =
    (field: keyof CompanyConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => {
        if (!prev) return null;
        return { ...prev, [field]: e.target.value };
      });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados da Empresa</CardTitle>
        <CardDescription>
          Estes dados aparecem no cabeçalho e rodapé dos PDFs exportados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Razão Social</FieldLabel>
                  <Input value={form.companyName} onChange={set('companyName')} />
                </Field>
                <Field>
                  <FieldLabel>CNPJ</FieldLabel>
                  <DocumentInput
                    value={form.document ?? ''}
                    onChange={(masked) =>
                      setForm((prev) => (prev ? { ...prev, document: masked } : null))
                    }
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Endereço</FieldLabel>
                <Input value={form.address ?? ''} onChange={set('address')} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Telefone</FieldLabel>
                  <PhoneInput
                    value={form.phone ?? ''}
                    onChange={(masked) =>
                      setForm((prev) => (prev ? { ...prev, phone: masked } : null))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>E-mail</FieldLabel>
                  <Input value={form.email ?? ''} onChange={set('email')} />
                </Field>
                <Field>
                  <FieldLabel>Website</FieldLabel>
                  <Input value={form.website ?? ''} onChange={set('website')} />
                </Field>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/20 min-h-[200px]">
              {form.logo ? (
                <div className="relative group w-full flex flex-col items-center gap-2">
                  <img
                    src={form.logo}
                    alt="Logo da Empresa"
                    className="max-h-28 object-contain rounded bg-background p-2 border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => setForm((prev) => ({ ...prev!, logo: null }))}
                  >
                    Remover Logo
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-2 flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">Logotipo da Empresa</div>
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    PNG ou JPG de até 5MB. Aparece no cabeçalho do PDF.
                  </p>
                  <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 mt-2">
                    Selecionar Imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('O arquivo é muito grande. O limite máximo é 5MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm((prev) => ({ ...prev!, logo: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <Field>
            <FieldLabel>Anotações / Rodapé</FieldLabel>
            <textarea
              value={form.footer ?? ''}
              onChange={set('footer')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
            />
          </Field>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Dados da Empresa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsForm({ configs }: SettingsFormProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');

  const initialSessionExpiryItem = configs.find((c) => c.key === 'session_expiry');
  const initialSessionExpiry =
    typeof initialSessionExpiryItem?.value === 'string' ? initialSessionExpiryItem.value : '12h';

  const initialSearchSettingsItem = configs.find((c) => c.key === 'search_settings');
  const initialSearchSettings =
    initialSearchSettingsItem && typeof initialSearchSettingsItem.value === 'object'
      ? (initialSearchSettingsItem.value as { algorithm: string; threshold: number })
      : { algorithm: 'DICE', threshold: 0.4 };

  const initialTargetApprovalRateItem = configs.find((c) => c.key === 'target_approval_rate');
  const initialTargetApprovalRate =
    initialTargetApprovalRateItem != null ? Number(initialTargetApprovalRateItem.value) : 60;

  const initialDefaultMarginItem = configs.find((c) => c.key === 'default_markup_margin');
  const initialDefaultMargin =
    initialDefaultMarginItem != null ? Number(initialDefaultMarginItem.value) : 20;

  const initialMinMarginItem = configs.find((c) => c.key === 'minimum_margin');
  const initialMinMargin = initialMinMarginItem != null ? Number(initialMinMarginItem.value) : 15;

  const initialSystemNameItem = configs.find((c) => c.key === 'system_name');
  const initialSystemName =
    typeof initialSystemNameItem?.value === 'string' ? initialSystemNameItem.value : 'CPQ/DMS';

  const initialPriceRoundingRuleItem = configs.find((c) => c.key === 'price_rounding_rule');
  const initialPriceRoundingRule =
    typeof initialPriceRoundingRuleItem?.value === 'string'
      ? initialPriceRoundingRuleItem.value
      : 'NONE';

  const [systemName, setSystemName] = useState(initialSystemName);
  const [sessionExpiry, setSessionExpiry] = useState(initialSessionExpiry);
  const [searchAlgorithm, setSearchAlgorithm] = useState(initialSearchSettings.algorithm);
  const [searchThreshold, setSearchThreshold] = useState(initialSearchSettings.threshold);
  const [targetApprovalRate, setTargetApprovalRate] = useState(initialTargetApprovalRate);
  const [defaultMarkupMargin, setDefaultMarkupMargin] = useState(initialDefaultMargin);
  const [minimumMargin, setMinimumMargin] = useState(initialMinMargin);
  const [priceRoundingRule, setPriceRoundingRule] = useState(initialPriceRoundingRule);

  const updateMutation = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string | number | { algorithm: string; threshold: number };
    }) => {
      const response = await api.put(`/config/${key}`, { value });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
      if (variables.key === 'system_name') {
        queryClient.invalidateQueries({ queryKey: ['system-name'] });
        toast.success('Nome do sistema atualizado!');
      } else if (variables.key === 'session_expiry') {
        toast.success('Tempo de expiração de sessão atualizado!');
      } else if (variables.key === 'target_approval_rate') {
        toast.success('Meta comercial de taxa de aprovação atualizada!');
      } else if (variables.key === 'default_markup_margin') {
        toast.success('Margem padrão de envio atualizada!');
      } else if (variables.key === 'minimum_margin') {
        toast.success('Margem mínima de alçada atualizada!');
      } else if (variables.key === 'price_rounding_rule') {
        toast.success('Regra de arredondamento de preços atualizada!');
      } else {
        toast.success('Configurações de busca atualizadas!');
      }
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      const message = apiError.response?.data?.message || 'Falha ao salvar configuração.';
      toast.error(message);
    },
  });

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ key: 'session_expiry', value: sessionExpiry });
  };

  const handleSaveSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      key: 'search_settings',
      value: {
        algorithm: searchAlgorithm as 'DICE' | 'JACCARD',
        threshold: Number(searchThreshold),
      },
    });
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      key: 'target_approval_rate',
      value: Number(targetApprovalRate),
    });
    updateMutation.mutate({
      key: 'default_markup_margin',
      value: Number(defaultMarkupMargin),
    });
    updateMutation.mutate({
      key: 'minimum_margin',
      value: Number(minimumMargin),
    });
    updateMutation.mutate({
      key: 'price_rounding_rule',
      value: priceRoundingRule,
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList
        variant="line"
        className="border-b pb-0 w-full justify-start rounded-none h-10 gap-4"
      >
        <TabsTrigger
          value="company"
          className="pb-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <Building className="h-4 w-4 mr-2" />
          Empresa
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="pb-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <Shield className="h-4 w-4 mr-2" />
          Sessão & Segurança
        </TabsTrigger>
        <TabsTrigger
          value="search"
          className="pb-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <Search className="h-4 w-4 mr-2" />
          Motor de Busca
        </TabsTrigger>
        <TabsTrigger
          value="goals"
          className="pb-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <Target className="h-4 w-4 mr-2" />
          Metas Comerciais
        </TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="space-y-6 outline-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nome do Sistema</CardTitle>
            <CardDescription>
              Nome exibido na barra lateral e tela de login. Use um nome curto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({ key: 'system_name', value: systemName });
              }}
              className="flex items-end gap-4"
            >
              <div className="flex-1">
                <Field>
                  <FieldLabel>Nome do Sistema</FieldLabel>
                  <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} />
                </Field>
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="shrink-0">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>
        <CompanyForm />
      </TabsContent>

      <TabsContent value="security" className="space-y-6 outline-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações de Sessão do Usuário</CardTitle>
            <CardDescription>
              Defina o tempo limite que as sessões dos usuários permanecem válidas antes de expirar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSecurity} className="space-y-6 max-w-lg">
              <Field>
                <FieldLabel htmlFor="session-expiry" className="font-semibold text-sm">
                  Tempo Limite de Sessão (JWT Expiry)
                </FieldLabel>
                <Select value={sessionExpiry} onValueChange={setSessionExpiry}>
                  <SelectTrigger className="w-full bg-background" id="session-expiry">
                    <SelectValue placeholder="Selecione um tempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="2h">2 Horas</SelectItem>
                      <SelectItem value="4h">4 Horas</SelectItem>
                      <SelectItem value="8h">8 Horas</SelectItem>
                      <SelectItem value="12h">12 Horas (Recomendado)</SelectItem>
                      <SelectItem value="24h">24 Horas (1 Dia)</SelectItem>
                      <SelectItem value="48h">48 Horas (2 Dias)</SelectItem>
                      <SelectItem value="never">Nunca Expirar (Não recomendado)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sessões mais curtas aumentam a segurança da aplicação, exigindo login mais
                  frequentemente. Ao alterar este valor, novas sessões adotarão a expiração
                  configurada.
                </p>
              </Field>

              <Button type="submit" disabled={updateMutation.isPending} className="px-6">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações de Segurança
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="search" className="space-y-6 outline-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações do Algoritmo de Similaridade</CardTitle>
            <CardDescription>
              Ajuste os parâmetros matemáticos do motor de busca global aproximada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSearch} className="space-y-6 max-w-lg">
              <Field>
                <FieldLabel htmlFor="search-algorithm" className="font-semibold text-sm">
                  Algoritmo de Busca
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Define qual coeficiente matemático o motor usa para calcular similaridade
                          entre textos na busca global.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <Select value={searchAlgorithm} onValueChange={setSearchAlgorithm}>
                  <SelectTrigger className="w-full bg-background" id="search-algorithm">
                    <SelectValue placeholder="Selecione o algoritmo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="DICE">
                        Sørensen-Dice (Recomendado para Português)
                      </SelectItem>
                      <SelectItem value="JACCARD">
                        Jaccard (Exatidão matemática de conjunto)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="search-threshold" className="font-semibold text-sm">
                  Threshold de Similaridade Mínima
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Valores mais baixos retornam mais resultados (busca ampla). Valores mais
                          altos exigem maior exatidão.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <div className="flex items-center gap-4">
                  <input
                    id="search-threshold"
                    type="range"
                    min={5}
                    max={95}
                    step={5}
                    value={Math.round(Number(searchThreshold) * 100)}
                    onChange={(e) => setSearchThreshold(Number(e.target.value) / 100)}
                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-primary text-sm w-12 text-right">
                    {Math.round(Number(searchThreshold) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O ideal recomendado é entre 30% e 50%.
                </p>
              </Field>

              <Button type="submit" disabled={updateMutation.isPending} className="px-6">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Parâmetros do Motor de Busca
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="goals" className="space-y-6 outline-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações de Metas Comerciais</CardTitle>
            <CardDescription>
              Defina as metas comerciais de eficiência e taxas de aprovação de propostas para
              referência visual em BI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveGoals} className="space-y-6 max-w-lg">
              <Field>
                <FieldLabel htmlFor="target-approval-rate" className="font-semibold text-sm">
                  Meta de Taxa de Aprovação (%)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Utilizada nos painéis de BI como limite de sucesso de conversão do funil
                          de vendas.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <div className="flex items-center gap-4">
                  <input
                    id="target-approval-rate"
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={targetApprovalRate}
                    onChange={(e) => setTargetApprovalRate(Number(e.target.value))}
                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-primary text-sm w-12 text-right">
                    {targetApprovalRate}%
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="default-markup-margin" className="font-semibold text-sm">
                  Margem Comercial Padrão (%)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Margem sugerida automaticamente no preenchimento de custo dos itens do
                          orçamento.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <div className="flex items-center gap-4">
                  <input
                    id="default-markup-margin"
                    type="range"
                    min={1}
                    max={99}
                    step={1}
                    value={defaultMarkupMargin}
                    onChange={(e) => setDefaultMarkupMargin(Number(e.target.value))}
                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-primary text-sm w-12 text-right">
                    {defaultMarkupMargin}%
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="minimum-margin" className="font-semibold text-sm">
                  Margem Mínima de Envio (%)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Orçamentos com margem abaixo deste valor exigem aprovação de alçada da
                          gerência.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <div className="flex items-center gap-4">
                  <input
                    id="minimum-margin"
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={minimumMargin}
                    onChange={(e) => setMinimumMargin(Number(e.target.value))}
                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-primary text-sm w-12 text-right">
                    {minimumMargin}%
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="price-rounding-rule" className="font-semibold text-sm">
                  Regra de Arredondamento de Preço
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>
                          Define a regra de arredondamento aplicada ao preço sugerido gerado a
                          partir do custo unitário e margem de lucro.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FieldLabel>
                <Select value={priceRoundingRule} onValueChange={setPriceRoundingRule}>
                  <SelectTrigger className="w-full bg-background" id="price-rounding-rule">
                    <SelectValue placeholder="Selecione a regra de arredondamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      Nenhum (Arredondamento padrão de 2 centavos)
                    </SelectItem>
                    <SelectItem value="UP_50_CENTS">
                      Próximo R$ 0,50 (Arredondar para cima)
                    </SelectItem>
                    <SelectItem value="UP_1_REAL">
                      Próximo R$ 1,00 (Arredondar para cima)
                    </SelectItem>
                    <SelectItem value="UP_10_REAIS">
                      Próxima Dezena (Arredondar para cima)
                    </SelectItem>
                    <SelectItem value="NEAREST_50_CENTS">R$ 0,50 mais próximo</SelectItem>
                    <SelectItem value="NEAREST_1_REAL">R$ 1,00 mais próximo</SelectItem>
                    <SelectItem value="NEAREST_10_REAIS">Dezena mais próxima</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Button type="submit" disabled={updateMutation.isPending} className="px-6">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Metas Comerciais
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function Settings() {
  const { data: configs, isLoading } = useQuery<ConfigItem[]>({
    queryKey: ['system-configs'],
    queryFn: async () => {
      const response = await api.get('/config');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          Carregando configurações do sistema...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center">
          <Cog className="mr-3 text-primary h-6 w-6" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ajuste as preferências administrativas de metas de conversão comercial, segurança e
          algoritmos do motor de busca.
        </p>
      </div>

      {configs && <SettingsForm configs={configs} />}
    </div>
  );
}
