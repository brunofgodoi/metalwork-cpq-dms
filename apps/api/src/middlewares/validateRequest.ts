import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error && (error instanceof ZodError || error.name === 'ZodError')) {
        const issues = error.errors || error.issues || [];
        next(
          new AppError(`Validation failed: ${issues.map((e: any) => e.message).join(', ')}`, 400),
        );
      } else {
        next(error);
      }
    }
  };
};
