import { Request, Response } from 'express';
import { QuoteService } from '../services/QuoteService';
import { QuoteAuditService } from '../services/QuoteAuditService';
import { AppError } from '../utils/AppError';
import fs from 'fs';

export class QuoteController {
  async create(req: Request, res: Response) {
    const service = new QuoteService();
    // Extract the ID of the user who made the request (provided by authMiddleware)
    const createdById = req.user!.id;

    const quote = await service.create({ ...req.body, createdById });
    return res.status(201).json(quote);
  }

  async list(req: Request, res: Response) {
    const service = new QuoteService();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const filters = {
      clientId: req.query.clientId as string,
      categoryId: req.query.categoryId as string,
      status: req.query.status as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
      overdue: req.query.overdue as string,
    };

    const result = await service.list(page, limit, filters);
    return res.json(result);
  }

  async getById(req: Request, res: Response) {
    const service = new QuoteService();
    const quote = await service.getById(req.params.id);
    return res.json(quote);
  }

  async updateStatus(req: Request, res: Response) {
    const service = new QuoteService();
    const {
      status,
      rejectionReason,
      price,
      deliveryDate,
      contractedPrice,
      wasProduced,
      justification,
    } = req.body;
    const quote = await service.updateStatus(
      req.params.id,
      status,
      req.user!.id,
      req.user!.role,
      rejectionReason,
      price,
      deliveryDate,
      contractedPrice,
      wasProduced,
      justification,
    );
    return res.json(quote);
  }

  async update(req: Request, res: Response) {
    const service = new QuoteService();
    const quote = await service.update(req.params.id, req.body, req.user!.id);
    return res.json(quote);
  }

  async uploadCadFiles(req: Request, res: Response) {
    const service = new QuoteService();
    const { id } = req.params;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || (!files.cadFile && !files.thumbnail)) {
      throw new AppError('Nenhum arquivo enviado.', 400);
    }

    const cadFile = files.cadFile?.[0];
    const thumbnail = files.thumbnail?.[0];

    if (thumbnail && thumbnail.size > 5 * 1024 * 1024) {
      if (thumbnail.path && fs.existsSync(thumbnail.path)) {
        fs.unlinkSync(thumbnail.path);
      }
      if (cadFile?.path && fs.existsSync(cadFile.path)) {
        fs.unlinkSync(cadFile.path);
      }
      throw new AppError('O arquivo de thumbnail não pode ser maior que 5MB.', 400);
    }

    const updates: { cadFilePath?: string; thumbnailUrl?: string } = {};

    if (cadFile) {
      updates.cadFilePath = `/uploads/cad/${cadFile.filename}`;
    }

    if (thumbnail) {
      updates.thumbnailUrl = `/uploads/thumbnails/${thumbnail.filename}`;
    }

    const quote = await service.updateFiles(id, updates, req.user!.id);
    return res.json(quote);
  }

  async createRevision(req: Request, res: Response) {
    const service = new QuoteService();
    const { id } = req.params;
    const quote = await service.createRevision(id, req.user!.id);
    return res.status(201).json(quote);
  }

  async getRevisionHistory(req: Request, res: Response) {
    const service = new QuoteService();
    const { id } = req.params;
    const quote = await service.getById(id);
    const history = await service.getRevisionHistory(quote.quoteNumber);
    return res.json(history);
  }

  async getRevisionDiff(req: Request, res: Response) {
    const service = new QuoteService();
    const { rev1, rev2 } = req.query;
    const diff = await service.getRevisionDiff(rev1 as string, rev2 as string);
    return res.json(diff);
  }

  async copy(req: Request, res: Response) {
    const service = new QuoteService();
    const quote = await service.copy(req.params.id, req.user!.id);
    return res.status(201).json(quote);
  }

  async delete(req: Request, res: Response) {
    const service = new QuoteService();
    await service.delete(req.params.id, req.user!.id);
    return res.status(204).send();
  }

  async deleteRevision(req: Request, res: Response) {
    const service = new QuoteService();
    await service.deleteRevision(req.params.revisionId, req.user!.id);
    return res.status(204).send();
  }

  async restoreRevision(req: Request, res: Response) {
    const service = new QuoteService();
    const quote = await service.restoreRevision(req.params.revisionId, req.user!.id);
    return res.json(quote);
  }

  async listItems(req: Request, res: Response) {
    const service = new QuoteService();
    const items = await service.listItems(req.params.quoteId);
    return res.json(items);
  }

  async createItem(req: Request, res: Response) {
    const service = new QuoteService();
    const item = await service.createItem(req.params.quoteId, req.body, req.user!.id);
    return res.status(201).json(item);
  }

  async updateItem(req: Request, res: Response) {
    const service = new QuoteService();
    const item = await service.updateItem(
      req.params.quoteId,
      req.params.id,
      req.body,
      req.user!.id,
    );
    return res.json(item);
  }

  async deleteItem(req: Request, res: Response) {
    const service = new QuoteService();
    await service.deleteItem(req.params.quoteId, req.params.id, req.user!.id);
    return res.status(204).send();
  }

  async uploadItemCadFiles(req: Request, res: Response) {
    const service = new QuoteService();
    const { quoteId, id } = req.params;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || (!files.cadFile && !files.thumbnail)) {
      throw new AppError('Nenhum arquivo enviado.', 400);
    }

    const cadFile = files.cadFile?.[0];
    const thumbnail = files.thumbnail?.[0];

    if (thumbnail && thumbnail.size > 5 * 1024 * 1024) {
      if (thumbnail.path && fs.existsSync(thumbnail.path)) {
        fs.unlinkSync(thumbnail.path);
      }
      if (cadFile?.path && fs.existsSync(cadFile.path)) {
        fs.unlinkSync(cadFile.path);
      }
      throw new AppError('O arquivo de thumbnail não pode ser maior que 5MB.', 400);
    }

    const updates: { drawingRef?: string; thumbnailUrl?: string } = {};

    if (cadFile) {
      updates.drawingRef = `/uploads/cad/${cadFile.filename}`;
    }

    if (thumbnail) {
      updates.thumbnailUrl = `/uploads/thumbnails/${thumbnail.filename}`;
    }

    const item = await service.updateItemFiles(quoteId, id, updates, req.user!.id);
    return res.json(item);
  }

  async exportCsv(req: Request, res: Response) {
    const service = new QuoteService();
    const csv = await service.exportToCsv({
      clientId: req.query.clientId as string,
      status: req.query.status as string,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orcamentos.csv"');
    return res.send('\uFEFF' + csv);
  }

  async exportItemsCsv(req: Request, res: Response) {
    const service = new QuoteService();
    const { id } = req.params;
    const csv = await service.exportItemsToCsv(id);

    const quote = await service.getById(id);
    const filename = `orcamento_${quote.quoteNumber}_${quote.revision}_itens.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('\uFEFF' + csv);
  }

  async listAuditLogs(req: Request, res: Response) {
    const { id } = req.params;
    const auditService = new QuoteAuditService();
    const logs = await auditService.listForQuote(id);
    return res.json(logs);
  }
}
