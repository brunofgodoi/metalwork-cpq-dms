import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';

export class CategoryController {
  async create(req: Request, res: Response) {
    const service = new CategoryService();
    const category = await service.create(req.body);
    return res.status(201).json(category);
  }

  async list(req: Request, res: Response) {
    const service = new CategoryService();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string;
    const showInactive = req.query.showInactive === 'true';

    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as string;

    const result = await service.list(page, limit, search, showInactive, sortBy, sortOrder);
    return res.json(result);
  }

  async restore(req: Request, res: Response) {
    const service = new CategoryService();
    const category = await service.restore(req.params.id);
    return res.json(category);
  }

  async update(req: Request, res: Response) {
    const service = new CategoryService();
    const category = await service.update(req.params.id, req.body);
    return res.json(category);
  }

  async delete(req: Request, res: Response) {
    const service = new CategoryService();
    const force = req.query.force === 'true';
    await service.delete(req.params.id, force);
    return res.status(204).send();
  }
}
