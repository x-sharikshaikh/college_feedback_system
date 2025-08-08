import { Router } from 'express';
import { UsersController } from '@controllers/users.controller';
import { requireAuth } from '@middleware/auth';

const router = Router();
const ctrl = new UsersController();

// Admin-only user management
router.get('/', requireAuth(['ADMIN']), (req, res) => ctrl.list(req, res));
router.get('/:id', requireAuth(['ADMIN']), (req, res) => ctrl.detail(req, res));
router.patch('/:id', requireAuth(['ADMIN']), (req, res) => ctrl.update(req, res));
router.delete('/:id', requireAuth(['ADMIN']), (req, res) => ctrl.remove(req, res));

export default router;
