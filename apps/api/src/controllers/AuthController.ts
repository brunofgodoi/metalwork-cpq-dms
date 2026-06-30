import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from '../utils/AppError';

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const authService = new AuthService();
    const result = await authService.authenticate({ email, password });
    return res.json(result);
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const authService = new AuthService();
    const result = await authService.refresh(refreshToken);
    return res.json(result);
  }

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    if (!req.user) {
      throw new AppError('Não autorizado.', 401);
    }
    const userId = req.user.id;
    const authService = new AuthService();
    const result = await authService.changePassword({ userId, currentPassword, newPassword });
    return res.json(result);
  }
}
