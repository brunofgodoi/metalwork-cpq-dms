import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardMetrics } from '../../hooks/use-analytics';

interface EfficiencyTabProps {
  metrics?: DashboardMetrics;
  activeRejectionIndex: number | null;
  setActiveRejectionIndex: (index: number | null) => void;
  activeCancellationIndex: number | null;
  setActiveCancellationIndex: (index: number | null) => void;
}

const REJECTION_COLORS = [
  '#ef4444', // Red
  '#f87171', // Light Red
  '#fca5a5', // Soft Red
  '#fecaca', // Extra Soft Red
  '#fee2e2', // Border Red
];

const chartConfig = {
  faturamento: {
    label: 'Faturamento Aprovado (R$)',
    color: '#10b981',
  },
};

export function EfficiencyTab({
  metrics,
  activeRejectionIndex,
  setActiveRejectionIndex,
  activeCancellationIndex,
  setActiveCancellationIndex,
}: EfficiencyTabProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const targetRate = metrics?.targetApprovalRate ?? 60;
  const totalRejections = metrics?.topRejectionReasons.reduce((acc, r) => acc + r.count, 0) || 0;

  const rejectionPieData =
    metrics?.topRejectionReasons.map((item) => ({
      name: item.reason,
      value: item.count,
    })) || [];

  const totalRejectionSum = rejectionPieData.reduce((sum, d) => sum + d.value, 0);
  const hasFinancials = metrics?.totalRevenueProjected !== undefined;

  return (
    <div className="space-y-6">
      {/* Title block for advanced losses */}
      <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <AlertOctagon className="h-5 w-5 text-red-500" />
          Auditoria de Perdas e Eficiência Comercial
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Análise de motivos de rejeição, gargalos em cancelamentos de ordens e alertas de risco por
          cliente.
        </p>
      </div>

      {/* Grid of 2 Cards: Rejection Reasons, Cancellation Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Motivos de Rejeição (Bar Chart) */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertOctagon className="h-4.5 w-4.5 text-red-500" />
              Motivos de Rejeição
            </CardTitle>
            <CardDescription className="text-xs">
              Principais motivos para recusa de orçamentos (Total: {totalRejections}).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center pt-0">
            {rejectionPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                Nenhum orçamento rejeitado cadastrado.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-between gap-2">
                <div className="w-full md:w-1/2 h-[220px] flex items-center justify-center">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart
                      layout="vertical"
                      data={rejectionPieData}
                      margin={{ top: 10, right: 10, left: -30, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        vertical
                        stroke="hsl(var(--muted)/0.3)"
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={false}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [`${value} orçamentos`, 'Quantidade']}
                            hideIndicator
                          />
                        }
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                        onMouseEnter={(_, index) => setActiveRejectionIndex(index)}
                        onMouseLeave={() => setActiveRejectionIndex(null)}
                      >
                        {rejectionPieData.map((_entry, index) => (
                          <Cell
                            key={`rejection-cell-${index}`}
                            fill={REJECTION_COLORS[index % REJECTION_COLORS.length]}
                            className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Custom Legend */}
                <div className="w-full md:w-1/2 flex flex-col gap-1.5 pr-1 text-[11px] overflow-y-auto max-h-[220px]">
                  {rejectionPieData.map((item, index) => {
                    const percentage =
                      totalRejectionSum > 0
                        ? ((item.value / totalRejectionSum) * 100).toFixed(0)
                        : 0;
                    const isSelected = activeRejectionIndex === index;
                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setActiveRejectionIndex(index)}
                        onMouseLeave={() => setActiveRejectionIndex(null)}
                        className={`flex items-center justify-between gap-1.5 border-b border-dashed pb-1 last:border-0 last:pb-0 transition-colors duration-200 cursor-pointer p-0.5 rounded-sm ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-slate-900 border-solid border-slate-300'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300"
                            style={{
                              backgroundColor: REJECTION_COLORS[index % REJECTION_COLORS.length],
                              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                            }}
                          />
                          <span
                            className={`truncate transition-all ${
                              isSelected
                                ? 'font-bold text-red-500'
                                : 'font-medium text-slate-700 dark:text-slate-300'
                            }`}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 font-bold text-foreground">
                          {item.value}{' '}
                          <span className="text-[9px] text-muted-foreground font-normal">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Impacto Material nos Cancelamentos (Donut Chart) */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800 bg-linear-to-br from-slate-50/50 to-transparent dark:from-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              Impacto de Cancelamentos
            </CardTitle>
            <CardDescription className="text-xs">
              Proporção de cancelamentos com perda material.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center pt-0">
            {!metrics?.cancellationStats || metrics.cancellationStats.totalCanceled === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                Nenhum cancelamento registrado.
              </div>
            ) : (
              (() => {
                const totalCanceled = metrics.cancellationStats.totalCanceled;
                const withLoss = metrics.cancellationStats.canceledWithLoss;
                const withoutLoss = metrics.cancellationStats.canceledWithoutLoss;

                if (totalCanceled > 0 && withLoss === 0 && withoutLoss === 0) {
                  return (
                    <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                      Nenhum cancelamento com informação de produção.
                    </div>
                  );
                }

                const cancelData = [
                  { name: 'Com Produção (Desperdício)', value: withLoss, color: '#f43f5e' },
                  { name: 'Sem Produção (Comercial)', value: withoutLoss, color: '#10b981' },
                ];

                return (
                  <div className="w-full h-full flex flex-col justify-between gap-2">
                    {/* Donut Chart */}
                    <div className="relative w-full h-[160px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cancelData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                            onMouseEnter={(_, index) => setActiveCancellationIndex(index)}
                            onMouseLeave={() => setActiveCancellationIndex(null)}
                          >
                            {cancelData.map((entry, index) => (
                              <Cell
                                key={`cell-cancel-${index}`}
                                fill={entry.color}
                                stroke="transparent"
                                className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Inside Label */}
                      <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                        {activeCancellationIndex !== null ? (
                          <>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider max-w-[100px] truncate">
                              {activeCancellationIndex === 0 ? 'Com Produção' : 'Sem Produção'}
                            </span>
                            <span className="text-lg font-extrabold text-foreground mt-0.5">
                              {cancelData[activeCancellationIndex].value}
                            </span>
                            <span className="text-[9px] text-primary font-bold">
                              {(
                                (cancelData[activeCancellationIndex].value / totalCanceled) *
                                100
                              ).toFixed(0)}
                              %
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                              Cancelados
                            </span>
                            <span className="text-xl font-black text-foreground mt-0.5">
                              {totalCanceled}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="w-full flex flex-col gap-1.5 px-2 text-[11px]">
                      {cancelData.map((item, index) => {
                        const percentage =
                          totalCanceled > 0 ? ((item.value / totalCanceled) * 100).toFixed(0) : 0;
                        const isSelected = activeCancellationIndex === index;
                        return (
                          <div
                            key={item.name}
                            onMouseEnter={() => setActiveCancellationIndex(index)}
                            onMouseLeave={() => setActiveCancellationIndex(null)}
                            className={`flex items-center justify-between gap-2 border-b border-dashed pb-1 last:border-0 last:pb-0 transition-colors duration-200 cursor-pointer p-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-slate-50 dark:bg-slate-900 border-solid border-slate-300'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300"
                                style={{
                                  backgroundColor: item.color,
                                  transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                }}
                              />
                              <span
                                className={`truncate transition-all ${
                                  isSelected ? 'font-bold text-foreground' : 'text-muted-foreground'
                                }`}
                              >
                                {index === 0 ? 'Com Produção' : 'Sem Produção'}
                              </span>
                            </div>
                            <div className="text-right shrink-0 font-bold text-foreground">
                              {item.value}{' '}
                              <span className="text-[9px] text-muted-foreground font-normal">
                                ({percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Block */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800 bg-linear-to-br from-slate-50/50 to-transparent dark:from-slate-900/50">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Resumo Estratégico de Performance Comercial
          </CardTitle>
        </CardHeader>
        <CardContent
          className={`grid grid-cols-1 gap-6 divide-y sm:divide-y-0 sm:divide-x dark:divide-slate-800 ${
            hasFinancials ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          }`}
        >
          {hasFinancials && (
            <div className="flex flex-col gap-1 pr-6">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Ticket Médio Aprovado
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {metrics?.totalApproved && metrics.totalApproved > 0
                  ? formatCurrency((metrics.totalRevenueProjected ?? 0) / metrics.totalApproved)
                  : formatCurrency(0)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Valor médio faturado por orçamento aceito.
              </span>
            </div>
          )}

          <div className={`flex flex-col gap-1 pt-4 sm:pt-0 ${hasFinancials ? 'sm:px-6' : 'pr-6'}`}>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Aproveitamento Comercial
            </span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-1">
              {metrics?.approvalRate != null ? `${metrics.approvalRate}%` : '0%'}
              {metrics?.approvalRate && metrics.approvalRate >= targetRate ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 hover:bg-emerald-500/10 text-[10px] py-0.5 font-bold">
                  Meta Atingida
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 hover:bg-amber-500/10 text-[10px] py-0.5 font-bold">
                  Abaixo da Meta
                </Badge>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Proporção de negócios aprovados sobre o total processado contra meta de {targetRate}%.
            </span>
          </div>

          <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:px-6">
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Indicador de Perdas de Lead
            </span>
            <span className="text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-2 mt-1">
              {totalRejections}
              <span className="text-xs font-normal text-muted-foreground">rejeições</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Orçamentos descartados que requerem acompanhamento corretivo.
            </span>
          </div>

          <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6">
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Perdas por Cancelamento
            </span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-2 mt-1">
              {metrics?.cancellationStats?.totalCanceled ?? 0}
              <span className="text-xs font-normal text-muted-foreground">cancelados</span>
            </span>
            <div className="text-[10px] text-muted-foreground mt-1 space-y-1">
              <div className="flex justify-between">
                <span>Com perda de material:</span>
                <span className="font-bold text-rose-500">
                  {metrics?.cancellationStats?.canceledWithLoss ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sem perda de material:</span>
                <span className="font-bold text-emerald-500">
                  {metrics?.cancellationStats?.canceledWithoutLoss ?? 0}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
