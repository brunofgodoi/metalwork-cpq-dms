import { Router } from 'express';
import { QuoteController } from '../controllers/QuoteController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { upload } from '../middlewares/upload.middleware';
import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    clientId: z.string().uuid('Cliente inválido.'),
    contactId: z.string().uuid('Contato inválido.').optional().nullable(),
    categoryId: z.string().uuid('Categoria inválida.').optional().nullable().or(z.literal('')),
    descriptiveText: z.string().optional(),
    networkFilePath: z.string().optional().nullable(),
    estimatedPrice: z.number().positive().optional(),
    price: z.number().positive().optional(),
    estimatedHours: z.number().positive().int().optional(),
    deliveryDate: z.string().datetime({ offset: true }).optional().nullable(),
    validUntil: z.string().datetime({ offset: true }).optional().nullable(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CANCELED', 'PENDING_APPROVAL']),
    rejectionReason: z.string().optional().nullable(),
    justification: z.string().optional().nullable(),
    price: z.number().positive().optional().nullable(),
    contractedPrice: z.number().positive().optional().nullable(),
    deliveryDate: z.string().datetime({ offset: true }).optional().nullable(),
    wasProduced: z.boolean().optional().nullable(),
  }),
});

export const quoteRoutes = Router();
const controller = new QuoteController();

quoteRoutes.use(authMiddleware);

quoteRoutes.post('/', validateRequest(createSchema), controller.create);
quoteRoutes.get('/', controller.list);
quoteRoutes.get('/export', controller.exportCsv);
quoteRoutes.get('/diff', controller.getRevisionDiff);
quoteRoutes.get('/:id/export-items', controller.exportItemsCsv);
quoteRoutes.get('/:id', controller.getById);
quoteRoutes.post(
  '/:id/cad',
  upload.fields([
    { name: 'cadFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  controller.uploadCadFiles,
);
quoteRoutes.patch('/:id/status', validateRequest(updateStatusSchema), controller.updateStatus);
quoteRoutes.patch('/:id', controller.update);
quoteRoutes.post('/:id/revision', controller.createRevision);
quoteRoutes.post('/:id/copy', controller.copy);
quoteRoutes.get('/:id/history', controller.getRevisionHistory);
quoteRoutes.get('/:id/logs', controller.listAuditLogs);
quoteRoutes.delete('/:id', controller.delete);

// Quote Items CRUD
const createItemSchema = z.object({
  body: z.object({
    project: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero.'),
    unitPrice: z.number().positive('Preço unitário deve ser maior que zero.'),
    discountPercent: z.number().min(0).max(100).optional(),
    unitCost: z.number().min(0).optional(),
    process: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    estimatedHours: z.number().nonnegative().optional().nullable(),
    cadFilePath: z.string().optional().nullable(),
    drawingId: z.string().uuid().optional().nullable(),
    drawingVersion: z.number().int().positive().optional().nullable(),
    drawingRef: z.string().optional().nullable(),
    thumbnailUrl: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

const updateItemSchema = z.object({
  body: z.object({
    project: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero.').optional(),
    unitPrice: z.number().positive('Preço unitário deve ser maior que zero.').optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    unitCost: z.number().min(0).optional(),
    process: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    estimatedHours: z.number().nonnegative().optional().nullable(),
    cadFilePath: z.string().optional().nullable(),
    drawingId: z.string().uuid().optional().nullable(),
    drawingVersion: z.number().int().positive().optional().nullable(),
    drawingRef: z.string().optional().nullable(),
    thumbnailUrl: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

quoteRoutes.delete('/revisions/:revisionId', controller.deleteRevision);
quoteRoutes.post('/revisions/:revisionId/restore', controller.restoreRevision);

quoteRoutes.post('/:quoteId/items', validateRequest(createItemSchema), controller.createItem);
quoteRoutes.get('/:quoteId/items', controller.listItems);
quoteRoutes.put('/:quoteId/items/:id', validateRequest(updateItemSchema), controller.updateItem);
quoteRoutes.delete('/:quoteId/items/:id', controller.deleteItem);
quoteRoutes.post(
  '/:quoteId/items/:id/cad',
  upload.fields([
    { name: 'cadFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  controller.uploadItemCadFiles,
);
