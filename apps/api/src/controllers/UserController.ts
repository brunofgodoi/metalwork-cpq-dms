import { Request, Response } from 'express';
import { UserService } from '../services/UserService';

export class UserController {
  async create(req: Request, res: Response) {
    const userService = new UserService();
    const user = await userService.create(req.body);
    return res.status(201).json(user);
  }

  async list(req: Request, res: Response) {
    const userService = new UserService();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const users = await userService.list(page, limit);
    return res.json(users);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const userService = new UserService();
    await userService.delete(id);
    return res.status(204).send();
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userService = new UserService();
    const user = await userService.update(id, req.body);
    return res.json(user);
  }
}
