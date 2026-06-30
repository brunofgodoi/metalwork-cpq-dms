import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { z } from 'zod';

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'ESTIMATOR', 'VIEWER']).optional(),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['ADMIN', 'ESTIMATOR', 'VIEWER']).optional(),
    isActive: z.boolean().optional(),
    changePasswordNextLogin: z.boolean().optional(),
  }),
});

export const userRoutes: Router = Router();
const userController = new UserController();

// All user routes require authentication
userRoutes.use(authMiddleware);
// Only ADMINs can manage (create/list/delete) users
userRoutes.use(roleMiddleware(['ADMIN']));

userRoutes.post('/', validateRequest(createUserSchema), userController.create);
userRoutes.get('/', userController.list);
userRoutes.put('/:id', validateRequest(updateUserSchema), userController.update);
userRoutes.delete('/:id', userController.delete);
