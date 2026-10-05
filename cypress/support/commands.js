// ***********************************************
// Custom Cypress Commands for Ceylon Journey
// ***********************************************

Cypress.Commands.add('loginAdmin', (username = 'admin', password = 'Admin@Ceylon2026') => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password }
  }).then((res) => {
    const token = res.body.token || 'demo_token';
    const user = res.body.user || { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin' };
    cy.visit('/admin.html', {
      onBeforeLoad(win) {
        win.localStorage.setItem('ceylon_admin_token', token);
        win.localStorage.setItem('ceylon_admin_user', JSON.stringify(user));
      }
    });
  });
});
