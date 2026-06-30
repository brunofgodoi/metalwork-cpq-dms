import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function roleMiddleware(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError('Access denied: insufficient permissions', 403);
    }
    next();
  };
}
