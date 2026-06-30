import { Request, Response } from 'express';
import { ApprovalService } from '../services/ApprovalService';
import { AppError } from '../utils/AppError';

export class ApprovalController {
  async listPending(req: Request, res: Response) {
    const service = new ApprovalService();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await service.listPending(page, limit);
    return res.json(result);
  }

  async decide(req: Request, res: Response) {
    const service = new ApprovalService();
    const { id } = req.params;
    const { status, comments } = req.body;
    const approverId = req.user!.id;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new AppError('Status de decisão inválido.', 400);
    }

    const result = await service.decide(id, approverId, status, comments);
    return res.json(result);
  }
}
