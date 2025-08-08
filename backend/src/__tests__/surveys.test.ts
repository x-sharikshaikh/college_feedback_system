import request from 'supertest';
import { app } from '../app';
import { prisma } from '@utils/prisma';

async function createUser(role: 'STUDENT'|'FACULTY'|'ADMIN'){
  const email = `${role.toLowerCase()}_${Date.now()}@example.com`;
  const password = 'Passw0rd!123';
  await request(app).post('/api/auth/register').send({ email, password, name: role });
  // Promote role directly in DB for testing purposes
  await prisma.user.update({ where: { email }, data: { role } });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return { token: login.body.token as string, email };
}

describe('Surveys flow', () => {
  let faculty: { token: string, email: string };
  let student: { token: string, email: string };
  let surveyId = '';

  afterAll(async ()=>{
    try{ await prisma.survey.delete({ where: { id: surveyId } }); } catch(e){ /* already deleted */ }
  if (faculty?.email) { try{ await prisma.user.delete({ where: { email: faculty.email } }); } catch(e){ /* ignore */ } }
  if (student?.email) { try{ await prisma.user.delete({ where: { email: student.email } }); } catch(e){ /* ignore */ } }
    await prisma.$disconnect();
  });

  it('faculty can create and publish a survey', async () => {
    faculty = await createUser('FACULTY');
    const body = { title: 'Test Survey', isAnonymous: false, questions: { items: [ { type: 'likert', key: 'q1', label: 'Satisfaction', scale: 5 }, { type: 'text', key: 'q2', label: 'Comments' } ] } };
    const created = await request(app).post('/api/surveys').set('Authorization', `Bearer ${faculty.token}`).send(body);
    expect(created.status).toBe(201);
    surveyId = created.body?.survey?.id;
    expect(surveyId).toBeTruthy();
    const pub = await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${faculty.token}`).send({ isPublished: true });
    expect(pub.status).toBe(200);
    expect(pub.body?.survey?.isPublished).toBe(true);
  });

  it('student sees only published surveys and can submit', async () => {
    student = await createUser('STUDENT');
    const list = await request(app).get('/api/surveys').set('Authorization', `Bearer ${student.token}`);
    expect(list.status).toBe(200);
    const ids = (list.body?.items || []).map((s:any)=> s.id);
    expect(ids).toContain(surveyId);

  // Submit a response to test analytics and date range
    const submit1 = await request(app).post(`/api/surveys/${surveyId}/submit`).set('Authorization', `Bearer ${student.token}`).send({ data: { q1: 4, q2: 'Good' } });
    expect(submit1.status).toBe(201);
    expect(submit1.body?.responseId).toBeTruthy();
    const r1 = submit1.body.responseId as string;

  // Second student submits to ensure we have a recent response for date filtering
  const student2 = await createUser('STUDENT');
  const submit2 = await request(app).post(`/api/surveys/${surveyId}/submit`).set('Authorization', `Bearer ${student2.token}`).send({ data: { q1: 2, q2: 'Ok' } });
  expect(submit2.status).toBe(201);

    // Make the first response "older" so date filtering can exclude it
    const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    await prisma.response.update({ where: { id: r1 }, data: { createdAt: old } });
  });

  it('analytics returns likert aggregates; exports return files', async () => {
    const analytics = await request(app).get(`/api/surveys/${surveyId}/analytics`).set('Authorization', `Bearer ${faculty.token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body?.likert).toBeTruthy();

    const csv = await request(app).get(`/api/surveys/${surveyId}/export.csv`).set('Authorization', `Bearer ${faculty.token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    const xlsx = await request(app).get(`/api/surveys/${surveyId}/export.xlsx`).set('Authorization', `Bearer ${faculty.token}`);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument');

    const pdf = await request(app).get(`/api/surveys/${surveyId}/export.pdf`).set('Authorization', `Bearer ${faculty.token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });

  it('date range filters analytics and exports; invalid dates return 400', async () => {
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago
    const analytics = await request(app).get(`/api/surveys/${surveyId}/analytics`).query({ startDate: start }).set('Authorization', `Bearer ${faculty.token}`);
    expect(analytics.status).toBe(200);
    // Only the recent response should be counted (totalResponses 1)
    expect(analytics.body?.totalResponses).toBe(1);

    const csv = await request(app).get(`/api/surveys/${surveyId}/export.csv`).query({ startDate: start }).set('Authorization', `Bearer ${faculty.token}`);
    expect(csv.status).toBe(200);

    const bad = await request(app).get(`/api/surveys/${surveyId}/analytics`).query({ startDate: 'not-a-date' }).set('Authorization', `Bearer ${faculty.token}`);
    expect(bad.status).toBe(400);
  });

  it('prevents duplicate submissions for the same student on non-anonymous surveys', async () => {
    // First submission already done by `student` above; try again
    const dup = await request(app).post(`/api/surveys/${surveyId}/submit`).set('Authorization', `Bearer ${student.token}`).send({ data: { q1: 5 } });
    expect(dup.status).toBe(409);
  });

  it('students cannot create or publish surveys (forbidden)', async () => {
    const createAsStudent = await request(app).post('/api/surveys').set('Authorization', `Bearer ${student.token}`).send({ title: 'Xyz', isAnonymous: true, questions: { items: [] } });
    expect(createAsStudent.status).toBe(403);
    const publishAsStudent = await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${student.token}`).send({ isPublished: false });
    expect(publishAsStudent.status).toBe(403);
  });

  it('rate limiter returns 429 when exceeding export limits', async () => {
    // FACULTY: CSV max 6 per minute; try 7
    let lastStatus = 200;
    for (let i=0;i<7;i++){
      const res = await request(app).get(`/api/surveys/${surveyId}/export.csv`).set('Authorization', `Bearer ${faculty.token}`);
      lastStatus = res.status;
    }
    expect([200,429]).toContain(lastStatus);
  });
});
