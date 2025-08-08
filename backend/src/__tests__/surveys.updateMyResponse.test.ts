import request from 'supertest';
import { app } from '../app';
import { prisma } from '@utils/prisma';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';

const token = (sub: string, role: 'STUDENT'|'FACULTY'|'ADMIN') => jwt.sign({ sub, role }, config.jwtSecret);

describe('updateMyResponse validation', () => {
  let studentId: string;
  let surveyId: string;
  beforeAll(async () => {
    const s = await prisma.user.create({ data: { email: 's+upd@test.com', password: 'x', name: 'S', role: 'STUDENT' as any } });
    studentId = s.id;
    const survey = await prisma.survey.create({ data: { title: 'T', isAnonymous: false, createdBy: 'seed', questions: { sections: [{ items: [{ key: 'q1', label: 'Req', type: 'text', required: true }] }] } as any } as any } as any);
    await prisma.survey.update({ where: { id: survey.id }, data: ({ isPublished: true, isCompleted: false } as any) as any });
    surveyId = survey.id;
    await prisma.response.create({ data: { surveyId: surveyId, userId: studentId, data: { q1: 'ok' } as any } });
  });
  afterAll(async ()=>{ await prisma.response.deleteMany({ where: { surveyId } }); await prisma.survey.deleteMany({ where: { id: surveyId } }); await prisma.user.deleteMany({ where: { id: studentId } }); });

  it('rejects when required answer missing', async () => {
    const res = await request(app)
      .put(`/api/surveys/${surveyId}/response`)
      .set('Authorization', `Bearer ${token(studentId, 'STUDENT')}`)
      .send({ data: { } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required answer/i);
  });
});
