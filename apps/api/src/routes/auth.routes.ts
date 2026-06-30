import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middlewares/validateRequest';
import { authMiddleware } from '../middlewares/authMiddleware';
import { z } from 'zod';

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

export const authRoutes: Router = Router();
const authController = new AuthController();

authRoutes.post('/login', validateRequest(loginSchema), authController.login);
authRoutes.post('/refresh', validateRequest(refreshSchema), authController.refresh);
authRoutes.post(
  '/change-password',
  authMiddleware,
  validateRequest(changePasswordSchema),
  authController.changePassword,
);
