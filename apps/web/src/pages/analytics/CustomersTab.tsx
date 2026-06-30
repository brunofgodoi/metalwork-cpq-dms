import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardMetrics } from '../../hooks/use-analytics';

interface CustomersTabProps {
  metrics?: DashboardMetrics;
  activeRejectionIndex: number | null;
  setActiveRejectionIndex: (index: number | null) => void;
}

const chartConfig = {
  totalRevenue: {
    label: 'Faturamento (R$)',
    color: 'var(--primary)',
  },
};

export function CustomersTab({
  metrics,
  activeRejectionIndex,
  setActiveRejectionIndex,
}: CustomersTabProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Tab Title Block */}
      <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Users className="h-5 w-5 text-primary" />
          Análise de Desempenho de Clientes
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visão consolidada de receitas por cliente, conversão de propostas e monitoramento de
          alertas de risco.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance por Cliente (Gráfico de faturamento) - spans 2 cols */}
        <Card className="lg:col-span-2 shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-primary" />
              Faturamento por Cliente (Top 5)
            </CardTitle>
            <CardDescription className="text-xs">
              Clientes com maior receita acumulada no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.topClients && metrics.topClients.length > 0 ? (
              <div className="space-y-6 relative">
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                  <defs>
                    <linearGradient id="clientRevenueGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop
                        offset="0%"
                        style={{ stopColor: 'var(--primary)', stopOpacity: 0.25 }}
                      />
                      <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                </svg>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={metrics.topClients.slice(0, 5)}
                    margin={{ top: 15, right: 0, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted)/0.3)"
                    />
                    <XAxis
                      dataKey="clientName"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{
                        fill: 'var(--color-muted-foreground)',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                      content={
                        <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                      }
                    />
                    <Bar
                      dataKey="totalRevenue"
                      fill="url(#clientRevenueGrad)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">
                Nenhum dado de faturamento disponível no período.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card: Clientes sob Alerta de Risco (Perdas) */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800 bg-linear-to-br from-slate-50/50 to-transparent dark:from-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              Alertas de Risco
            </CardTitle>
            <CardDescription className="text-xs">
              Clientes com maior índice de orçamentos perdidos (recusados/cancelados).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2 pb-2 flex flex-col justify-between">
            {!metrics?.topLossClients || metrics.topLossClients.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                Nenhum alerta de perda identificado.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-[250px] pr-1">
                {metrics.topLossClients.map((item, index) => {
                  const getAlertStyle = (rate: number, count: number) => {
                    if (rate >= 50 && count >= 2) {
                      return {
                        label: `${rate}% Recusa`,
                        badgeClass:
                          'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 font-bold',
                      };
                    }
                    if (rate >= 35) {
                      return {
                        label: `${rate}% Recusa`,
                        badgeClass:
                          'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/30 dark:border-orange-950/30 font-semibold',
                      };
                    }
                    if (rate >= 20) {
                      return {
                        label: `${rate}% Recusa`,
                        badgeClass:
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/30 dark:border-amber-950/30 font-medium',
                      };
                    }
                    return {
                      label: `${rate}% Recusa`,
                      badgeClass:
                        'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200/30 dark:border-slate-800/50',
                    };
                  };

                  const style = getAlertStyle(item.lossRate, item.count);
                  const isSelected = activeRejectionIndex === index;

                  return (
                    <div
                      key={item.clientName}
                      onMouseEnter={() => setActiveRejectionIndex(index)}
                      onMouseLeave={() => setActiveRejectionIndex(null)}
                      className={`flex items-center justify-between border-b border-dashed pb-1.5 last:border-0 last:pb-0 transition-colors p-0.5 rounded-sm ${
                        isSelected
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {item.clientName}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {item.rejections} rej. / {item.cancellations} canc.
                        </div>
                      </div>
                      <Badge className={`${style.badgeClass} shrink-0 text-[9px] py-0.5 px-1.5`}>
                        {style.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clientes Ranking Table */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-primary" />
            Métricas Detalhadas por Cliente
          </CardTitle>
          <CardDescription className="text-xs">
            Lista completa de clientes ordenada por faturamento com contagem de orçamentos e
            conversão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.topClients && metrics.topClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left font-bold text-muted-foreground py-2.5 pr-4">
                      Cliente
                    </th>
                    <th className="text-right font-bold text-muted-foreground py-2.5 px-2">
                      Orçamentos Gerados
                    </th>
                    <th className="text-right font-bold text-muted-foreground py-2.5 px-2">
                      Orçamentos Aprovados
                    </th>
                    <th className="text-right font-bold text-muted-foreground py-2.5 px-2">
                      Taxa de Conversão
                    </th>
                    <th className="text-right font-bold text-muted-foreground py-2.5 pl-2">
                      Faturamento Líquido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topClients.map((client) => (
                    <tr
                      key={client.clientId}
                      className="border-b border-slate-100 dark:border-slate-900 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-semibold text-foreground truncate max-w-[250px]">
                        {client.clientName}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.totalQuotes}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.approvedQuotes}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`font-bold ${client.conversionRate >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {client.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right font-bold text-foreground">
                        {formatCurrency(client.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">
              Nenhum dado de cliente disponível no período.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
