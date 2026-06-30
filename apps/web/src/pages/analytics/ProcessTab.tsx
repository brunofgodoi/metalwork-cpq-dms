import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, FileBarChart2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardMetrics } from '../../hooks/use-analytics';

interface ProcessTabProps {
  metrics?: DashboardMetrics;
}

const REJECTION_COLORS = [
  '#ef4444', // Red
  '#f87171', // Light Red
  '#fca5a5', // Soft Red
  '#fecaca', // Extra Soft Red
  '#fee2e2', // Border Red
];

const chartConfig = {
  Aprovacao: {
    label: 'Aprovação (%)',
    color: '#8b5cf6',
  },
};

export function ProcessTab({ metrics }: ProcessTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar Chart: Category Performance Conversion */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-violet-500" />
            Eficiência Comercial por Categoria
          </CardTitle>
          <CardDescription className="text-xs">
            Taxa de aceitação e aprovação de propostas (%) mapeada por categoria fabril.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center pt-0">
          {metrics?.categoryPerformance && metrics.categoryPerformance.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px] w-full"
            >
              <RadarChart data={metrics.categoryPerformance}>
                <PolarGrid stroke="hsl(var(--muted)/0.5)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fill: 'var(--color-muted-foreground)',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
                />
                <Radar
                  name="Taxa de Aprovação"
                  dataKey="Aprovacao"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                  isAnimationActive={true}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(val) => [`${val}%`, 'Aprovação']}
                      hideIndicator
                    />
                  }
                />
              </RadarChart>
            </ChartContainer>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              Nenhum dado de conversão por categoria cadastrado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card: Rejeições por Categoria de Processo */}
      <Card className="shadow-md border border-slate-100 dark:border-slate-800 bg-linear-to-br from-slate-50/50 to-transparent dark:from-slate-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileBarChart2 className="h-4.5 w-4.5 text-red-500" />
            Rejeições por Categoria de Processo
          </CardTitle>
          <CardDescription className="text-xs">
            Categorias fabris com maior incidência de orçamentos rejeitados no período.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center pt-0">
          {!metrics?.rejectionsByCategory || metrics.rejectionsByCategory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
              Nenhuma rejeição registrada por categoria no período selecionado.
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center gap-4">
              <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 w-full">
                {metrics.rejectionsByCategory.map((item, index) => {
                  const maxCount = Math.max(...metrics.rejectionsByCategory.map((r) => r.count), 1);
                  const percentOfMax = (item.count / maxCount) * 100;
                  return (
                    <div key={item.categoryName} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span
                          className="font-semibold text-foreground truncate max-w-[200px]"
                          title={item.categoryName}
                        >
                          {item.categoryName}
                        </span>
                        <span className="font-bold text-red-500">{item.count} rejeitados</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentOfMax}%`,
                            backgroundColor: REJECTION_COLORS[index % REJECTION_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
