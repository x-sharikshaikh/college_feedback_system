import request from 'supertest';
import { app } from '../app';
import { prisma } from '@utils/prisma';

describe('Auth integration', () => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'Passw0rd!123';

  afterAll(async () => {
    try { await prisma.user.delete({ where: { email } }); } catch (e) { /* user may not exist */ }
    await prisma.$disconnect();
  });

  it('registers a new user and returns token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email,
  password,
  confirmPassword: password,
      name: 'Test User'
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
  });

  it('logs in and calls /me', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const token = login.body.token as string;
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('rejects bad credentials', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect([400, 401]).toContain(bad.status);
  });
});
