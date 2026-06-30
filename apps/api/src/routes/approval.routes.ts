import { Router } from 'express';
import { ApprovalController } from '../controllers/ApprovalController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { z } from 'zod';

const decideSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      required_error: 'Status é obrigatório.',
    }),
    comments: z.string().optional().nullable(),
  }),
});

export const approvalRoutes = Router();
const controller = new ApprovalController();

approvalRoutes.use(authMiddleware);
approvalRoutes.use(roleMiddleware(['ADMIN']));

approvalRoutes.get('/', controller.listPending);
approvalRoutes.patch('/:id/decide', validateRequest(decideSchema), controller.decide);
