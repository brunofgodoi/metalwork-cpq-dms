import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface RejectionReason {
  reason: string;
  count: number;
}

export interface RevenueCategory {
  categoryName: string;
  totalRevenue: number;
}

export interface MonthlyTrend {
  month: string;
  faturamento: number;
  total: number;
  aprovados: number;
}

export interface CategoryPerformance {
  subject: string;
  Aprovacao: number;
}

export interface SeasonalTrends {
  hasSeasonalData: boolean;
  currentYear: number;
  startYear: number;
  data: Array<{
    month: string;
    [year: number]: number;
  }>;
}

export interface CancellationStats {
  totalCanceled: number;
  canceledWithLoss: number;
  canceledWithoutLoss: number;
}

export interface RejectionsByCategory {
  categoryName: string;
  count: number;
}

export interface TopClient {
  clientId: string;
  clientName: string;
  totalQuotes: number;
  approvedQuotes: number;
  conversionRate: number;
  totalRevenue: number;
}

export interface TopLossClient {
  clientName: string;
  count: number;
  rejections: number;
  cancellations: number;
  lossRate: number;
}

export interface DashboardMetrics {
  totalRevenueProjected?: number;
  totalCostProjected: number;
  totalProfitProjected: number;
  averageMarginProjected: number;
  approvalRate: number;
  totalProcessed: number;
  totalApproved: number;
  topRejectionReasons: RejectionReason[];
  revenueByCategory?: RevenueCategory[];
  monthlyTrends: MonthlyTrend[];
  categoryPerformance: CategoryPerformance[];
  targetApprovalRate: number;
  seasonalTrends: SeasonalTrends;
  cancellationStats: CancellationStats;
  rejectionsByCategory: RejectionsByCategory[];
  topLossClients: TopLossClient[];
  topClients: TopClient[];
}

export interface AnalyticsFilters {
  period?: 'month' | 'year' | 'all';
  clientId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export function useAnalytics() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'month',
    clientId: '',
    categoryId: '',
    startDate: '',
    endDate: '',
  });

  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [activeRejectionIndex, setActiveRejectionIndex] = useState<number | null>(null);
  const [activeCancellationIndex, setActiveCancellationIndex] = useState<number | null>(null);

  // Visibility toggles for seasonal comparison years
  const [showCurrentYear, setShowCurrentYear] = useState(true);
  const [showStartYear, setShowStartYear] = useState(true);

  // Query parameters builder
  const buildQueryParams = (f: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (f.period) params.append('period', f.period);
    if (f.clientId) params.append('clientId', f.clientId);
    if (f.categoryId) params.append('categoryId', f.categoryId);
    if (f.startDate) params.append('startDate', f.startDate);
    if (f.endDate) params.append('endDate', f.endDate);
    return params.toString();
  };

  const queryKey = ['admin-analytics', filters];

  const {
    data: metrics,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<DashboardMetrics>({
    queryKey,
    queryFn: async () => {
      const queryString = buildQueryParams(filters);
      const response = await api.get(`/analytics/dashboard?${queryString}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    try {
      const queryString = buildQueryParams(filters);
      const response = await api.get(`/analytics/export?${queryString}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `relatorio_analytics_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Falha ao exportar CSV', err);
    }
  };

  return {
    filters,
    setFilters,
    metrics,
    isLoading,
    isError,
    error,
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
  };
}

export interface CategoryMargin {
  categoryName: string;
  averageMargin: number;
}

export interface QuoteFlowMetrics {
  avgDaysCreateToSent: number;
  avgDaysSentToApproved: number;
  avgRevisionsPerQuote: number;
  avgDeltaEstToPrice: number;
  avgDeltaPriceToContracted: number;
  conversionRate: number;
  marginByCategory: CategoryMargin[];
}

export function useQuoteFlowMetrics(filters: AnalyticsFilters) {
  const buildQueryParams = (f: AnalyticsFilters) => {
    const params = new URLSearchParams();
    if (f.period) params.append('period', f.period);
    if (f.clientId) params.append('clientId', f.clientId);
    if (f.startDate) params.append('startDate', f.startDate);
    if (f.endDate) params.append('endDate', f.endDate);
    return params.toString();
  };

  const queryKey = ['admin-analytics-flow', filters];

  return useQuery<QuoteFlowMetrics>({
    queryKey,
    queryFn: async () => {
      const queryString = buildQueryParams(filters);
      const response = await api.get(`/analytics/quote-flow?${queryString}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}
