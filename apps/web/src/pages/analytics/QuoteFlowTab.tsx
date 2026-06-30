import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuoteFlowMetrics } from '../../hooks/use-analytics';
import type { AnalyticsFilters } from '../../hooks/use-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Loader2,
  GitPullRequest,
  ArrowRight,
  RefreshCw,
  Clock,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface QuoteFlowTabProps {
  filters: AnalyticsFilters;
}

const chartConfig = {
  averageMargin: {
    label: 'Margem Média (%)',
    color: '#8b5cf6',
  },
};

export function QuoteFlowTab({ filters }: QuoteFlowTabProps) {
  const { data: flowMetrics, isLoading, isError } = useQuoteFlowMetrics(filters);

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs">Carregando métricas de fluxo...</span>
      </div>
    );
  }

  if (isError || !flowMetrics) {
    return (
      <div className="h-[300px] flex items-center justify-center text-xs text-red-500">
        Falha ao carregar as métricas de fluxo de orçamentos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Title Block */}
      <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <GitPullRequest className="h-5 w-5 text-violet-500" />
          Métricas de Fluxo e Negociação de Orçamentos
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Análise de tempos de tramitação entre estágios, revisões de propostas, deltas de
          negociação de preço e margens de produto.
        </p>
      </div>

      {/* Timeline Row (Average Days between stages) */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-violet-500" />
            Tempo Médio de Tramitação entre Estágios
          </CardTitle>
          <CardDescription className="text-xs">
            Média de dias decorridos para transição de status (Criação ➔ Envio ao Cliente ➔
            Aprovação Comercial).
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 max-w-3xl mx-auto py-4">
            {/* Stage 1: Criado */}
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">DRAFT</span>
              </div>
              <span className="text-xs font-bold text-foreground mt-2">Criação / Rascunho</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Setup de itens e custos
              </span>
            </div>

            {/* Transition 1 -> 2 */}
            <div className="flex flex-col items-center flex-1 min-w-[120px] relative py-2 md:py-0 w-full md:w-auto">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 mb-1">
                {flowMetrics.avgDaysCreateToSent}{' '}
                {flowMetrics.avgDaysCreateToSent === 1 ? 'dia' : 'dias'}
              </span>
              <div className="w-full flex items-center justify-center">
                <div className="h-[2px] bg-linear-to-r from-slate-200 via-violet-300 to-slate-200 dark:from-slate-800 dark:via-violet-950 dark:to-slate-800 flex-1" />
                <ArrowRight className="h-4 w-4 text-violet-500 shrink-0 mx-1 absolute md:relative right-1/2 md:right-auto translate-x-1/2 md:translate-x-0" />
              </div>
              <span className="text-[9px] text-muted-foreground mt-1">Elaboração Comercial</span>
            </div>

            {/* Stage 2: Enviado */}
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border-2 border-blue-500/30 shadow-xs">
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">SENT</span>
              </div>
              <span className="text-xs font-bold text-foreground mt-2">Enviado</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Proposta formal sob análise
              </span>
            </div>

            {/* Transition 2 -> 3 */}
            <div className="flex flex-col items-center flex-1 min-w-[120px] relative py-2 md:py-0 w-full md:w-auto">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                {flowMetrics.avgDaysSentToApproved}{' '}
                {flowMetrics.avgDaysSentToApproved === 1 ? 'dia' : 'dias'}
              </span>
              <div className="w-full flex items-center justify-center">
                <div className="h-[2px] bg-linear-to-r from-slate-200 via-emerald-300 to-slate-200 dark:from-slate-800 dark:via-emerald-950 dark:to-slate-800 flex-1" />
                <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0 mx-1 absolute md:relative right-1/2 md:right-auto translate-x-1/2 md:translate-x-0" />
              </div>
              <span className="text-[9px] text-muted-foreground mt-1">Negociação / Decisão</span>
            </div>

            {/* Stage 3: Aprovado */}
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/40 shadow-sm">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  OK
                </span>
              </div>
              <span className="text-xs font-bold text-foreground mt-2">Aprovado</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Pedido adjudicado / fechado
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Metric 1: Revisões Médias */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-violet-500" />
              Média de Revisões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black text-foreground">
              {flowMetrics.avgRevisionsPerQuote}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Média de snapshots/revisões geradas por orçamento comercial ativo.
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Taxa de Conversão */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-emerald-500" />
              Conversão de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatPercent(flowMetrics.conversionRate)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Taxa de sucesso na transição de orçamentos enviados (SENT) para aprovados (APPROVED).
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Delta Estimativa ➔ Oferta */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              Margem de Negócio (Sug. ➔ Of.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`text-3xl font-black ${flowMetrics.avgDeltaEstToPrice >= 0 ? 'text-amber-500' : 'text-emerald-500'}`}
            >
              {flowMetrics.avgDeltaEstToPrice >= 0 ? `+` : ''}
              {flowMetrics.avgDeltaEstToPrice.toFixed(1)}%
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Variação percentual média da estimativa de criação (`estimatedPrice`) para o preço
              formal enviado (`price`).
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Delta Oferta ➔ Contrato */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              Desconto Comercial (Of. ➔ Contr.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`text-3xl font-black ${flowMetrics.avgDeltaPriceToContracted >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {flowMetrics.avgDeltaPriceToContracted >= 0 ? `+` : ''}
              {flowMetrics.avgDeltaPriceToContracted.toFixed(1)}%
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Variação percentual média do preço formal enviado (`price`) para o preço contratado de
              aprovação (`contractedPrice`).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Margem por Categoria Chart */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-violet-500" />
            Margem de Contribuição Comercial por Categoria
          </CardTitle>
          <CardDescription className="text-xs">
            Margem média real praticada em orçamentos fechados ou ofertados segmentada por categoria
            produtiva.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {flowMetrics.marginByCategory && flowMetrics.marginByCategory.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <BarChart
                data={flowMetrics.marginByCategory}
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="flowMarginGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.25 }} />
                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--muted)/0.3)"
                />
                <XAxis
                  dataKey="categoryName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Margem Média']}
                    />
                  }
                />
                <Bar
                  dataKey="averageMargin"
                  fill="url(#flowMarginGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem dados de margem de categoria cadastrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
