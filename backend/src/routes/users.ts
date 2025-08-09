import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { prisma } from '@utils/prisma';

const router = Router();

// List users (admin)
router.get('/', requireAuth(['ADMIN']), async (_req, res) => {
	const users = await prisma.user.findMany({
		orderBy: { createdAt: 'desc' },
		select: { id: true, email: true, name: true, role: true, locked: true, createdAt: true },
	});
	res.json({ count: users.length, items: users });
});

// Get user by id (admin)
router.get('/:id', requireAuth(['ADMIN']), async (req, res) => {
	const { id } = req.params;
	const u = await prisma.user.findUnique({
		where: { id },
		select: { id: true, email: true, name: true, role: true, locked: true, createdAt: true },
	});
	if (!u) return res.status(404).json({ error: 'User not found' });
	return res.json({ user: u });
});

// Admin can update limited fields on a user (e.g., role, locked)
router.patch('/:id', requireAuth(['ADMIN']), async (req, res) => {
	const { id } = req.params;
	const { role, locked } = req.body as { role?: 'STUDENT'|'FACULTY'|'ADMIN'; locked?: boolean };
	try {
		const data: any = {};
		if (role) {
			const allowed = ['STUDENT','FACULTY','ADMIN'] as const;
			if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
			data.role = role as any;
		}
		if (typeof locked === 'boolean') data.locked = locked;
		if (!Object.keys(data).length) return res.status(400).json({ error: 'No changes provided' });
		const updated = await prisma.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, createdAt: true } });
		return res.json({ user: updated });
	} catch (e: any) {
		if (e?.code === 'P2025') return res.status(404).json({ error: 'User not found' });
		return res.status(500).json({ error: 'Failed to update user' });
	}
});

	// Delete a user (admin) - safe cascade: detach responses, delete feedbacks, then delete user, audit log
	router.delete('/:id', requireAuth(['ADMIN']), async (req, res) => {
		const { id } = req.params;
		const actorId = (req as any).user?.sub as string | undefined;
		try {
			// Ensure exists
			const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
			if (!exists) return res.status(404).json({ error: 'User not found' });

			// Detach responses and delete feedbacks in a transaction
			await prisma.$transaction([
				prisma.response.updateMany({ where: { userId: id }, data: { userId: null } }),
				prisma.feedback.deleteMany({ where: { userId: id } }),
				prisma.user.delete({ where: { id } }),
			]);

			// Audit
			try {
				if (actorId) {
				// Use Prisma.JsonNull for explicit JSON null type
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { Prisma } = require('@prisma/client');
				await prisma.auditLog.create({ data: { actorId, action: 'USER_DELETE', targetId: id, meta: Prisma.JsonNull } });
				}
			} catch { /* best-effort audit */ }

			return res.status(204).send();
		} catch (e) {
			return res.status(500).json({ error: 'Failed to delete user' });
		}
	});

export default router;

