import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class ConfigService {
  private static cache: Record<string, unknown> = {};
  private static cacheLoaded = false;

  private static defaults: Record<string, unknown> = {
    system_name: 'CPQ/DMS',
    session_expiry: '12h',
    search_settings: { algorithm: 'DICE', threshold: 0.4 },
    target_approval_rate: 60,
    default_markup_margin: 20,
    minimum_margin: 15,
    max_item_discount_pct: 25,
    max_total_discount_pct: 30,
    min_total_margin_pct: 15,
    discount_requires_approval: null,
    price_rounding_rule: 'NONE',
  };

  private async ensureCache() {
    if (ConfigService.cacheLoaded) return;
    try {
      const configs = await prisma.systemConfig.findMany();
      for (const config of configs) {
        ConfigService.cache[config.key] = config.value;
      }
      ConfigService.cacheLoaded = true;
    } catch (error) {
      ConfigService.cacheLoaded = false;
    }
  }

  async getByKey(key: string) {
    await this.ensureCache();

    let value = ConfigService.cache[key];

    if (value === undefined) {
      const config = await prisma.systemConfig.findUnique({ where: { key } });
      if (config) {
        ConfigService.cache[key] = config.value;
        value = config.value;
      } else {
        const defaultValue = ConfigService.defaults[key];
        if (defaultValue !== undefined) {
          // Persist the default value in the database for consistency
          await prisma.systemConfig.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { key, value: defaultValue as any },
          });
          ConfigService.cache[key] = defaultValue;
          value = defaultValue;
        } else {
          throw new AppError('Configuration not found', 404);
        }
      }
    }

    return { key, value };
  }

  async getAll() {
    await this.ensureCache();

    // Ensure all default configs are loaded and created if missing
    for (const key of Object.keys(ConfigService.defaults)) {
      if (ConfigService.cache[key] === undefined) {
        await this.getByKey(key);
      }
    }

    return Object.entries(ConfigService.cache).map(([key, value]) => ({
      key,
      value,
    }));
  }

  async update(key: string, value: unknown) {
    const config = await prisma.systemConfig.upsert({
      where: { key },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: { value: value as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: { key, value: value as any },
    });

    await this.ensureCache();
    ConfigService.cache[key] = value;
    return config;
  }
}
