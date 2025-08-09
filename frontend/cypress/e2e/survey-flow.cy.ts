describe('Survey flow: create → publish → submit → analytics', () => {
  const unique = Date.now();
  const staff = { name: 'Staff', email: `staff${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!', role: 'FACULTY' };
  const student = { name: 'Student', email: `student${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!' };
  const apiBase = Cypress.env('API_URL') || 'http://localhost:4000';

  it('covers full flow end-to-end', () => {
    // Seed users
    cy.request('POST', `${apiBase}/api/auth/register`, staff).its('status').should('eq', 201);
    cy.request('POST', `${apiBase}/api/auth/register`, student).its('status').should('eq', 201);

    // Staff login and create/publish survey via API
    let surveyId = '';
    const title = `E2E Flow ${unique}`;
    const questions = { items: [
      { type: 'likert', key: 'q1', label: 'Rate course', scale: 5 },
      { type: 'text', key: 'q2', label: 'Comments' },
    ]};

    cy.request('POST', `${apiBase}/api/auth/login`, { email: staff.email, password: staff.password }).then(res => {
      const staffToken = res.body.token as string;
      expect(staffToken).to.be.a('string');
      return cy.request({ method: 'POST', url: `${apiBase}/api/surveys`, body: { title, isAnonymous: true, questions }, headers: { Authorization: `Bearer ${staffToken}` } })
        .then(r => {
          surveyId = r.body.survey.id as string;
      // expose id for later chains
      cy.wrap(surveyId).as('surveyId');
          return cy.request({ method: 'POST', url: `${apiBase}/api/surveys/${surveyId}/publish`, body: { isPublished: true }, headers: { Authorization: `Bearer ${staffToken}` } });
        })
        .its('status').should('eq', 200);
    });

    // Student logs in via API, opens survey from list, submits
    cy.request('POST', `${apiBase}/api/auth/login`, { email: student.email, password: student.password }).then(res => {
      const studentToken = res.body.token as string;
      expect(studentToken).to.be.a('string');
      cy.visit('/surveys', { onBeforeLoad(win){ win.localStorage.setItem('token', studentToken); } });
      cy.contains('h2', 'Surveys', { timeout: 30000 }).should('be.visible');
      cy.contains('li', title, { timeout: 30000 }).should('exist').within(() => {
        cy.contains('a', 'Open').click();
      });
      cy.contains('h2', 'Survey', { timeout: 30000 }).should('be.visible');
      // Wait for form fields to render (use stable name-based selectors)
      cy.get('input[type="radio"][name="q1"]', { timeout: 30000 }).should('exist');
      // Likert 5 and text answer
      cy.get('input[type="radio"][name="q1"]').last().check({ force: true });
      cy.get('input[name="q2"]').type('Great!');
      cy.contains('button', /submit/i).click();
    });

    // Staff views analytics
    cy.request('POST', `${apiBase}/api/auth/login`, { email: staff.email, password: staff.password }).then(res => {
      const staffToken = res.body.token as string;
      cy.get<string>('@surveyId').then((id) => {
        // Wait until backend analytics reflect the submitted response to avoid UI race conditions
        cy.request({ method: 'GET', url: `${apiBase}/api/surveys/${id}/analytics`, headers: { Authorization: `Bearer ${staffToken}` } })
          .its('body.totalResponses').should('eq', 1);
        cy.visit(`/surveys/${id}` , { onBeforeLoad(win){ win.localStorage.setItem('token', staffToken); } });
      });
      cy.contains('h3', 'Analytics', { timeout: 30000 }).should('be.visible');
      cy.contains(/Total responses:\s*1/i, { timeout: 30000 }).should('exist');
    });
  });
});
