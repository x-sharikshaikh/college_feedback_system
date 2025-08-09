describe('College Feedback System - Smoke E2E', () => {
  const unique = Date.now();
  const staff = { name: 'Staff', email: `staff${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!', role: 'FACULTY' };
  const student = { name: 'Student', email: `student${unique}@test.com`, password: 'Passw0rd!', confirmPassword: 'Passw0rd!' };

  const apiBase = Cypress.env('API_URL') || 'http://localhost:4000';

  it('loads app and surveys list for an authenticated user (smoke)', () => {
    // Register a student and log in via API, then visit the app with token
    cy.request('POST', `${apiBase}/api/auth/register`, student).its('status').should('eq', 201);
    cy.request('POST', `${apiBase}/api/auth/login`, { email: student.email, password: student.password })
      .then(res => {
        const token = res.body.token as string;
        expect(token).to.be.a('string');
        cy.visit('/', { onBeforeLoad(win){ win.localStorage.setItem('token', token); } });
        // Go straight to surveys page and expect header to render
        cy.visit('/surveys');
        cy.contains('h2', 'Surveys', { timeout: 20000 }).should('be.visible');
      });
  });
});
