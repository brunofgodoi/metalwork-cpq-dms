import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { TrendingUp, DollarSign, ClipboardList, Award, Target, Lock } from 'lucide-react';
import type { DashboardMetrics } from '../../hooks/use-analytics';

interface AnalyticsSummaryProps {
  metrics?: DashboardMetrics;
}

export function AnalyticsSummary({ metrics }: AnalyticsSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const targetRate = metrics?.targetApprovalRate ?? 60;
  const totalRejections = metrics?.topRejectionReasons.reduce((acc, r) => acc + r.count, 0) || 0;

  const hasFinancials = metrics?.totalRevenueProjected !== undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      {hasFinancials ? (
        <>
          {/* Financial highlight (Faturamento Projetado) */}
          <Card className="md:col-span-2 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-linear-to-br from-emerald-600 to-teal-700 text-white dark:from-emerald-700 dark:to-teal-900 border-none">
            <CardHeader className="py-4">
              <CardDescription className="text-xs font-bold text-emerald-100/90 uppercase tracking-wider">
                Faturamento Aprovado Projetado
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex items-baseline justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {formatCurrency(metrics?.totalRevenueProjected ?? 0)}
                  </h2>
                  <p className="text-xs text-emerald-100/70">
                    Receita total somada de todos os orçamentos no status{' '}
                    <span className="font-bold text-white">Aprovado</span>
                  </p>
                </div>
                <div className="p-3.5 bg-white/10 text-white rounded-2xl">
                  <DollarSign className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20" />
          </Card>

          {/* Card 2: Custo de Fabricação Projetado */}
          <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-linear-to-br from-amber-500/5 via-transparent to-transparent">
            <CardHeader className="py-4 pb-2">
              <CardDescription className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Custo Estimado Projetado
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(metrics?.totalCostProjected ?? 0)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Custo de fabricação estimado</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Lucro Estimado Projetado */}
          <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-linear-to-br from-indigo-500/5 via-transparent to-transparent">
            <CardHeader className="py-4 pb-2">
              <CardDescription className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Lucro Bruto Projetado
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(metrics?.totalProfitProjected ?? 0)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Faturamento menos custos</p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Restricted Access card if not admin */
        <Card className="md:col-span-4 relative overflow-hidden shadow-sm border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/20 p-6 flex flex-col justify-center items-center text-center gap-2">
          <Lock className="h-8 w-8 text-amber-500" />
          <h3 className="text-sm font-bold text-foreground">Métricas Financeiras Restritas</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Informações sobre faturamento, custos e lucro bruto são de acesso exclusivo para
            administradores. Contate o gerente do sistema para obter autorização.
          </p>
        </Card>
      )}

      {/* Card 4: Orçamentos Processados */}
      <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-linear-to-br from-blue-500/5 via-transparent to-transparent">
        <CardHeader className="py-4 pb-2">
          <CardDescription className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Orçamentos Processados
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {metrics?.totalProcessed ?? 0}
              </h3>
              <p className="text-[10px] text-muted-foreground">Total no período</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-3 border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics?.totalApproved ?? 0} Aprovados
            </span>
            <span>•</span>
            <span className="font-semibold text-red-500">{totalRejections} Rejeitados</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Taxa de Aprovação */}
      <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-linear-to-br from-violet-500/5 via-transparent to-transparent">
        <CardHeader className="py-4 pb-2">
          <CardDescription className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
            Taxa de Aprovação
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {metrics?.approvalRate != null ? `${metrics.approvalRate}%` : '0%'}
              </h3>
            </div>
            <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t pt-3 border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Meta Comercial: {targetRate}%</span>
              <span className="font-bold text-foreground">{metrics?.approvalRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics?.approvalRate ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 6: Margem de Lucro Média */}
      {hasFinancials && (
        <Card className="md:col-span-2 shadow-sm border border-slate-100 dark:border-slate-800 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-linear-to-br from-rose-500/5 via-transparent to-transparent">
          <CardHeader className="py-4 pb-2">
            <CardDescription className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Margem de Lucro Média
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  {metrics?.averageMarginProjected != null
                    ? `${metrics.averageMarginProjected.toFixed(1)}%`
                    : '0%'}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Margem comercial média obtida sobre vendas aprovadas
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <Target className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-1.5 border-t pt-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Mínimo Recomendado: 20.0%</span>
                <span className="font-bold text-foreground">
                  {metrics?.averageMarginProjected?.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (metrics?.averageMarginProjected ?? 0) >= 20 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(Math.max(metrics?.averageMarginProjected ?? 0, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
