import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '@config/env';
import { router } from '@routes/index';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

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

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
