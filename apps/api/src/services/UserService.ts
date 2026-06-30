import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';

export class UserService {
  async create(data: {
    name: string;
    email: string;
    role?: 'ADMIN' | 'ESTIMATOR' | 'VIEWER';
    password: string;
  }) {
    if (data.name === 'Usuário Anonimizado') {
      throw new AppError('Nome de usuário inválido.', 400);
    }
    const userExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) {
      if (userExists.isActive) {
        throw new AppError('Este e-mail já está cadastrado no sistema.', 400);
      }

      // Restore user if inactive
      const hashedPassword = await bcrypt.hash(data.password, 10);
      return prisma.user.update({
        where: { id: userExists.id },
        data: {
          isActive: true,
          name: data.name,
          role: data.role,
          password: hashedPassword,
          changePasswordNextLogin: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          changePasswordNextLogin: true,
          createdAt: true,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role || 'ESTIMATOR',
        password: hashedPassword,
        changePasswordNextLogin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        changePasswordNextLogin: true,
        createdAt: true,
      },
    });
    return user;
  }

  async list(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          changePasswordNextLogin: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: 'ADMIN' | 'ESTIMATOR' | 'VIEWER';
      isActive?: boolean;
      changePasswordNextLogin?: boolean;
      password?: string;
    },
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    if (user.name === 'Usuário Anonimizado') {
      if (data.isActive === true) {
        throw new AppError('Não é possível reativar um usuário anonimizado.', 400);
      }
      if (data.name && data.name !== 'Usuário Anonimizado') {
        throw new AppError('Não é possível alterar o nome de um usuário anonimizado.', 400);
      }
    }

    if (data.name === 'Usuário Anonimizado') {
      throw new AppError('Nome de usuário inválido.', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.email && data.email !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExists) {
        throw new AppError('Este e-mail já está em uso por outro usuário.', 400);
      }
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        changePasswordNextLogin: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
