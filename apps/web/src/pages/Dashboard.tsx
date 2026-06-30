import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Users,
  Clock,
  Calendar,
  ArrowRight,
  FilePlus,
  FolderOpen,
  Percent,
  ClipboardList,
  X,
} from 'lucide-react';
import { PieChart, Pie } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Quote {
  id: string;
  descriptiveText: string;
  networkFilePath: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'SUPERSEDED';
  deliveryDate: string | null;
  createdAt: string;
  createdById: string;
  client: { name: string };
  category: { name: string };
}

interface QuotesResponse {
  data: Quote[];
}

interface LegendPayloadItem {
  payload?: {
    value: number;
    status: string;
  };
  color?: string;
}

interface CustomLegendContentProps {
  payload?: LegendPayloadItem[];
  config: Record<string, { label: string; color?: string }>;
  total: number;
}

function CustomLegendContent({ payload, config, total }: CustomLegendContentProps) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-col gap-2 items-start justify-center pl-4">
      {payload.map((entry, index) => {
        const { payload: dataPayload, color } = entry;
        if (!dataPayload) return null;

        const value = dataPayload.value;
        const status = dataPayload.status;
        const label = config[status]?.label || status;
        const percentage = total > 0 ? (value / total) * 100 : 0;

        return (
          <div
            key={index}
            className="flex items-center gap-2 text-xs font-semibold text-foreground leading-none"
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span>
              {label}{' '}
              <span className="text-[10px] text-muted-foreground font-mono font-bold">
                ({value} - {percentage.toFixed(0)}%)
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  });
  const [showWelcome, setShowWelcome] = useState(
    () => sessionStorage.getItem('cpq_hide_welcome_banner') !== 'true',
  );

  interface DashboardMetrics {
    approvalRate: number;
    totalProcessed: number;
    totalApproved: number;
    targetApprovalRate?: number;
  }

  const { data: quotesData, isLoading } = useQuery<QuotesResponse>({
    queryKey: ['quotes', 'dashboard'],
    queryFn: async () => (await api.get('/quotes?limit=1000')).data,
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => (await api.get('/analytics/dashboard')).data,
  });

  // Filter drafts created by the current user
  const myDrafts = quotesData?.data
    ? quotesData.data.filter((q) => q.status === 'DRAFT' && q.createdById === user?.id).slice(0, 5)
    : [];

  // Filter approved or sent quotes that have deliveryDate, sorted by closest date
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingDeliveries = quotesData?.data
    ? quotesData.data
        .filter(
          (q) =>
            (q.status === 'APPROVED' || q.status === 'SENT') &&
            q.deliveryDate &&
            new Date(q.deliveryDate).getTime() >= now.getTime(),
        )
        .sort((a, b) => {
          const dateA = new Date(a.deliveryDate!).getTime();
          const dateB = new Date(b.deliveryDate!).getTime();
          return dateA - dateB;
        })
        .slice(0, 5)
    : [];

  // Start of current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Filter user's quotes created in the current month
  const myQuotesThisMonth = quotesData?.data
    ? quotesData.data.filter((q) => {
        const isMine = q.createdById === user?.id;
        const isThisMonth = new Date(q.createdAt).getTime() >= startOfMonth.getTime();
        return isMine && isThisMonth;
      })
    : [];

  const totalMyQuotesThisMonth = myQuotesThisMonth.length;

  const statusCounts: Record<Quote['status'], number> = {
    DRAFT: 0,
    SENT: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELED: 0,
    SUPERSEDED: 0,
  };

  myQuotesThisMonth.forEach((q) => {
    if (statusCounts[q.status] !== undefined) {
      statusCounts[q.status]++;
    }
  });

  const dashboardPieData = [
    { status: 'DRAFT', value: statusCounts.DRAFT, fill: 'var(--color-DRAFT)' },
    { status: 'SENT', value: statusCounts.SENT, fill: 'var(--color-SENT)' },
    { status: 'APPROVED', value: statusCounts.APPROVED, fill: 'var(--color-APPROVED)' },
    { status: 'REJECTED', value: statusCounts.REJECTED, fill: 'var(--color-REJECTED)' },
    { status: 'CANCELED', value: statusCounts.CANCELED, fill: 'var(--color-CANCELED)' },
    { status: 'SUPERSEDED', value: statusCounts.SUPERSEDED, fill: 'var(--color-SUPERSEDED)' },
  ].filter((d) => d.value > 0);

  const chartConfig = {
    value: { label: 'Quantidade' },
    DRAFT: { label: 'Rascunho', color: '#eab308' },
    SENT: { label: 'Enviado', color: '#3b82f6' },
    APPROVED: { label: 'Aprovado', color: '#10b981' },
    REJECTED: { label: 'Rejeitado', color: '#ef4444' },
    CANCELED: { label: 'Cancelado', color: '#64748b' },
    SUPERSEDED: { label: 'Substituído', color: '#a855f7' },
  };

  const targetRate = metrics?.targetApprovalRate || 60;

  const StatusBadge = ({ status }: { status: Quote['status'] }) => {
    const map = {
      DRAFT: {
        label: 'Rascunho',
        className:
          'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50',
      },
      SENT: {
        label: 'Enviado',
        className:
          'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
      },
      APPROVED: {
        label: 'Aprovado',
        className:
          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
      },
      REJECTED: {
        label: 'Rejeitado',
        className:
          'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50',
      },
      CANCELED: {
        label: 'Cancelado',
        className:
          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      },
      SUPERSEDED: {
        label: 'Substituído',
        className:
          'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
      },
    };
    const s = map[status] || map.DRAFT;
    return (
      <Badge variant="outline" className={s.className}>
        {s.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {showWelcome && (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border border-primary/10">
          <button
            onClick={() => {
              setShowWelcome(false);
              sessionStorage.setItem('cpq_hide_welcome_banner', 'true');
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-2 pr-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {greeting}, <span className="text-primary">{user?.name}</span>!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Bem-vindo ao seu painel de trabalho operacional. Acompanhe os prazos de entregas e
              continue preenchendo seus rascunhos.
            </p>
          </div>
        </div>
      )}

      {/* Operational KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isLoading && totalMyQuotesThisMonth > 0 ? (
          <Card className="lg:col-span-1 shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md transition-all duration-300 min-h-[180px] flex flex-col justify-between">
            <CardHeader className="items-center pb-0">
              <CardTitle className="font-bold flex items-center gap-1.5">
                <Percent className="h-5 w-5 text-primary" />
                Distribuição dos Orçamentos (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-4">
              <ChartContainer config={chartConfig} className="mx-auto w-full max-h-[110px]">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={dashboardPieData} dataKey="value" nameKey="status" outerRadius="95%" />
                  <ChartLegend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    content={
                      <CustomLegendContent config={chartConfig} total={totalMyQuotesThisMonth} />
                    }
                    className="flex-col gap-1 items-start justify-center pl-4"
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : (
          totalMyQuotesThisMonth === 0 &&
          !isLoading && (
            <Card className="lg:col-span-1 shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md transition-all duration-300 min-h-[180px] flex flex-col justify-between">
              <CardHeader className="items-center pb-0">
                <CardTitle className="font-bold flex items-center gap-1.5">
                  <Percent className="h-5 w-5 text-primary" />
                  Distribuição dos Orçamentos (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-4">
                <p className="text-muted-foreground text-sm sm:text-base">
                  Nenhum orçamento encontrado
                </p>
              </CardContent>
            </Card>
          )
        )}

        {/* Conversion / Approval Rate (col-span-1) */}
        <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md transition-all duration-300 bg-linear-to-br from-violet-500/5 via-transparent to-transparent flex flex-col justify-between min-h-[180px]">
          <CardContent className="p-6 h-full flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Taxa de Aprovação (Mês)
                </p>
                {loadingMetrics ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
                    {metrics?.approvalRate != null ? `${metrics.approvalRate}%` : '0%'}
                  </h3>
                )}
              </div>
              <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            {!loadingMetrics && (
              <div className="mt-4 space-y-2">
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(metrics?.approvalRate ?? 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>Meta: {targetRate}%</span>
                  <span>{metrics?.approvalRate}% atingido</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 group shadow-sm bg-linear-to-br from-primary/4 to-transparent"
          onClick={() => navigate('/quotes/new')}
        >
          <CardContent className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FilePlus className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Novo Orçamento</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Lançar uma nova proposta comercial
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 group shadow-sm"
          onClick={() => navigate('/quotes')}
        >
          <CardContent className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Orçamentos</h3>
              <p className="text-xs text-muted-foreground mt-1">Listagem e gestão de cotações</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 group shadow-sm"
          onClick={() => navigate('/clients')}
        >
          <CardContent className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Clientes</h3>
              <p className="text-xs text-muted-foreground mt-1">Cadastro e catálogo de contatos</p>
            </div>
          </CardContent>
        </Card>

        {/* <Card
          className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 group shadow-sm"
          onClick={() => navigate('/categories')}
        >
          <CardContent className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Layers className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Categorias</h3>
              <p className="text-xs text-muted-foreground mt-1">Configuração de processos fabris</p>
            </div>
          </CardContent>
        </Card> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Deliveries Section */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Próximos Prazos de Entrega</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cronograma de produção/entrega de orçamentos aprovados ou enviados
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : upcomingDeliveries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                <span>Nenhum prazo de entrega pendente no momento.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente / Projeto</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingDeliveries.map((q) => (
                      <TableRow key={q.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-foreground">{q.client.name}</div>
                          <div
                            className="text-xs text-muted-foreground truncate max-w-[200px]"
                            title={q.descriptiveText}
                          >
                            {q.descriptiveText}
                          </div>
                        </TableCell>
                        <TableCell>{q.category?.name || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-semibold">
                          {new Date(q.deliveryDate!).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={q.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Drafts Section */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Meus Rascunhos Pendentes</CardTitle>
              <p className="text-xs text-muted-foreground">
                Orçamentos iniciados por você que necessitam de precificação ou envio
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : myDrafts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                <span>Excelente! Você não possui nenhum rascunho pendente.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {myDrafts.map((q) => (
                  <div
                    key={q.id}
                    className="flex justify-between items-center p-3 rounded-lg border hover:border-primary/40 transition-colors bg-card"
                  >
                    <div className="space-y-1 max-w-[75%]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {q.client.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                          {q.category?.name || '—'}
                        </Badge>
                      </div>
                      <p
                        className="text-xs text-muted-foreground truncate"
                        title={q.descriptiveText}
                      >
                        {q.descriptiveText}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Criado em: {new Date(q.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(q.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/quotes/${q.id}/edit`)}
                      className="text-primary hover:text-primary-foreground hover:bg-primary/95 text-xs font-medium"
                    >
                      Editar Rascunho
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
