import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { requireAuth } from '@middleware/auth';
import { config } from '@config/env';

describe('requireAuth middleware', () => {
  const app = express();
  app.get('/open', (_req, res) => res.json({ ok: true }));
  app.get('/protected', requireAuth(), (_req, res) => res.json({ ok: true }));
  app.get('/faculty', requireAuth(['FACULTY']), (_req, res) => res.json({ ok: true }));

  const makeToken = (role: 'STUDENT'|'FACULTY'|'ADMIN') => jwt.sign({ sub: 'u1', role }, config.jwtSecret, { expiresIn: '1h' });

  it('returns 401 when missing or invalid token', async () => {
    const noHeader = await request(app).get('/protected');
    expect(noHeader.status).toBe(401);

    const bad = await request(app).get('/protected').set('Authorization', 'Bearer notatoken');
    expect(bad.status).toBe(401);
  });

  it('returns 403 when role not allowed', async () => {
    const token = makeToken('STUDENT');
    const res = await request(app).get('/faculty').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows when role is permitted', async () => {
    const token = makeToken('FACULTY');
    const res = await request(app).get('/faculty').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
