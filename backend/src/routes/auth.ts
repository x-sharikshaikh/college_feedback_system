import { Router, Request, Response } from 'express';
import { AuthController } from '@controllers/auth.controller';
import { requireAuth } from '@middleware/auth';

const router = Router();
const controller = new AuthController();

router.post('/register', (req: Request, res: Response) => controller.register(req, res));
router.post('/login', (req: Request, res: Response) => controller.login(req, res));
// Protected: returns the authenticated user's profile
router.get('/me', requireAuth(), (req: Request, res: Response) => controller.me(req, res));

export default router;
