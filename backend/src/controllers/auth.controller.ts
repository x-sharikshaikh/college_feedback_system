import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '@utils/prisma';
import { config } from '@config/env';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('STUDENT', 'FACULTY', 'ADMIN').default('STUDENT'),
}).custom((val, helpers)=> {
  if (val.password !== val.confirmPassword) return helpers.error('any.invalid');
  return val;
}, 'password match');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export class AuthController {
  async register(req: Request, res: Response) {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    // Normalize email
    const email = String(value.email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(value.password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, name: value.name, role: value.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  }

  async login(req: Request, res: Response) {
  const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

  // Normalize email
  const email = String(value.email).trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if ((user as any).locked) return res.status(403).json({ error: 'Account is locked' });

  const ok = await bcrypt.compare(value.password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    return res.json({ user: safeUser, token });
  }

  async me(req: Request, res: Response) {
    const authUser = (req as any).user as { sub: string; role: 'STUDENT' | 'FACULTY' | 'ADMIN' } | undefined;
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  }
}
