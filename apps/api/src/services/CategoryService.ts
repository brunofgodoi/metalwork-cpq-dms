import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class CategoryService {
  async create(data: { name: string; parentId?: string | null }) {
    const nameTrimmed = data.name.trim();
    const exists = await prisma.category.findUnique({ where: { name: nameTrimmed } });
    if (exists) {
      if (exists.isActive) {
        throw new AppError('Esta categoria já está cadastrada.', 400);
      }
      throw new AppError(
        'Esta categoria já está cadastrada no sistema, porém está desativada. Para reativá-la ou excluí-la permanentemente, utilize o filtro "Mostrar categorias desativadas" na listagem.',
        400,
      );
    }

    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent || !parent.isActive) {
        throw new AppError('A categoria pai selecionada não existe ou está desativada.', 400);
      }
      if (parent.parentId) {
        throw new AppError('Não é possível criar subcategorias em múltiplos níveis.', 400);
      }
    }

    return prisma.category.create({
      data: {
        name: nameTrimmed,
        parentId: data.parentId || null,
      },
    });
  }

  async list(
    page: number = 1,
    limit: number = 10,
    search?: string,
    showInactive?: boolean,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const skip = (page - 1) * limit;
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy ?? '') ? sortBy! : 'name';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const whereClause: any = {};
    if (!showInactive) {
      whereClause.isActive = true;
    }

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.category.findMany({
        where: whereClause,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      prisma.category.count({ where: whereClause }),
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

  async update(id: string, data: { name?: string; parentId?: string | null }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError('Categoria não encontrada.', 404);

    const updateData: any = {};

    if (data.name !== undefined) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed !== category.name) {
        const exists = await prisma.category.findUnique({ where: { name: nameTrimmed } });
        if (exists) {
          throw new AppError('Já existe uma categoria com este nome.', 400);
        }
      }
      updateData.name = nameTrimmed;
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new AppError('Uma categoria não pode ser subcategoria de si mesma.', 400);
      }

      if (data.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
        if (!parent || !parent.isActive) {
          throw new AppError('A categoria pai selecionada não existe ou está desativada.', 400);
        }
        if (parent.parentId) {
          throw new AppError('Não é possível criar subcategorias em múltiplos níveis.', 400);
        }

        const hasSubcategories = await prisma.category.findFirst({
          where: { parentId: id, isActive: true },
        });
        if (hasSubcategories) {
          throw new AppError(
            'Esta categoria possui subcategorias ativas e não pode se tornar uma subcategoria.',
            400,
          );
        }
      }

      updateData.parentId = data.parentId || null;
    }

    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  async restore(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError('Categoria não encontrada.', 404);

    if (category.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: category.parentId } });
      if (!parent || !parent.isActive) {
        throw new AppError(
          'Não é possível reativar esta subcategoria pois a categoria pai está desativada. Reative a categoria pai primeiro.',
          400,
        );
      }
    }

    return prisma.category.update({ where: { id }, data: { isActive: true } });
  }

  async delete(id: string, force?: boolean) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError('Categoria não encontrada.', 404);

    const subcategories = await prisma.category.findMany({
      where: { parentId: id },
    });
    const subIds = subcategories.map((s) => s.id);
    const allIds = [id, ...subIds];

    if (force) {
      const relatedQuotes = await prisma.quote.count({
        where: { categoryId: { in: allIds } },
      });
      if (relatedQuotes > 0) {
        throw new AppError(
          `Não é possível excluir permanentemente esta categoria. Ela ou suas subcategorias possuem ${relatedQuotes} orçamento(s) vinculado(s).`,
          400,
        );
      }

      await prisma.category.deleteMany({ where: { id: { in: allIds } } });
      return;
    }

    await prisma.$transaction([
      prisma.category.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.category.updateMany({
        where: { parentId: id },
        data: { isActive: false },
      }),
    ]);
  }
}
