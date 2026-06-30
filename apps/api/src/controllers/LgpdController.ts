import { Request, Response } from 'express';
import { LgpdService } from '../services/LgpdService';

export class LgpdController {
  async anonymizeClient(req: Request, res: Response) {
    const { id } = req.params;
    const lgpdService = new LgpdService();
    await lgpdService.anonymizeClient(id);
    return res.status(204).send();
  }

  async anonymizeUser(req: Request, res: Response) {
    const { id } = req.params;
    const lgpdService = new LgpdService();
    await lgpdService.anonymizeUser(id);
    return res.status(204).send();
  }

  async anonymizeContact(req: Request, res: Response) {
    const { id } = req.params;
    const lgpdService = new LgpdService();
    await lgpdService.anonymizeContact(id);
    return res.status(204).send();
  }
}
