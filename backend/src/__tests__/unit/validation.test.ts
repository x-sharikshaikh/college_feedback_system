import express from 'express';
import request from 'supertest';
import { SurveysController } from '@controllers/surveys.controller';
import { requireAuth } from '@middleware/auth';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';

describe('Surveys validation', () => {
  const c = new SurveysController();
  const app = express();
  app.use(express.json());
  app.post('/surveys', requireAuth(['FACULTY','ADMIN']), (req, res) => c.create(req, res));
  app.put('/surveys/:id', requireAuth(['FACULTY','ADMIN']), (req, res) => c.update(req, res));
  app.post('/surveys/:id/publish', requireAuth(['FACULTY','ADMIN']), (req, res) => c.publish(req, res));
  app.post('/surveys/:id/submit', requireAuth(), (req, res) => c.submit(req, res));

  const token = jwt.sign({ sub: 'u1', role: 'FACULTY' }, config.jwtSecret);
  const student = jwt.sign({ sub: 'u2', role: 'STUDENT' }, config.jwtSecret);

  it('create requires title and questions object', async () => {
    const res = await request(app).post('/surveys').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('update requires at least one field', async () => {
    const res = await request(app).put('/surveys/s1').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('publish requires boolean flag', async () => {
    const res = await request(app).post('/surveys/s1/publish').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('submit requires data object', async () => {
    const res = await request(app).post('/surveys/s1/submit').set('Authorization', `Bearer ${student}`).send({});
    expect(res.status).toBe(400);
  });
});
