import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { config } from '@config/env';
import { router } from '@routes/index';

export const app = express();

// Attach a request id for tracing
app.use((req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Add request id to logs
morgan.token('id', (req) => (req as any).id);
app.use(morgan(config.nodeEnv === 'production' ? ':id :method :url :status - :response-time ms' : ':id :method :url :status - :response-time ms'));

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', router);

app.get('/', (_req, res) => {
  res.json({ name: 'College Feedback API', status: 'ok' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Centralized error handler
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (config.nodeEnv !== 'production') {
    console.error(err);
  }
  res.status(status).json({ error: message });
});

export default app;
