import { Request, Response } from 'express';
import { ClientService } from '../services/ClientService';

export class ClientController {
  async create(req: Request, res: Response) {
    const service = new ClientService();
    const client = await service.create(req.body);
    return res.status(201).json(client);
  }

  async list(req: Request, res: Response) {
    const service = new ClientService();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string;
    const showInactive = req.query.showInactive === 'true';

    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as string;
    const lastPurchaseMin = req.query.lastPurchaseMin
      ? Number(req.query.lastPurchaseMin)
      : undefined;
    const lastPurchaseMax = req.query.lastPurchaseMax
      ? Number(req.query.lastPurchaseMax)
      : undefined;
    const lastPurchaseNull = req.query.lastPurchaseNull === 'true' ? true : undefined;

    const result = await service.list(
      page,
      limit,
      search,
      showInactive,
      sortBy,
      sortOrder,
      lastPurchaseMin,
      lastPurchaseMax,
      lastPurchaseNull,
    );
    return res.json(result);
  }

  async getById(req: Request, res: Response) {
    const service = new ClientService();
    const showInactiveContacts = req.query.showInactiveContacts === 'true';
    const client = await service.getById(req.params.id, showInactiveContacts);
    return res.json(client);
  }

  async update(req: Request, res: Response) {
    const service = new ClientService();
    const client = await service.update(req.params.id, req.body);
    return res.json(client);
  }

  async addContact(req: Request, res: Response) {
    const service = new ClientService();
    const contact = await service.addContact(req.params.id, req.body);
    return res.status(201).json(contact);
  }

  async updateContact(req: Request, res: Response) {
    const service = new ClientService();
    const contact = await service.updateContact(req.params.contactId, req.body);
    return res.json(contact);
  }

  async removeContact(req: Request, res: Response) {
    const service = new ClientService();
    const force = req.query.force === 'true';
    await service.removeContact(req.params.contactId, force);
    return res.status(204).send();
  }

  async restoreContact(req: Request, res: Response) {
    const service = new ClientService();
    const contact = await service.restoreContact(req.params.contactId);
    return res.json(contact);
  }

  async restore(req: Request, res: Response) {
    const service = new ClientService();
    const client = await service.restore(req.params.id);
    return res.json(client);
  }

  async delete(req: Request, res: Response) {
    const service = new ClientService();
    const force = req.query.force === 'true';
    await service.delete(req.params.id, force);
    return res.status(204).send();
  }
}
