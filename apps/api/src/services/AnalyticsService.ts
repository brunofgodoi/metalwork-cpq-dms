import { prisma } from '../lib/prisma';
import { ConfigService } from './ConfigService';

export interface AnalyticsFilters {
  period?: string;
  clientId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export class AnalyticsService {
  async getDashboardMetrics(filters: AnalyticsFilters = {}) {
    // 0. Build dateFilter
    let dateFilter: any = undefined;

    if (filters.startDate || filters.endDate) {
      dateFilter = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    } else {
      let periodStartDate: Date | undefined = new Date();
      periodStartDate.setHours(0, 0, 0, 0);

      const period = filters.period || 'month';
      if (period === 'month') {
        periodStartDate.setDate(1);
      } else if (period === 'year') {
        periodStartDate.setMonth(0);
        periodStartDate.setDate(1);
      } else if (period === 'all') {
        periodStartDate = undefined; // No date filter
      } else {
        periodStartDate.setDate(1);
      }

      if (periodStartDate) {
        dateFilter = { gte: periodStartDate };
      }
    }

    const clientFilter = filters.clientId || undefined;

    // 1. Projected revenue and costs (sum of all APPROVED quotes in the selected period)
    const approvedQuotesData = await prisma.quote.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      select: {
        price: true,
        contractedPrice: true,
        estimatedPrice: true,
      },
    });

    let totalRevenueProjected = 0;
    let totalCostProjected = 0;

    approvedQuotesData.forEach((q) => {
      const rev = Number(q.contractedPrice ?? q.price ?? 0);
      const cost = Number(q.estimatedPrice ?? 0);
      totalRevenueProjected += rev;
      totalCostProjected += cost;
    });

    const totalProfitProjected = totalRevenueProjected - totalCostProjected;
    const averageMarginProjected =
      totalRevenueProjected > 0 ? (totalProfitProjected / totalRevenueProjected) * 100 : 0;

