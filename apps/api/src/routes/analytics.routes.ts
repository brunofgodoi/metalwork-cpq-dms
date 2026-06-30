import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authMiddleware } from '../middlewares/authMiddleware';

export const analyticsRoutes = Router();
const controller = new AnalyticsController();

analyticsRoutes.use(authMiddleware);

analyticsRoutes.get('/dashboard', controller.getDashboard);
analyticsRoutes.get('/quote-flow', controller.getQuoteFlow);
analyticsRoutes.get('/export', controller.exportCsv);
