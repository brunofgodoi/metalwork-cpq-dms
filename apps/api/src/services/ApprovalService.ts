import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { QuoteService } from './QuoteService';

export class ApprovalService {
  async listPending(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          quote: {
            include: {
              client: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
            },
          },
          requestedBy: { select: { name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
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

  async decide(id: string, approverId: string, status: 'APPROVED' | 'REJECTED', comments?: string) {
    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { quote: true },
    });

    if (!request) {
      throw new AppError('Solicitação de aprovação não encontrada.', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Esta solicitação já foi processada.', 400);
    }

    // 1. Update the ApprovalRequest status
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        approverId,
        comments,
      },
    });

    const quoteService = new QuoteService();

    // 2. Update the Quote status
    if (status === 'APPROVED') {
      await quoteService.updateStatus(
        request.quoteId,
        'SENT',
        approverId,
        'ADMIN',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } else {
      await quoteService.updateStatus(
        request.quoteId,
        'REJECTED',
        approverId,
        'ADMIN',
        comments || 'Rejeitado pelo administrador.',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    }

    return updatedRequest;
  }
}
