import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { Prisma } from '@prisma/client';
const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: 409, code: 'CONFLICT', message: 'A record with this value already exists' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Record not found' },
  P2003: { status: 400, code: 'FOREIGN_KEY', message: 'Referenced record does not exist' },
  P2014: { status: 400, code: 'INVALID_RELATION', message: 'Invalid relation constraint' },
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    });
  }

  if (err instanceof MulterError) {
    const multerMessages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File exceeds maximum size (20MB)',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FILE_COUNT: 'Too many files',
    };
    return res.status(400).json({
      status: 'error',
      code: 'MULTER_ERROR',
      message: multerMessages[err.code] || `Upload error: ${err.message}`,
    });
  }

  if (err instanceof PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERROR_MAP[err.code];
    if (mapped) {
      return res.status(mapped.status).json({
        status: 'error',
        code: mapped.code,
        message: mapped.message,
      });
    }
    logger.error({ prismaCode: err.code, meta: err.meta }, err.message);
    return res.status(500).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'A database error occurred',
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
    });
  }

  logger.error(err);

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}
