import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

interface TokenPayload {
  sub: string;
  role: string;
  changePasswordNextLogin?: boolean;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('Token JWT is missing', 401);
  }

  const [, token] = authHeader.split(' ');

  try {
    const secret = process.env.JWT_SECRET || 'super-secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Verify if user still exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!userExists) {
      throw new AppError('User not found or session invalid', 401);
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    // If password change is required, only allow access to change-password endpoint
    const fullPath = (req.baseUrl + req.path).replace(/\/$/, '');
    if (decoded.changePasswordNextLogin && fullPath !== '/auth/change-password') {
      throw new AppError('Password change required on next login', 403);
    }

    return next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid JWT token', 401);
  }
}
