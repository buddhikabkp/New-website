describe('Ceylon Journey - Landing Page & Discovery', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('renders hero section, brand titles, and statistics counters', () => {
    cy.get('.hero-title').should('contain.text', 'Ceylon Journey');
    cy.get('.hero-subtitle-tag').should('contain.text', 'Kandy');
    cy.get('.hero-stats-row').within(() => {
      cy.contains('Verified Sites').should('be.visible');
      cy.contains('Coverage Radius').should('be.visible');
      cy.contains('Day Planner').should('be.visible');
    });
    cy.get('.hero-cta-group').within(() => {
      cy.contains('Plan My Day Trip').should('have.attr', 'href', 'planner.html');
      cy.contains('Browse Attractions').should('be.visible');
    });
  });

  it('loads and displays attractions grid', () => {
    cy.get('#attractions-grid').should('be.visible');
    cy.get('.attraction-card').should('have.length.at.least', 5);
    cy.get('#attractions-count').should('contain.text', 'attractions found');
  });

  it('filters attractions by search keyword', () => {
    cy.get('#search-input').type('Temple');
    cy.get('.attraction-card').should('have.length.at.least', 1);
    cy.get('.attraction-card').first().within(() => {
      cy.get('.card-title').should('contain.text', 'Temple');
    });
    cy.get('#search-input').clear();
  });

  it('filters attractions by category pills', () => {
    cy.get('.cat-filter-btn[data-category="Nature"]').click();
    cy.get('.cat-filter-btn[data-category="Nature"]').should('have.class', 'active');
    cy.get('.attraction-card').each(($card) => {
      cy.wrap($card).find('.badge-category-float').should('contain.text', 'Nature');
    });

    cy.get('.cat-filter-btn[data-category="all"]').click();
    cy.get('.cat-filter-btn[data-category="all"]').should('have.class', 'active');
  });

  it('opens and navigates details modal tabs', () => {
    cy.get('.attraction-card').first().within(() => {
      cy.get('.btn-details-link').click();
    });

    cy.get('#details-modal').should('have.class', 'active');
    cy.get('#modal-attraction-title').should('not.be.empty');

    // Overview Tab
    cy.get('#tab-content-overview').should('be.visible');

    // Accessibility Tab
    cy.get('.modal-tab-btn[data-tab="accessibility"]').click();
    cy.get('#tab-content-accessibility').should('be.visible');

    // Travel Tips Tab
    cy.get('.modal-tab-btn[data-tab="tips"]').click();
    cy.get('#tab-content-tips').should('be.visible');

    // Map Tab
    cy.get('.modal-tab-btn[data-tab="map"]').click();
    cy.get('#tab-content-map').should('be.visible');

    // Close Modal
    cy.get('#details-modal .btn-modal-close').click();
    cy.get('#details-modal').should('not.have.class', 'active');
  });

  it('adds and removes attractions to itinerary from landing card', () => {
    cy.get('.attraction-card').first().find('.btn-add-plan').click();
    cy.get('.attraction-card').first().find('.btn-add-plan').should('have.class', 'added').and('contain.text', 'Added');
    cy.get('.attraction-card').first().find('.btn-add-plan').click();
    cy.get('.attraction-card').first().find('.btn-add-plan').should('not.have.class', 'added').and('contain.text', '+ Add to Plan');
  });

  it('opens admin login modal on header admin button click', () => {
    cy.get('#landing-admin-btn').click();
    cy.get('#landing-admin-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#landing-admin-modal .btn-modal-close').click();
    cy.get('#landing-admin-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });
});
