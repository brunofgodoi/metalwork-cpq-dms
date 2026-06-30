import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import 'express-async-errors';

import path from 'path';

import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { routes } from './routes';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(routes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'CPQ/DMS API',
    timestamp: new Date().toISOString(),
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Route ${_req.method} ${_req.originalUrl} not found`,
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  errorHandler(err, _req, res, _next);
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  logger.info(`[API] Server is running on http://localhost:${PORT}`);
});
