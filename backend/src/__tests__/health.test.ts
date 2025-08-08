import request from 'supertest';
import { app } from '../app';

describe('Health and protected routes', () => {
  it('GET /api/health -> 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/protected without token -> 401', async () => {
    const res = await request(app).get('/api/protected');
    expect(res.status).toBe(401);
  });
});
