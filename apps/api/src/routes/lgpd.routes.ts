import { Router } from 'express';
import { LgpdController } from '../controllers/LgpdController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

export const lgpdRoutes = Router();
const lgpdController = new LgpdController();

// LGPD is a critical action: Only authenticated ADMIN is allowed to trigger it
lgpdRoutes.use(authMiddleware);
lgpdRoutes.use(roleMiddleware(['ADMIN']));

lgpdRoutes.post('/client/:id', lgpdController.anonymizeClient);
lgpdRoutes.post('/user/:id', lgpdController.anonymizeUser);
lgpdRoutes.post('/contact/:id', lgpdController.anonymizeContact);
