import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '@utils/prisma';

const listSchema = Joi.object({
  role: Joi.string().valid('STUDENT','FACULTY','ADMIN').optional(),
  q: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

export class UsersController {
  async list(req: Request, res: Response) {
    const { error, value } = listSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.message });

    const where: any = {};
    if (value.role) where.role = value.role;
    if (value.q) {
      where.OR = [
        { email: { contains: value.q, mode: 'insensitive' } },
        { name: { contains: value.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: value.offset,
        take: value.limit,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items, total });
  }

  async detail(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [responses, feedbacks] = await Promise.all([
      prisma.response.count({ where: { userId: id } }),
      prisma.feedback.count({ where: { userId: id } }),
    ]);
    res.json({ user, stats: { responses, feedbacks } });
  }

  async update(req: Request, res: Response) {
    const actor = (req as any).user as { sub: string; role: 'ADMIN' };
    const { id } = req.params as { id: string };
    const schema = Joi.object({ role: Joi.string().valid('STUDENT','FACULTY','ADMIN').optional(), locked: Joi.boolean().optional() }).min(1);
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    if (id === actor.sub && value.role && value.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data: any = { };
    if (value.role) data.role = value.role as any;
    if (value.locked !== undefined) data.locked = value.locked;
    const updated = await prisma.user.update({ where: { id }, data: data as any });
    try {
      await (prisma as any).auditLog.create({ data: { actorId: actor.sub, action: 'USER_UPDATE', targetId: id, meta: { before: { role: user.role, locked: (user as any).locked ?? false }, after: { role: updated.role, locked: (updated as any).locked ?? false } } } });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('AuditLog USER_UPDATE failed', e);
    }
    return res.json({ user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role as any, locked: (updated as any).locked ?? false, createdAt: updated.createdAt } });
  }

  async remove(req: Request, res: Response) {
    const actor = (req as any).user as { sub: string; role: 'ADMIN' };
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Cascade: delete feedbacks, detach responses, then delete user
  await prisma.$transaction([
      prisma.feedback.deleteMany({ where: { userId: id } }),
      prisma.response.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);
    try {
      await (prisma as any).auditLog.create({ data: { actorId: actor.sub, action: 'USER_DELETE', targetId: id, meta: { email: user.email, role: user.role } } });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('AuditLog USER_DELETE failed', e);
    }
    return res.status(204).send();
  }
}
