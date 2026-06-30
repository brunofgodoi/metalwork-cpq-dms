import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class StandardDrawingService {
  async list(params: {
    page?: number;
    limit?: number;
    type?: string;
    categoryId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const allowedSortFields = ['code', 'name', 'createdAt', 'updatedAt', 'type'];
    const sortField = allowedSortFields.includes(params.sortBy ?? '') ? params.sortBy! : 'name';
    const order = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = { isActive: true };
    if (params.type) where.type = params.type;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.standardDrawing.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { version: true, createdAt: true, filePath: true, docFilePath: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      prisma.standardDrawing.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const drawing = await prisma.standardDrawing.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!drawing) throw new AppError('Desenho padrão não encontrado.', 404);
    return drawing;
  }

  async create(data: {
    code: string;
    name: string;
    description?: string;
    type: string;
    categoryId: string;
    basePrice?: number;
    specs?: any;
    thumbnail?: string;
  }) {
    const exists = await prisma.standardDrawing.findUnique({ where: { code: data.code } });
    if (exists) throw new AppError('Já existe um desenho com este código.', 400);

    return prisma.standardDrawing.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      categoryId?: string;
      basePrice?: number | null;
      specs?: any;
      thumbnail?: string;
    },
  ) {
    const drawing = await prisma.standardDrawing.findUnique({ where: { id } });
    if (!drawing) throw new AppError('Desenho padrão não encontrado.', 404);
    return prisma.standardDrawing.update({ where: { id }, data });
  }

  async delete(id: string) {
    const drawing = await prisma.standardDrawing.findUnique({ where: { id } });
    if (!drawing) throw new AppError('Desenho padrão não encontrado.', 404);
    return prisma.standardDrawing.update({ where: { id }, data: { isActive: false } });
  }

  async createVersion(
    drawingId: string,
    data: {
      filePath: string | null;
      docFilePath?: string;
      changelog?: string;
      metadata?: any;
      createdBy: string;
    },
  ) {
    const drawing = await prisma.standardDrawing.findUnique({
      where: { id: drawingId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!drawing) throw new AppError('Desenho padrão não encontrado.', 404);

    const lastVersion = drawing.versions[0]?.version || 0;
    const newVersion = lastVersion + 1;

    return prisma.standardDrawingVersion.create({
      data: {
        drawingId,
        version: newVersion,
        filePath: data.filePath ?? '',
        docFilePath: data.docFilePath,
        changelog: data.changelog,
        metadata: data.metadata,
        createdBy: data.createdBy,
      },
    });
  }

  async listVersions(drawingId: string) {
    const drawing = await prisma.standardDrawing.findUnique({ where: { id: drawingId } });
    if (!drawing) throw new AppError('Desenho padrão não encontrado.', 404);

    return prisma.standardDrawingVersion.findMany({
      where: { drawingId },
      orderBy: { version: 'desc' },
    });
  }

  async getVersion(drawingId: string, version: number) {
    const ver = await prisma.standardDrawingVersion.findUnique({
      where: { drawingId_version: { drawingId, version } },
    });
    if (!ver) throw new AppError('Versão não encontrada.', 404);
    return ver;
  }

  async nextCode(prefix: string = 'ITEM') {
    const lastDrawing = await prisma.standardDrawing.findFirst({
      where: { code: { startsWith: `${prefix}-` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (lastDrawing) {
      const lastNum = parseInt(lastDrawing.code.replace(`${prefix}-`, ''), 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    return { code: `${prefix}-${String(nextNumber).padStart(3, '0')}` };
  }
}
