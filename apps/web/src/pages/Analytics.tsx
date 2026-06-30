import { useAnalytics } from '../hooks/use-analytics';
import { AnalyticsFilters } from './analytics/AnalyticsFilters';
import { AnalyticsSummary } from './analytics/AnalyticsSummary';
import { OverviewTab } from './analytics/OverviewTab';
import { ProcessTab } from './analytics/ProcessTab';
import { EfficiencyTab } from './analytics/EfficiencyTab';
import { CustomersTab } from './analytics/CustomersTab';
import { QuoteFlowTab } from './analytics/QuoteFlowTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileBarChart2 } from 'lucide-react';

export function Analytics() {
  const {
    filters,
    setFilters,
    metrics,
    isLoading,
    isFetching,
    exportCsv,
    activeCategoryIndex,
    setActiveCategoryIndex,
    activeRejectionIndex,
    setActiveRejectionIndex,
    activeCancellationIndex,
    setActiveCancellationIndex,
    showCurrentYear,
    setShowCurrentYear,
    showStartYear,
    setShowStartYear,
  } = useAnalytics();

  if (isLoading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-medium">Carregando painel analítico de BI...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Title / Header */}
      <div className="border-b pb-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-8 w-8 text-primary" />
            Business Intelligence (BI) e Analytics
            {isFetching && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/30 animate-pulse ml-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Atualizando...
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel consolidado para tomada de decisão estratégica: faturamento, conversão e
            tendências comerciais.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <AnalyticsFilters filters={filters} onChange={setFilters} onExportCsv={exportCsv} />

      {/* Main KPI Cards Grid & Tabs Layout wrapper with opacity fade on fetch */}
      <div
        className={`space-y-6 transition-opacity duration-300 ${isFetching ? 'opacity-70' : 'opacity-100'}`}
      >
        {/* Main KPI Cards Grid */}
        <AnalyticsSummary metrics={metrics} />

        {/* Tabs Layout */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl h-10">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="processes">Processos</TabsTrigger>
            <TabsTrigger value="losses">Perdas</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="flow">Fluxo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 focus:outline-none">
            <OverviewTab
              metrics={metrics}
              activeCategoryIndex={activeCategoryIndex}
              setActiveCategoryIndex={setActiveCategoryIndex}
              showCurrentYear={showCurrentYear}
              setShowCurrentYear={setShowCurrentYear}
              showStartYear={showStartYear}
              setShowStartYear={setShowStartYear}
            />
          </TabsContent>

          <TabsContent value="processes" className="space-y-6 focus:outline-none">
            <ProcessTab metrics={metrics} />
          </TabsContent>

          <TabsContent value="losses" className="space-y-6 focus:outline-none">
            <EfficiencyTab
              metrics={metrics}
              activeRejectionIndex={activeRejectionIndex}
              setActiveRejectionIndex={setActiveRejectionIndex}
              activeCancellationIndex={activeCancellationIndex}
              setActiveCancellationIndex={setActiveCancellationIndex}
            />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6 focus:outline-none">
            <CustomersTab
              metrics={metrics}
              activeRejectionIndex={activeRejectionIndex}
              setActiveRejectionIndex={setActiveRejectionIndex}
            />
          </TabsContent>

          <TabsContent value="flow" className="space-y-6 focus:outline-none">
            <QuoteFlowTab filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
