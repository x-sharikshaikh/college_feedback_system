import { Router } from 'express';
import authRoutes from './auth';
import surveyRoutes from './surveys';
import { DashboardController } from '@controllers/dashboard.controller';
import userRoutes from './users';
import { requireAuth } from '@middleware/auth';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/surveys', surveyRoutes);
router.use('/users', userRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// readiness (e.g., DB check)
router.get('/ready', async (_req, res) => {
  try {
    // Simple DB ping
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prisma } = require('@utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (e) {
    res.status(503).json({ status: 'not-ready' });
  }
});

// Example protected route for quick smoke testing
router.get('/protected', requireAuth(), (req, res) => {
  const user = (req as any).user;
  res.json({ ok: true, user });
});

// Dashboard summary
const dashboard = new DashboardController();
router.get('/dashboard/summary', requireAuth(), (req, res) => dashboard.summary(req, res));

export default router;
