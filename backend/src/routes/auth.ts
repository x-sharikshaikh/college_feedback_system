import { Router, Request, Response } from 'express';
import { AuthController } from '@controllers/auth.controller';

const router = Router();
const controller = new AuthController();

router.post('/register', (req: Request, res: Response) => controller.register(req, res));
router.post('/login', (req: Request, res: Response) => controller.login(req, res));
router.get('/me', (req: Request, res: Response) => controller.me(req, res));

export default router;
