import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ConfigService } from '../services/ConfigService';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

const sessionExpirySchema = z.enum(['2h', '4h', '8h', '12h', '24h', '48h', 'never']);

const searchSettingsSchema = z.object({
  algorithm: z.enum(['DICE', 'JACCARD']),
  threshold: z.number().min(0.01).max(0.99),
});

export class ConfigController {
  async getAll(_req: Request, res: Response) {
    const service = new ConfigService();
    const configs = await service.getAll();
    return res.json(configs);
  }

  async getByKey(req: Request, res: Response) {
    const service = new ConfigService();
    const config = await service.getByKey(req.params.key);
    return res.json(config);
  }

  async update(req: Request, res: Response) {
    const { key } = req.params;
    const { value } = req.body;

    try {
      if (key === 'session_expiry') {
        sessionExpirySchema.parse(value);
      } else if (key === 'search_settings') {
        searchSettingsSchema.parse(value);
      } else if (key === 'target_approval_rate') {
        z.number().min(1).max(100).parse(value);
      } else if (key === 'default_markup_margin') {
        z.number().min(0).max(100).parse(value);
      } else if (key === 'minimum_margin') {
        z.number().min(0).max(100).parse(value);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(
          `Validation failed: ${error.issues.map((e) => e.message).join(', ')}`,
          400,
        );
      }
      throw error;
    }

    const service = new ConfigService();
    const config = await service.update(key, value);
    return res.json(config);
  }

  async getCompanyConfig(_req: Request, res: Response) {
    let config = await prisma.companyConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          id: 'default',
          companyName: 'Minha Empresa',
          document: '',
        },
      });
    }
    return res.json(config);
  }

  async updateCompanyConfig(req: Request, res: Response) {
    const config = await prisma.companyConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...req.body, updatedById: req.user!.id },
      update: { ...req.body, updatedById: req.user!.id },
    });
    return res.json(config);
  }
}
