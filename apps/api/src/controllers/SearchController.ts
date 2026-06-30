import { Request, Response } from 'express';
import { SearchService } from '../services/SearchService';

export class SearchController {
  async search(req: Request, res: Response) {
    const service = new SearchService();
    const query = (req.query.query as string) || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = (req.query.type as any) || 'ALL';

    const results = await service.search(query, type);
    return res.json(results);
  }
}
