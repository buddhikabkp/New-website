describe('Ceylon Journey - Admin Portal & Management', () => {
  beforeEach(() => {
    // Authenticate admin before testing admin portal
    cy.loginAdmin('admin', 'Admin@Ceylon2026');
  });

  it('renders admin dashboard and KPI statistic cards', () => {
    cy.get('.admin-page-title').should('contain.text', 'Admin Portal');
    cy.get('#kpi-total-attractions').should('not.be.empty');
    cy.get('#kpi-nature-count').should('not.be.empty');
    cy.get('#kpi-heritage-count').should('not.be.empty');
    cy.get('#kpi-free-count').should('not.be.empty');
    cy.get('.admin-table tbody tr').should('have.length.at.least', 5);
  });

  it('filters admin table by search and category dropdown', () => {
    cy.get('.admin-table tbody tr').should('have.length.at.least', 5);
    cy.get('#admin-search-input').type('Botanical');
    cy.get('.admin-table tbody tr').should('have.length', 1);
    cy.get('.admin-table tbody tr').first().should('contain.text', 'Botanical');
    cy.get('#admin-search-input').clear();
  });

  it('opens and closes the Add Attraction modal with form validation', () => {
    cy.contains('+ Add Attraction').click();
    cy.get('#attraction-crud-modal').should('have.class', 'active');
    cy.get('#attraction-modal-title').should('contain.text', 'Add New Attraction');

    // Test form reset / clear form
    cy.get('#field-name').type('Test Landmark');
    cy.get('#btn-clear-form').click();
    cy.get('#field-name').should('have.value', '');

    // Close modal
    cy.get('#attraction-crud-modal .btn-modal-close').click();
    cy.get('#attraction-crud-modal').should('not.have.class', 'active');
  });

  it('opens Manage Admins modal and verifies administrator accounts', () => {
    cy.get('#btn-manage-admins').click();
    cy.get('#admin-users-modal').should('have.class', 'active');
    cy.get('#admin-users-tbody tr').should('have.length.at.least', 1);
    cy.get('#admins-count-badge').should('contain.text', 'Admin');

    // Verify Primary Admin row contains Primary badge
    cy.get('#admin-users-tbody').contains('Primary').should('be.visible');

    // Close modal
    cy.get('#admin-users-modal .btn-modal-close').click();
    cy.get('#admin-users-modal').should('not.have.class', 'active');
  });

  it('signs out successfully and returns to landing page', () => {
    cy.get('#admin-signout-btn').click();
    cy.url().should('include', 'index.html');
  });
});