    // 2. Approval Rate (% Approval - Processed includes CANCELED in the selected period)
    const totalProcessed = await prisma.quote.count({
      where: {
        status: { in: ['APPROVED', 'REJECTED', 'SENT', 'CANCELED'] },
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    const totalApproved = await prisma.quote.count({
      where: {
        status: 'APPROVED',
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    const approvalRate = totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0;

    // 3. Rejection reasons ranking (Top 5 in the selected period)
    const rejectionReasons = await prisma.quote.groupBy({
      by: ['rejectionReason'],
      _count: { rejectionReason: true },
      where: {
        status: 'REJECTED',
        isActive: true,
        rejectionReason: { not: null },
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      orderBy: { _count: { rejectionReason: 'desc' } },
      take: 5,
    });

    // 4. Revenue by category (For BI charts - Pie/Donut in the selected period)
    const approvedQuotesForItems = await prisma.quote.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      select: {
        id: true,
        items: {
          where: { isActive: true, drawingId: { not: null } },
          select: {
            unitPrice: true,
            quantity: true,
            discountPercent: true,
            drawingId: true,
          },
        },
      },
    });

    const allItems = approvedQuotesForItems.flatMap((q) => q.items);
    const drawingIds = [...new Set(allItems.map((i) => i.drawingId).filter(Boolean))] as string[];

    const drawings =
      drawingIds.length > 0
        ? await prisma.standardDrawing.findMany({
            where: { id: { in: drawingIds } },
            select: { id: true, categoryId: true },
          })
        : [];

    const drawingCategoryMap = new Map(drawings.map((d) => [d.id, d.categoryId]));

    const categoryRevenueMap: Record<string, number> = {};
    allItems.forEach((item) => {
      const categoryId = drawingCategoryMap.get(item.drawingId!);
      if (categoryId) {
        const rev = Number(item.unitPrice) * item.quantity;
        const discPct = Number(item.discountPercent) / 100;
        const finalRev = rev * (1 - discPct);
        categoryRevenueMap[categoryId] = (categoryRevenueMap[categoryId] || 0) + finalRev;
      }
    });

    const categoryIds = Object.keys(categoryRevenueMap);
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [];

    const revenueWithCategoryNames = categories.map((cat) => ({
      categoryName: cat.name,
      totalRevenue: categoryRevenueMap[cat.id] || 0,
    }));

    // 5. Historical trends (last 6 months) for Area Chart (Keep historical timeline)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const quotesLast6Months = await prisma.quote.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        isActive: true,
        clientId: clientFilter,
      },
      select: {
        status: true,
        price: true,
        contractedPrice: true,
        createdAt: true,
      },
    });

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const monthlyDataMap: Record<
      string,
      { month: string; faturamento: number; total: number; aprovados: number }
    > = {};

    // Initialize map keys for last 6 months to guarantee ordering
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyDataMap[key] = {
        month: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
        faturamento: 0,
        total: 0,
        aprovados: 0,
      };
    }

    quotesLast6Months.forEach((q) => {
      const date = new Date(q.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyDataMap[key]) {
        monthlyDataMap[key].total += 1;
        if (q.status === 'APPROVED') {
          monthlyDataMap[key].faturamento += Number(q.contractedPrice ?? q.price ?? 0);
          monthlyDataMap[key].aprovados += 1;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyDataMap);

    // 6. Category Performance for Radar Chart (Approval rate and total value - Keep historical scope)
    const allQuotesForPerformance = await prisma.quote.findMany({
      where: {
        isActive: true,
        clientId: clientFilter,
        status: { in: ['APPROVED', 'REJECTED', 'SENT', 'CANCELED'] },
      },
      select: {
        id: true,
        status: true,
        items: {
          where: { isActive: true, drawingId: { not: null } },
          select: { drawingId: true },
        },
      },
    });

    const allDrawingIdsForPerf = [
      ...new Set(
        allQuotesForPerformance
          .flatMap((q) => q.items)
          .map((i) => i.drawingId)
          .filter(Boolean),
      ),
    ] as string[];
    const drawingsForPerf =
      allDrawingIdsForPerf.length > 0
        ? await prisma.standardDrawing.findMany({
            where: { id: { in: allDrawingIdsForPerf } },
            select: { id: true, categoryId: true },
          })
        : [];

    const drawingCatMapForPerf = new Map(drawingsForPerf.map((d) => [d.id, d.categoryId]));

    const catStats: Record<string, { total: number; approved: number }> = {};
    allQuotesForPerformance.forEach((q) => {
      const catIds = [
        ...new Set(q.items.map((i) => drawingCatMapForPerf.get(i.drawingId!)).filter(Boolean)),
      ] as string[];
      catIds.forEach((catId) => {
        if (!catStats[catId]) catStats[catId] = { total: 0, approved: 0 };
        catStats[catId].total += 1;
        if (q.status === 'APPROVED') catStats[catId].approved += 1;
      });
    });

    const perfCategoryIds = Object.keys(catStats);
    const perfCategories =
      perfCategoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: perfCategoryIds } },
            select: { id: true, name: true },
          })
        : [];

    const categoryPerformanceData = perfCategories.map((cat) => {
      const s = catStats[cat.id];
      const rate = s.total > 0 ? (s.approved / s.total) * 100 : 0;
      return {
        subject: cat.name,
        Aprovacao: parseFloat(rate.toFixed(1)),
        fullMark: 100,
      };
    });

    // 7. Load Commercial Goals Config
    const configService = new ConfigService();
    let targetApprovalRate = 60;
    try {
      const config = await configService.getByKey('target_approval_rate');
      targetApprovalRate = Number(config.value) || 60;
    } catch {
      // Fallback to default
    }

    // 8. Annual Seasonal Comparative Data (Radar Chart: Month vs Year - Keep historical scope)
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 1;
    const seasonalStartDate = new Date(startYear, 0, 1);
    seasonalStartDate.setHours(0, 0, 0, 0);

