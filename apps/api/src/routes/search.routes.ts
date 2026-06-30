import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { authMiddleware } from '../middlewares/authMiddleware';

export const searchRoutes = Router();
const controller = new SearchController();

searchRoutes.use(authMiddleware);

searchRoutes.get('/', controller.search);
