import { prisma } from '@utils/prisma';
import request from 'supertest';
import { app } from '../app';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';

const token = (sub: string, role: 'STUDENT'|'FACULTY'|'ADMIN') => jwt.sign({ sub, role }, config.jwtSecret);

describe('Admin delete safety', () => {
  let adminId: string;
  let victimId: string;
  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { email: 'admin+del@test.com', password: 'x', name: 'A', role: 'ADMIN' as any } });
    adminId = admin.id;
    const victim = await prisma.user.create({ data: { email: 'victim+del@test.com', password: 'x', name: 'V', role: 'STUDENT' as any } });
    victimId = victim.id;
    // Create dependent records
    const s = await prisma.survey.create({ data: { title: 'S', isAnonymous: false, createdBy: 'seed', questions: { items: [] } as any } as any });
    await prisma.response.create({ data: { surveyId: s.id, userId: victimId, data: {} as any } });
    await prisma.feedback.create({ data: { userId: victimId, content: 'c', rating: 5 } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  it('detaches responses and deletes feedbacks when deleting user', async () => {
    const res = await request(app)
      .delete(`/api/users/${victimId}`)
      .set('Authorization', `Bearer ${token(adminId, 'ADMIN')}`);
    expect(res.status).toBe(204);
    const resp = await prisma.response.findMany({ where: { userId: victimId } });
    expect(resp.length).toBe(0);
    const fb = await prisma.feedback.findMany({ where: { userId: victimId } });
    expect(fb.length).toBe(0);
  });
});
