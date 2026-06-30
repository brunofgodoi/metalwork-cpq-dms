import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.'),
    parentId: z.string().uuid('ID pai inválido.').nullable().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.').optional(),
    parentId: z.string().uuid('ID pai inválido.').nullable().optional(),
  }),
});

export const categoryRoutes = Router();
const controller = new CategoryController();

categoryRoutes.use(authMiddleware);

categoryRoutes.post('/', validateRequest(createSchema), controller.create);
categoryRoutes.get('/', controller.list);
categoryRoutes.put('/:id', validateRequest(updateSchema), controller.update);
categoryRoutes.patch('/:id/restore', controller.restore);
categoryRoutes.delete('/:id', controller.delete);
