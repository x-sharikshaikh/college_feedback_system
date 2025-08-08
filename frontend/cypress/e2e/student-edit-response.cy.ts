describe('Student edits submission flow', () => {
  const unique = Date.now();
  const staff = { name: 'Staff', email: `staff${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!', role: 'FACULTY' };
  const student = { name: 'Student', email: `student${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!' };
  const apiBase = Cypress.env('API_URL') || 'http://localhost:4000';

  it('allows a student to edit their existing submission on non-anonymous surveys', () => {
    // Seed users
    cy.request('POST', `${apiBase}/api/auth/register`, staff).its('status').should('eq', 201);
    cy.request('POST', `${apiBase}/api/auth/register`, student).its('status').should('eq', 201);

    // Create identified survey
    let surveyId = '';
    const title = `Edit Flow ${unique}`;
    const questions = { items: [
      { type: 'likert', key: 'q1', label: 'Rate course', scale: 5, required: true },
      { type: 'text', key: 'q2', label: 'Comments' },
    ]};

    cy.request('POST', `${apiBase}/api/auth/login`, { email: staff.email, password: staff.password }).then(res => {
      const staffToken = res.body.token as string;
      return cy.request({ method: 'POST', url: `${apiBase}/api/surveys`, body: { title, isAnonymous: false, questions }, headers: { Authorization: `Bearer ${staffToken}` } })
        .then(r => {
          surveyId = r.body.survey.id as string;
          cy.wrap(surveyId).as('surveyId');
          return cy.request({ method: 'POST', url: `${apiBase}/api/surveys/${surveyId}/publish`, body: { isPublished: true }, headers: { Authorization: `Bearer ${staffToken}` } });
        })
        .its('status').should('eq', 200);
    });

    // Student submits first
    cy.request('POST', `${apiBase}/api/auth/login`, { email: student.email, password: student.password }).then(res => {
      const studentToken = res.body.token as string;
      expect(studentToken).to.be.a('string');
      cy.visit('/surveys', { onBeforeLoad(win){ win.localStorage.setItem('token', studentToken); } });
      cy.contains('li', title, { timeout: 30000 }).should('exist').within(() => {
        cy.contains('a', 'Open').click();
      });
      cy.contains('h2', 'Survey', { timeout: 30000 }).should('be.visible');
      cy.get('input[type="radio"][name="q1"]').last().check({ force: true });
      cy.contains('.font-medium', 'Comments').parent().find('input').type('First!');
      cy.contains('button', /submit/i).click();
    });

    // Student revisits Surveys list, sees Edit button, edits and saves
    cy.request('POST', `${apiBase}/api/auth/login`, { email: student.email, password: student.password }).then(res => {
      const studentToken = res.body.token as string;
      cy.visit('/surveys', { onBeforeLoad(win){ win.localStorage.setItem('token', studentToken); } });
      cy.contains('li', title, { timeout: 30000 }).within(() => {
        cy.contains('a', 'Edit', { timeout: 30000 }).should('be.visible').click();
      });
      cy.contains('h2', 'Survey', { timeout: 30000 }).should('be.visible');
      cy.contains('You already submitted this survey').should('be.visible');
      cy.contains('.font-medium', 'Comments').parent().find('input').clear().type('Edited!');
      cy.contains('button', /save changes/i).click();
    });
  });
});
