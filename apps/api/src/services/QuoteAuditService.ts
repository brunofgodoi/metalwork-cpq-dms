import { prisma } from '../lib/prisma';

export interface LogParams {
  quoteId: string;
  changedById: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

export class QuoteAuditService {
  async log(tx: any, params: LogParams) {
    const prismaClient = tx || prisma;
    return prismaClient.quoteAuditLog.create({
      data: {
        quoteId: params.quoteId,
        changedById: params.changedById,
        action: params.action,
        oldValue: params.oldValue !== undefined ? params.oldValue : null,
        newValue: params.newValue !== undefined ? params.newValue : null,
        metadata: params.metadata !== undefined ? params.metadata : null,
      },
    });
  }

  async listForQuote(quoteId: string) {
    return prisma.quoteAuditLog.findMany({
      where: { quoteId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
