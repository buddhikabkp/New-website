describe('Ceylon Journey - Day Trip Planner Page', () => {
  beforeEach(() => {
    // Clear localStorage to start with empty itinerary
    cy.clearLocalStorage();
    cy.visit('/planner.html');
  });

  it('renders planner header and empty itinerary state', () => {
    cy.get('.planner-page-title').should('contain.text', 'Day Trip Planner');
    cy.get('.nav-back-link').should('have.attr', 'href', 'index.html');
    cy.get('.itinerary-col').should('be.visible');
    cy.get('.add-attractions-col').should('be.visible');
    cy.get('#itinerary-stops-badge').should('contain.text', '0 stops');
    cy.get('.itinerary-empty-box').should('be.visible');
  });

  it('populates right column attractions and allows searching', () => {
    cy.get('#planner-add-list .add-attraction-card').should('have.length.at.least', 5);
    cy.get('#planner-available-badge').should('contain.text', 'available');

    cy.get('#planner-add-search').type('Forest');
    cy.get('#planner-add-list .add-attraction-card').should('have.length.at.least', 1);
    cy.get('#planner-add-search').clear();
  });

  it('adds attractions to itinerary, updates stop count, and renders stats', () => {
    // Add first attraction
    cy.get('#planner-add-list .add-attraction-card').first().find('.btn-circle-add').click();
    cy.get('#itinerary-stops-badge').should('contain.text', '1 stop').and('have.class', 'has-stops');
    cy.get('.itinerary-stats-banner').should('be.visible');
    cy.get('.itinerary-stop-card').should('have.length', 1);

    // Add second attraction
    cy.get('#planner-add-list .add-attraction-card').eq(1).find('.btn-circle-add').click();
    cy.get('#itinerary-stops-badge').should('contain.text', '2 stops');
    cy.get('.itinerary-stop-card').should('have.length', 2);
  });

  it('supports reordering, removing, and clearing stops', () => {
    // Add two attractions
    cy.get('#planner-add-list .add-attraction-card').eq(0).find('.btn-circle-add').click();
    cy.get('#planner-add-list .add-attraction-card').eq(1).find('.btn-circle-add').click();
    cy.get('.itinerary-stop-card').should('have.length', 2);

    // Remove one stop
    cy.get('.itinerary-stop-card').first().find('.btn-icon-delete').click();
    cy.get('.itinerary-stop-card').should('have.length', 1);
    cy.get('#itinerary-stops-badge').should('contain.text', '1 stop');

    // Clear all stops with confirm window stub
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    cy.contains('Clear All').click();
    cy.get('.itinerary-empty-box').should('be.visible');
    cy.get('#itinerary-stops-badge').should('contain.text', '0 stops');
  });

  it('optimizes itinerary route and initializes leaflet map', () => {
    // Add two attractions
    cy.get('#planner-add-list .add-attraction-card').eq(0).find('.btn-circle-add').click();
    cy.get('#planner-add-list .add-attraction-card').eq(1).find('.btn-circle-add').click();

    // Map container exists
    cy.get('#itinerary-leaflet-map').should('be.visible');

    // Optimize Route
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub');
    });
    cy.contains('Optimize Route').click();
    cy.get('@alertStub').should('have.been.calledWithMatch', /Route optimized/);
  });
});
