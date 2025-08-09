import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { prisma } from '@utils/prisma';

// Minimal admin-only users router to satisfy Router.use
// You can wire real controllers later; this returns an empty list for now.
const router = Router();

router.get('/', requireAuth(['ADMIN']), (_req, res) => {
	res.json({ users: [] });
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

export default router;

