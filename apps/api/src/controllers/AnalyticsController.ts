import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';

export class AnalyticsController {
  async getDashboard(req: Request, res: Response) {
    const service = new AnalyticsService();
    const { period, clientId, categoryId, startDate, endDate } = req.query;
    const metrics = await service.getDashboardMetrics({
      period: period as string,
      clientId: clientId as string,
      categoryId: categoryId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    // Check user role, strip sensitive financial data if not ADMIN
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      delete (metrics as any).totalRevenueProjected;
      delete (metrics as any).totalCostProjected;
      delete (metrics as any).totalProfitProjected;
      delete (metrics as any).averageMarginProjected;
      delete (metrics as any).revenueByCategory;
      delete (metrics as any).seasonalTrends;
      if (metrics.monthlyTrends) {
        metrics.monthlyTrends = metrics.monthlyTrends.map((t: any) => ({
          month: t.month,
          total: t.total,
          aprovados: t.aprovados,
        }));
      }
    }

    return res.json(metrics);
  }

  async getQuoteFlow(req: Request, res: Response) {
    const service = new AnalyticsService();
    const { period, clientId, startDate, endDate } = req.query;
    const metrics = await service.getQuoteFlowMetrics({
      period: period as string,
      clientId: clientId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    return res.json(metrics);
  }

  async exportCsv(req: Request, res: Response) {
    const service = new AnalyticsService();
    const { period, clientId, categoryId, startDate, endDate } = req.query;

    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN';

    const csvContent = await service.exportToCsv(
      {
        period: period as string,
        clientId: clientId as string,
        categoryId: categoryId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      isAdmin,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics_export.csv"');
    return res.send(csvContent);
  }
}
