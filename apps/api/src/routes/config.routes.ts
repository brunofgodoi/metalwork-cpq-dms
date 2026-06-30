import { Router } from 'express';
import { ConfigController } from '../controllers/ConfigController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

export const configRoutes = Router();
const controller = new ConfigController();

// All config routes require authentication
configRoutes.use(authMiddleware);

// Only ADMINs can update system configurations
configRoutes.get('/', controller.getAll);
configRoutes.get('/company', controller.getCompanyConfig);
configRoutes.put('/company', roleMiddleware(['ADMIN']), controller.updateCompanyConfig);
configRoutes.get('/:key', controller.getByKey);
configRoutes.put('/:key', roleMiddleware(['ADMIN']), controller.update);
