import path from 'path';
import { Request, Response } from 'express';
import { StandardDrawingService } from '../services/StandardDrawingService';
import { AppError } from '../utils/AppError';

export class StandardDrawingController {
  async list(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const result = await service.list({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      type: req.query.type as string,
      categoryId: req.query.categoryId as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    });
    return res.json(result);
  }

  async nextCode(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const result = await service.nextCode();
    return res.json(result);
  }

  async getById(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const drawing = await service.getById(req.params.id);
    return res.json(drawing);
  }

  async create(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const drawing = await service.create(req.body);
    return res.status(201).json(drawing);
  }

  async update(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const drawing = await service.update(req.params.id, req.body);
    return res.json(drawing);
  }

  async delete(req: Request, res: Response) {
    const service = new StandardDrawingService();
    await service.delete(req.params.id);
    return res.status(204).send();
  }

  async uploadThumbnail(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const file = req.file;
    if (!file) throw new AppError('Arquivo de imagem obrigatório.', 400);

    const thumbnailPath = `/uploads/thumbnails/${file.filename}`;
    const drawing = await service.update(req.params.id, { thumbnail: thumbnailPath });
    return res.json(drawing);
  }

  async createVersion(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const userId = req.user!.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const cadFile = files?.['cadFile']?.[0];
    const docFile = files?.['docFile']?.[0];

    if (!cadFile && !docFile)
      throw new AppError('Envie ao menos um arquivo CAD ou Documento.', 400);

    const version = await service.createVersion(req.params.id, {
      filePath: cadFile ? `/uploads/cad/${cadFile.filename}` : null,
      docFilePath: docFile ? `/uploads/docs/${docFile.filename}` : undefined,
      changelog: req.body.changelog,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      createdBy: userId,
    });
    return res.status(201).json(version);
  }

  async listVersions(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const versions = await service.listVersions(req.params.id);
    return res.json(versions);
  }

  async getVersion(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const version = await service.getVersion(req.params.id, Number(req.params.version));
    return res.json(version);
  }

  async downloadVersion(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const version = await service.getVersion(req.params.id, Number(req.params.version));
    return res.download(path.join(process.cwd(), version.filePath), (err) => {
      if (err) throw new AppError('Erro ao baixar arquivo.', 500);
    });
  }

  async downloadDocVersion(req: Request, res: Response) {
    const service = new StandardDrawingService();
    const version = await service.getVersion(req.params.id, Number(req.params.version));
    if (!version.docFilePath) throw new AppError('Documento não encontrado para esta versão.', 404);
    return res.download(path.join(process.cwd(), version.docFilePath), (err) => {
      if (err) throw new AppError('Erro ao baixar documento.', 500);
    });
  }
}
