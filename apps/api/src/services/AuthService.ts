import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ConfigService } from './ConfigService';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-secret';

export class AuthService {
  async authenticate({ email, password }: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new AppError('Credenciais inválidas ou usuário inativo.', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError('Credenciais inválidas.', 401);
    }

    const configService = new ConfigService();
    const config = await configService.getByKey('session_expiry');
    const sessionExpiry = config.value as string;

    const signOptions: jwt.SignOptions = {
      subject: user.id,
    };

    if (sessionExpiry !== 'never') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signOptions.expiresIn = sessionExpiry as any;
    }

    const token = jwt.sign(
      { role: user.role, changePasswordNextLogin: user.changePasswordNextLogin },
      JWT_SECRET,
      signOptions,
    );

    const refreshToken = jwt.sign(
      { role: user.role, changePasswordNextLogin: user.changePasswordNextLogin },
      REFRESH_SECRET,
      {
        subject: user.id,
        expiresIn: '7d',
      },
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        changePasswordNextLogin: user.changePasswordNextLogin,
      },
      token,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as jwt.JwtPayload & {
        changePasswordNextLogin?: boolean;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || !user.isActive) throw new AppError('Invalid refresh token', 401);

      const configService = new ConfigService();
      const config = await configService.getByKey('session_expiry');
      const sessionExpiry = config.value as string;

      const signOptions: jwt.SignOptions = {
        subject: user.id,
      };

      if (sessionExpiry !== 'never') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions.expiresIn = sessionExpiry as any;
      }

      const newToken = jwt.sign(
        { role: user.role, changePasswordNextLogin: user.changePasswordNextLogin },
        JWT_SECRET,
        signOptions,
      );

      return { token: newToken };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async changePassword({
    userId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError('Usuário não encontrado ou inativo.', 404);
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      throw new AppError('Senha atual incorreta.', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        changePasswordNextLogin: false,
      },
    });

    const configService = new ConfigService();
    const config = await configService.getByKey('session_expiry');
    const sessionExpiry = config.value as string;

    const signOptions: jwt.SignOptions = {
      subject: updatedUser.id,
    };

    if (sessionExpiry !== 'never') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signOptions.expiresIn = sessionExpiry as any;
    }

    const token = jwt.sign(
      { role: updatedUser.role, changePasswordNextLogin: false },
      JWT_SECRET,
      signOptions,
    );

    return {
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        changePasswordNextLogin: false,
      },
      token,
    };
  }
}
