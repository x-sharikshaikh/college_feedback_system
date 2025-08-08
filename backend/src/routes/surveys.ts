import { Router } from 'express';
import { SurveysController } from '@controllers/surveys.controller';
import { requireAuth } from '@middleware/auth';
import { roleRateLimit } from '@middleware/rateLimit';

const router = Router();
const c = new SurveysController();

// Public listing for students is filtered inside controller via role; requireAuth to know role
router.get('/', requireAuth(), c.list);
router.get('/:id', requireAuth(), c.get);

// Create/Update/Publish - faculty or admin
router.post('/', requireAuth(['FACULTY', 'ADMIN']), c.create);
router.put('/:id', requireAuth(['FACULTY', 'ADMIN']), c.update);
router.post('/:id/publish', requireAuth(['FACULTY', 'ADMIN']), c.publish);

// Submit responses - any authenticated user
router.post('/:id/submit', requireAuth(), c.submit);

// Responses and analytics (faculty/admin)
router.get('/:id/responses', requireAuth(['FACULTY','ADMIN']), c.responses);
router.get('/:id/analytics', requireAuth(['FACULTY','ADMIN']), c.analytics);
router.get('/:id/export.csv', requireAuth(['FACULTY','ADMIN']), roleRateLimit({ FACULTY: { windowMs: 60_000, max: 6 }, ADMIN: { windowMs: 60_000, max: 12 } }), c.exportCsv);
router.get('/:id/export.xlsx', requireAuth(['FACULTY','ADMIN']), roleRateLimit({ FACULTY: { windowMs: 60_000, max: 3 }, ADMIN: { windowMs: 60_000, max: 6 } }), c.exportXlsx);
router.get('/:id/export.pdf', requireAuth(['FACULTY','ADMIN']), roleRateLimit({ FACULTY: { windowMs: 60_000, max: 6 }, ADMIN: { windowMs: 60_000, max: 12 } }), c.exportPdf);

export default router;
