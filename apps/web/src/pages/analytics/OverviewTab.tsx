import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Target,
  Lock,
  CalendarDays as CalendarIcon,
  ToggleLeft,
  ToggleRight,
  AlertOctagon,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardMetrics } from '../../hooks/use-analytics';

interface OverviewTabProps {
  metrics?: DashboardMetrics;
  activeCategoryIndex: number | null;
  setActiveCategoryIndex: (index: number | null) => void;
  showCurrentYear: boolean;
  setShowCurrentYear: (show: boolean) => void;
  showStartYear: boolean;
  setShowStartYear: (show: boolean) => void;
}

const CATEGORY_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const chartConfig = {
  totalRevenue: {
    label: 'Receita',
  },
  quantidade: {
    label: 'Quantidade',
  },
  faturamento: {
    label: 'Faturamento Aprovado (R$)',
    color: '#10b981',
  },
  total: {
    label: 'Orçamentos Gerados',
    color: '#2563eb',
  },
  currentYear: {
    label: 'Ano Atual',
    color: '#10b981',
  },
  startYear: {
    label: 'Ano Anterior',
    color: '#8b5cf6',
  },
};

export function OverviewTab({
  metrics,
  activeCategoryIndex,
  setActiveCategoryIndex,
  showCurrentYear,
  setShowCurrentYear,
  showStartYear,
  setShowStartYear,
}: OverviewTabProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const hasFinancials = metrics?.monthlyTrends?.[0] && 'faturamento' in metrics.monthlyTrends[0];
  const hasRevenueByCategory = metrics?.revenueByCategory !== undefined;
  const hasSeasonal = metrics?.seasonalTrends !== undefined;

  const pieData =
    metrics?.revenueByCategory?.map((item) => ({
      name: item.categoryName,
      value: Number(item.totalRevenue),
    })) || [];

  const totalRevenueSum = pieData.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="space-y-6">
      {/* Evolução e Tendências (Últimos 6 Meses) */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <LineChart className="h-4.5 w-4.5 text-primary" />
              Evolução e Tendências (Últimos 6 Meses)
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico mensal de{' '}
              {hasFinancials ? 'faturamento líquido aprovado (Área Verde) comparado com a ' : ''}
              quantidade total de orçamentos gerados (Área Azul).
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            {hasFinancials && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded bg-emerald-500/20 border border-emerald-500 block" />
                <span className="text-muted-foreground">Faturamento Aprovado (Eixo Esq.)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded bg-blue-500/20 border border-blue-500 block" />
              <span className="text-muted-foreground">
                Orçamentos Criados ({hasFinancials ? 'Eixo Dir.' : 'Volume'})
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {metrics?.monthlyTrends && metrics.monthlyTrends.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ComposedChart
                data={metrics.monthlyTrends}
                margin={{ top: 15, right: -5, left: -20, bottom: 5 }}
              >
                <defs>
                  {hasFinancials && (
                    <linearGradient id="faturamentoTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  )}
                  <linearGradient id="volumeTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--muted)/0.3)"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                />
                {hasFinancials && (
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                )}
                <YAxis
                  yAxisId={hasFinancials ? 'right' : 'left'}
                  orientation={hasFinancials ? 'right' : 'left'}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--muted)/0.3)', strokeWidth: 1 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        if (payload && payload.length) {
                          return `Período: ${payload[0].payload.month}`;
                        }
                        return '';
                      }}
                    />
                  }
                />
                {/* Volume of created quotes represented as a smooth blue Area */}
                <Area
                  yAxisId={hasFinancials ? 'right' : 'left'}
                  type="monotone"
                  dataKey="total"
                  name="total"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#volumeTrend)"
                />
                {/* Approved Revenue represented as a smooth green Area */}
                {hasFinancials && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="faturamento"
                    name="faturamento"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#faturamentoTrend)"
                  />
                )}
              </ComposedChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
              Sem dados temporais suficientes disponíveis no momento.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Donut Revenue by Category & Radar Annual Seasonal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Revenue Distribution */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-primary" />
              Receita por Categoria de Processo
            </CardTitle>
            <CardDescription className="text-xs">
              Faturamento projetado segmentado pelos processos fabris e categorias.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] flex items-center justify-center pt-0">
            {!hasRevenueByCategory ? (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-2">
                <Lock className="h-8 w-8 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Acesso Restrito</span>
                <span className="text-[10px] text-muted-foreground leading-relaxed max-w-xs">
                  A distribuição de receita por categoria de processo é restrita a administradores.
                </span>
              </div>
            ) : pieData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground">
                Nenhum faturamento aprovado para segmentação.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-3/5 h-[260px] flex items-center justify-center">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveCategoryIndex(index)}
                        onMouseLeave={() => setActiveCategoryIndex(null)}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none"
                            strokeWidth={activeCategoryIndex === index ? 3 : 1}
                            stroke={
                              activeCategoryIndex === index
                                ? 'var(--color-background)'
                                : 'transparent'
                            }
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(Number(value))}
                            hideIndicator
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>

                  {/* Absolute Center Label Inside Donut */}
                  <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                    {activeCategoryIndex !== null ? (
                      <>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider max-w-[125px] truncate">
                          {pieData[activeCategoryIndex].name}
                        </span>
                        <span className="text-lg font-black text-foreground mt-0.5">
                          {formatCurrency(Number(pieData[activeCategoryIndex].value))}
                        </span>
                        <span className="text-[10px] text-primary font-bold">
                          {totalRevenueSum > 0
                            ? (
                                (Number(pieData[activeCategoryIndex].value) / totalRevenueSum) *
                                100
                              ).toFixed(1)
                            : 0}
                          % do total
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Receita Total
                        </span>
                        <span className="text-xl font-extrabold text-foreground mt-0.5">
                          {formatCurrency(metrics?.totalRevenueProjected ?? 0)}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80 mt-0.5 animate-pulse">
                          Passe o mouse
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Custom list legend */}
                <div className="w-full md:w-2/5 flex flex-col gap-2.5 pr-2 text-xs">
                  {pieData.map((item, index) => {
                    const valNum = Number(item.value);
                    const percentage =
                      totalRevenueSum > 0 ? ((valNum / totalRevenueSum) * 100).toFixed(1) : 0;
                    const isSelected = activeCategoryIndex === index;
                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setActiveCategoryIndex(index)}
                        onMouseLeave={() => setActiveCategoryIndex(null)}
                        className={`flex items-center justify-between gap-2 border-b border-dashed pb-1.5 last:border-0 last:pb-0 transition-colors duration-200 cursor-pointer p-1 rounded-sm ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-slate-900 border-solid border-slate-300'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-300"
                            style={{
                              backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                              transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                            }}
                          />
                          <span
                            className={`truncate transition-all ${
                              isSelected
                                ? 'font-bold text-primary'
                                : 'font-medium text-slate-700 dark:text-slate-300'
                            }`}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground">{percentage}%</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {formatCurrency(valNum)}
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

        {/* Radar Chart: Sazonalidade (Meses x Ano) */}
        <Card className="shadow-md border border-slate-100 dark:border-slate-800">
          <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarIcon className="h-4.5 w-4.5 text-primary" />
                Comparativo Sazonal Anual
              </CardTitle>
              <CardDescription className="text-xs">
                Faturamento aprovado distribuído por mês e ano para análise de sazonalidade.
              </CardDescription>
            </div>

            {/* Year Toggles */}
            {hasSeasonal && metrics?.seasonalTrends?.hasSeasonalData && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-md text-[10px] font-bold">
                <button
                  onClick={() => setShowStartYear(!showStartYear)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    showStartYear
                      ? 'bg-violet-500/15 text-violet-500'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {showStartYear ? (
                    <ToggleRight className="h-3.5 w-3.5" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5" />
                  )}
                  {metrics.seasonalTrends.startYear}
                </button>
                <button
                  onClick={() => setShowCurrentYear(!showCurrentYear)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    showCurrentYear
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {showCurrentYear ? (
                    <ToggleRight className="h-3.5 w-3.5" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5" />
                  )}
                  {metrics.seasonalTrends.currentYear}
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="h-[320px] flex items-center justify-center pt-0">
            {!hasSeasonal ? (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-2">
                <Lock className="h-8 w-8 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Acesso Restrito</span>
                <span className="text-[10px] text-muted-foreground leading-relaxed max-w-xs">
                  O comparativo de sazonalidade anual baseia-se em faturamento histórico e é
                  restrito a administradores.
                </span>
              </div>
            ) : metrics?.seasonalTrends?.hasSeasonalData ? (
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[250px] w-full"
              >
                <RadarChart data={metrics.seasonalTrends.data}>
                  <PolarGrid stroke="hsl(var(--muted)/0.5)" />
                  <PolarAngleAxis
                    dataKey="month"
                    tick={{
                      fill: 'var(--color-muted-foreground)',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />

                  {showStartYear && (
                    <Radar
                      name={`Ano ${metrics.seasonalTrends.startYear}`}
                      dataKey={metrics.seasonalTrends.startYear}
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.2}
                      isAnimationActive={true}
                    />
                  )}
                  {showCurrentYear && (
                    <Radar
                      name={`Ano ${metrics.seasonalTrends.currentYear}`}
                      dataKey={metrics.seasonalTrends.currentYear}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      isAnimationActive={true}
                    />
                  )}

                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                    content={
                      <ChartTooltipContent
                        formatter={(val, name) => [formatCurrency(Number(val)), `Ano ${name}`]}
                        hideIndicator
                      />
                    }
                  />
                </RadarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-2 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50 max-w-sm border-slate-200 dark:border-slate-800">
                <AlertOctagon className="h-8 w-8 text-amber-500 animate-bounce" />
                <span className="text-xs font-semibold text-foreground">
                  Dados Insuficientes para Comparativo
                </span>
                <span className="text-[10px] text-muted-foreground leading-relaxed">
                  Para gerar o gráfico de sazonalidade anual comparativa com overlays, são
                  necessários registros de faturamentos aprovados ao longo dos meses do ano anterior
                  e corrente.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