    const approvedQuotesSeasonal = await prisma.quote.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        createdAt: { gte: seasonalStartDate },
        clientId: clientFilter,
      },
      select: {
        price: true,
        contractedPrice: true,
        createdAt: true,
      },
    });

    const seasonalDataMap: Record<number, { month: string; [year: number]: number }> = {};
    for (let m = 0; m < 12; m++) {
      seasonalDataMap[m] = {
        month: monthNames[m],
        [currentYear]: 0,
        [startYear]: 0,
      };
    }

    let hasSeasonalData = false;
    let totalSeasonalVolume = 0;

    approvedQuotesSeasonal.forEach((q) => {
      const date = new Date(q.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      const price = Number(q.contractedPrice ?? q.price ?? 0);

      if (year === currentYear || year === startYear) {
        if (price > 0) {
          seasonalDataMap[month][year] = (seasonalDataMap[month][year] || 0) + price;
          totalSeasonalVolume += price;
        }
      }
    });

    if (totalSeasonalVolume > 0) {
      hasSeasonalData = true;
    }

    const seasonalTrends = Object.values(seasonalDataMap);

    // 9. Cancellation audit details (Loss vs No Loss of material in the selected period)
    const totalCanceled = await prisma.quote.count({
      where: {
        status: 'CANCELED',
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    const canceledWithLoss = await prisma.quote.count({
      where: {
        status: 'CANCELED',
        wasProduced: true,
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    const canceledWithoutLoss = await prisma.quote.count({
      where: {
        status: 'CANCELED',
        wasProduced: false,
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    // 10. Rejections by category (Top categories with rejected quotes in selected period)
    const rejectedQuotes = await prisma.quote.findMany({
      where: {
        status: 'REJECTED',
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      select: {
        id: true,
        items: {
          where: { isActive: true, drawingId: { not: null } },
          select: { drawingId: true },
        },
      },
    });

    const rejectedDrawingIds = [
      ...new Set(
        rejectedQuotes
          .flatMap((q) => q.items)
          .map((i) => i.drawingId)
          .filter(Boolean),
      ),
    ] as string[];
    const rejectedDrawings =
      rejectedDrawingIds.length > 0
        ? await prisma.standardDrawing.findMany({
            where: { id: { in: rejectedDrawingIds } },
            select: { id: true, categoryId: true },
          })
        : [];

    const rejectedDrawingCatMap = new Map(rejectedDrawings.map((d) => [d.id, d.categoryId]));

    const rejectionCatCount: Record<string, number> = {};
    rejectedQuotes.forEach((q) => {
      const catIds = [
        ...new Set(q.items.map((i) => rejectedDrawingCatMap.get(i.drawingId!)).filter(Boolean)),
      ] as string[];
      catIds.forEach((catId) => {
        rejectionCatCount[catId] = (rejectionCatCount[catId] || 0) + 1;
      });
    });

    const rejectedCatIds = Object.keys(rejectionCatCount)
      .sort((a, b) => rejectionCatCount[b] - rejectionCatCount[a])
      .slice(0, 5);
    const rejectedCategoriesForBI =
      rejectedCatIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: rejectedCatIds } },
            select: { id: true, name: true },
          })
        : [];

    const rejectionsByCategoryData = rejectedCatIds.map((catId) => {
      const cat = rejectedCategoriesForBI.find((c) => c.id === catId);
      return {
        categoryName: cat?.name || 'Unknown',
        count: rejectionCatCount[catId],
      };
    });

    // 11. Top clients with most losses (rejections + cancellations)
    const clientLosses = await prisma.quote.groupBy({
      by: ['clientId'],
      _count: { id: true },
      where: {
        status: { in: ['REJECTED', 'CANCELED'] },
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
    });

    const clientIds = clientLosses.map((l) => l.clientId);
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });

    const clientLossQuotes = await prisma.quote.findMany({
      where: {
        clientId: { in: clientIds },
        status: { in: ['REJECTED', 'CANCELED'] },
        isActive: true,
        createdAt: dateFilter,
      },
      select: {
        clientId: true,
        status: true,
      },
    });

    const totalQuotesPerClient = await prisma.quote.groupBy({
      by: ['clientId'],
      _count: { id: true },
      where: {
        clientId: { in: clientIds },
        isActive: true,
        createdAt: dateFilter,
      },
    });

    const allLossClientsData = clientLosses.map((l) => {
      const client = clients.find((c) => c.id === l.clientId);
      const quotesForClient = clientLossQuotes.filter((q) => q.clientId === l.clientId);
      const rejections = quotesForClient.filter((q) => q.status === 'REJECTED').length;
      const cancellations = quotesForClient.filter((q) => q.status === 'CANCELED').length;

      const totalQuotesObj = totalQuotesPerClient.find((t) => t.clientId === l.clientId);
      const totalQuotes = totalQuotesObj?._count.id || 1;
      const lossRate = Math.round((l._count.id / totalQuotes) * 100);

      return {
        clientName: client?.name || 'Cliente Indefinido',
        count: l._count.id,
        rejections,
        cancellations,
        lossRate,
      };
    });

    const topLossClientsData = allLossClientsData
      .sort((a, b) => {
        if (b.lossRate !== a.lossRate) {
          return b.lossRate - a.lossRate;
        }
        return b.count - a.count;
      })
      .slice(0, 5);

    // 12. Top clients by revenue
    const quotesForClients = await prisma.quote.findMany({
      where: {
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      select: {
        clientId: true,
        client: { select: { name: true } },
        status: true,
        contractedPrice: true,
        price: true,
      },
    });

    const clientMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        totalQuotes: number;
        approvedQuotes: number;
        totalRevenue: number;
      }
    >();

    for (const q of quotesForClients) {
      if (!q.clientId || !q.client) continue;
      const entry = clientMap.get(q.clientId) || {
        clientId: q.clientId,
        clientName: q.client.name,
        totalQuotes: 0,
        approvedQuotes: 0,
        totalRevenue: 0,
      };
      entry.totalQuotes++;
      if (q.status === 'APPROVED') {
        entry.approvedQuotes++;
        entry.totalRevenue += Number(q.contractedPrice ?? q.price ?? 0);
      }
      clientMap.set(q.clientId, entry);
    }

    const topClients = Array.from(clientMap.values())
      .map((c) => ({
        ...c,
        conversionRate: c.totalQuotes > 0 ? (c.approvedQuotes / c.totalQuotes) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      totalRevenueProjected: totalRevenueProjected,
      totalCostProjected: totalCostProjected,
      totalProfitProjected: totalProfitProjected,
      averageMarginProjected: parseFloat(averageMarginProjected.toFixed(2)),
      approvalRate: parseFloat(approvalRate.toFixed(2)),
      totalProcessed,
      totalApproved,
      topRejectionReasons: rejectionReasons.map((r) => ({
        reason: r.rejectionReason || 'Unknown',
        count: r._count.rejectionReason,
      })),
      revenueByCategory: revenueWithCategoryNames,
      monthlyTrends,
      categoryPerformance: categoryPerformanceData,
      targetApprovalRate,
      seasonalTrends: {
        hasSeasonalData,
        currentYear,
        startYear,
        data: seasonalTrends,
      },
      cancellationStats: {
        totalCanceled,
        canceledWithLoss,
        canceledWithoutLoss,
      },
      rejectionsByCategory: rejectionsByCategoryData,
      topLossClients: topLossClientsData,
      topClients,
    };
  }

  async exportToCsv(filters: AnalyticsFilters = {}, isAdmin: boolean = false): Promise<string> {
    let dateFilter: any = undefined;

    if (filters.startDate || filters.endDate) {
      dateFilter = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    } else {
      let periodStartDate: Date | undefined = new Date();
      periodStartDate.setHours(0, 0, 0, 0);

      const period = filters.period || 'month';
      if (period === 'month') {
        periodStartDate.setDate(1);
      } else if (period === 'year') {
        periodStartDate.setMonth(0);
        periodStartDate.setDate(1);
      } else if (period === 'all') {
        periodStartDate = undefined;
      } else {
        periodStartDate.setDate(1);
      }

      if (periodStartDate) {
        dateFilter = { gte: periodStartDate };
      }
    }

    const clientFilter = filters.clientId || undefined;

    const quotes = await prisma.quote.findMany({
      where: {
        isActive: true,
        createdAt: dateFilter,
        clientId: clientFilter,
      },
      include: {
        client: true,
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const headers = [
      'Numero do Orcamento',
      'Revisao',
      'Cliente',
      'Categoria',
      'Status',
      'Preco Estimado (Custo)',
      'Preco Ofertado',
      'Preco Contratado',
      'Data de Criacao',
    ];

    const csvRows = [headers.join(',')];

    for (const q of quotes) {
      const num = q.quoteNumber;
      const rev = q.revision;
      const clientName = q.client.name.replace(/"/g, '""');
      const categoryName = (q.category?.name || '').replace(/"/g, '""');
      const status = q.status;

      const estPrice = isAdmin ? (q.estimatedPrice ? q.estimatedPrice.toString() : '') : '';
      const price = isAdmin ? (q.price ? q.price.toString() : '') : '';
      const contractedPrice = isAdmin
        ? q.contractedPrice
          ? q.contractedPrice.toString()
          : ''
        : '';
      const createdAt = q.createdAt.toISOString();

      const row = [
        num,
        `"${rev}"`,
        `"${clientName}"`,
        `"${categoryName}"`,
        status,
        estPrice,
        price,
        contractedPrice,
        createdAt,
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\r\n');
  }

  async getQuoteFlowMetrics(filters: AnalyticsFilters = {}) {
    let dateFilter: any = undefined;
    if (filters.startDate || filters.endDate) {
      dateFilter = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const clientFilter = filters.clientId || undefined;

    // 1. Average time between stages (creation → sent → approved)
    const stageTimes = await prisma.quoteAuditLog.findMany({
      where: {
        action: { in: ['STATUS_CHANGE', 'APPROVAL_DECISION'] },
        createdAt: dateFilter,
        quote: {
          isActive: true,
          ...(clientFilter && { clientId: clientFilter }),
        },
      },
      select: {
        quoteId: true,
        action: true,
        createdAt: true,
        newValue: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const quoteStageMap: Record<string, { created?: Date; sent?: Date; approved?: Date }> = {};
    for (const log of stageTimes) {
      const nv = log.newValue as any;
      if (!nv?.status) continue;
      if (!quoteStageMap[log.quoteId]) quoteStageMap[log.quoteId] = {};
      if (nv.status === 'SENT') {
        quoteStageMap[log.quoteId].sent = log.createdAt;
      }
      if (nv.status === 'APPROVED') {
        quoteStageMap[log.quoteId].approved = log.createdAt;
      }
    }

    const quotesForCreation = await prisma.quote.findMany({
      where: {
        isActive: true,
        ...(clientFilter && { clientId: clientFilter }),
      },
      select: { id: true, createdAt: true },
    });
    for (const q of quotesForCreation) {
      if (quoteStageMap[q.id]) quoteStageMap[q.id].created = q.createdAt;
    }

    let totalDaysCreateToSent = 0;
    let countCreateToSent = 0;
    let totalDaysSentToApproved = 0;
    let countSentToApproved = 0;
    for (const stages of Object.values(quoteStageMap)) {
      if (stages.created && stages.sent) {
        totalDaysCreateToSent +=
          (stages.sent.getTime() - stages.created.getTime()) / (1000 * 60 * 60 * 24);
        countCreateToSent++;
      }
      if (stages.sent && stages.approved) {
        totalDaysSentToApproved +=
          (stages.approved.getTime() - stages.sent.getTime()) / (1000 * 60 * 60 * 24);
        countSentToApproved++;
      }
    }

    const avgDaysCreateToSent =
      countCreateToSent > 0 ? totalDaysCreateToSent / countCreateToSent : 0;
    const avgDaysSentToApproved =
      countSentToApproved > 0 ? totalDaysSentToApproved / countSentToApproved : 0;

    // 2. Number of revisions per quote
    const revisionCounts = await prisma.quote.groupBy({
      by: ['quoteNumber'],
      _count: { id: true },
      where: {
        isActive: true,
        ...(clientFilter && { clientId: clientFilter }),
      },
    });
    const totalRevisions = revisionCounts.reduce((sum, r) => sum + r._count.id, 0);
    const avgRevisionsPerQuote =
      revisionCounts.length > 0 ? totalRevisions / revisionCounts.length : 0;

    // 3. Price delta between stages
    const quotesWithPrices = await prisma.quote.findMany({
      where: {
        isActive: true,
        status: { in: ['APPROVED', 'SENT'] },
        ...(clientFilter && { clientId: clientFilter }),
      },
      select: {
        estimatedPrice: true,
        price: true,
        contractedPrice: true,
      },
    });

    let totalEstToPrice = 0;
    let countEstToPrice = 0;
    let totalPriceToContracted = 0;
    let countPriceToContracted = 0;
    for (const q of quotesWithPrices) {
      const est = Number(q.estimatedPrice || 0);
      const pr = Number(q.price || 0);
      const cp = Number(q.contractedPrice || 0);
      if (est > 0 && pr > 0) {
        totalEstToPrice += ((pr - est) / est) * 100;
        countEstToPrice++;
      }
      if (pr > 0 && cp > 0) {
        totalPriceToContracted += ((cp - pr) / pr) * 100;
        countPriceToContracted++;
      }
    }

    const avgDeltaEstToPrice = countEstToPrice > 0 ? totalEstToPrice / countEstToPrice : 0;
    const avgDeltaPriceToContracted =
      countPriceToContracted > 0 ? totalPriceToContracted / countPriceToContracted : 0;

    // 4. Conversion rate by stage
    const totalSent = await prisma.quote.count({
      where: {
        status: { in: ['SENT', 'APPROVED'] },
        isActive: true,
        ...(clientFilter && { clientId: clientFilter }),
      },
    });
    const totalApprovedQ = await prisma.quote.count({
      where: {
        status: 'APPROVED',
        isActive: true,
        ...(clientFilter && { clientId: clientFilter }),
      },
    });
    const conversionRate = totalSent > 0 ? (totalApprovedQ / totalSent) * 100 : 0;

    // 5. Margin by category
    const categoryMargins = await prisma.quote.findMany({
      where: {
        isActive: true,
        status: { in: ['SENT', 'APPROVED'] },
        categoryId: { not: null },
        ...(clientFilter && { clientId: clientFilter }),
      },
      select: {
        categoryId: true,
        estimatedPrice: true,
        totalCost: true,
      },
    });

    const categoryData: Record<string, { totalCost: number; totalPrice: number }> = {};
    for (const q of categoryMargins) {
      if (!q.categoryId) continue;
      if (!categoryData[q.categoryId]) {
        categoryData[q.categoryId] = { totalCost: 0, totalPrice: 0 };
      }
      categoryData[q.categoryId].totalCost += Number(q.totalCost || 0);
      categoryData[q.categoryId].totalPrice += Number(q.estimatedPrice || 0);
    }

    const catIds = Object.keys(categoryData);
    const categories =
      catIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: catIds } },
            select: { id: true, name: true },
          })
        : [];

    const marginByCategory = categories.map((cat) => {
      const d = categoryData[cat.id];
      const margin = d.totalPrice > 0 ? ((d.totalPrice - d.totalCost) / d.totalPrice) * 100 : 0;
      return { categoryName: cat.name, averageMargin: margin };
    });

    return {
      avgDaysCreateToSent: Math.round(avgDaysCreateToSent * 10) / 10,
      avgDaysSentToApproved: Math.round(avgDaysSentToApproved * 10) / 10,
      avgRevisionsPerQuote: Math.round(avgRevisionsPerQuote * 10) / 10,
      avgDeltaEstToPrice: Math.round(avgDeltaEstToPrice * 10) / 10,
      avgDeltaPriceToContracted: Math.round(avgDeltaPriceToContracted * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      marginByCategory,
    };
  }
}
