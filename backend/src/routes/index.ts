import { Router } from 'express';
import authRoutes from './auth';
import surveyRoutes from './surveys';
import { DashboardController } from '@controllers/dashboard.controller';
import { requireAuth } from '@middleware/auth';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/surveys', surveyRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
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
