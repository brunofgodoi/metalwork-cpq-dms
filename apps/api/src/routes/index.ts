import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { lgpdRoutes } from './lgpd.routes';
import { categoryRoutes } from './category.routes';
import { clientRoutes } from './client.routes';
import { quoteRoutes } from './quote.routes';
import { analyticsRoutes } from './analytics.routes';
import { configRoutes } from './config.routes';
import { searchRoutes } from './search.routes';
import { approvalRoutes } from './approval.routes';
import { catalogRoutes } from './catalog.routes';

export const routes: Router = Router();

routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/lgpd', lgpdRoutes);
routes.use('/categories', categoryRoutes);
routes.use('/clients', clientRoutes);
routes.use('/quotes', quoteRoutes);
routes.use('/analytics', analyticsRoutes);
routes.use('/config', configRoutes);
routes.use('/search', searchRoutes);
routes.use('/approvals', approvalRoutes);
routes.use('/catalog', catalogRoutes);
