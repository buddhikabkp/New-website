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

  it('intercepts guest users on hero CTA click with auth modal and blur effect', () => {
    cy.get('#hero-plan-trip-btn').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#user-auth-notice').should('be.visible');
    cy.get('#user-auth-modal .btn-modal-close').click();
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });

  it('intercepts guest users on Open Itinerary Planner link with auth modal and blur effect', () => {
    cy.get('#meta-open-planner-link').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#user-auth-notice').should('be.visible');
    cy.get('#user-auth-modal .btn-modal-close').click();
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });

  it('intercepts guest users on add to plan click with auth modal and blur effect', () => {
    cy.get('.attraction-card').first().find('.btn-add-plan').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#user-auth-notice').should('be.visible');
    cy.get('#user-auth-modal .btn-modal-close').click();
    cy.get('#user-auth-modal').should('not.have.class', 'active');
  });

  it('opens user auth modal from header and toggles between Log In and Sign Up tabs', () => {
    cy.get('#landing-user-auth-btn').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#user-login-pane').should('be.visible');

    // Switch to Sign Up
    cy.get('#tab-btn-user-register').click();
    cy.get('#user-register-pane').should('be.visible');
    cy.get('#tab-btn-user-register').should('have.class', 'active');

    // Switch back to Log In
    cy.get('#tab-btn-user-login').click();
    cy.get('#user-login-pane').should('be.visible');
    cy.get('#tab-btn-user-login').should('have.class', 'active');

    // Close
    cy.get('#user-auth-modal .btn-modal-close').click();
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });

  it('does not disappear when clicking outside the auth popup', () => {
    cy.get('#landing-user-auth-btn').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');

    // Type into username input
    cy.get('#user-login-id').type('buddhikabkp');

    // Click outside on the modal backdrop (coordinates 15, 15)
    cy.get('#user-auth-modal').click(15, 15);

    // Modal should NOT disappear and typed text must be preserved
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#user-login-id').should('have.value', 'buddhikabkp');

    // Only closes when clicking Cancel
    cy.get('#user-login-form').contains('Cancel').click();
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });

  it('registers new user via modal, updates header nav, and allows adding/removing attractions', () => {
    const uniqueUser = `tourist_${Date.now()}`;
    const uniqueEmail = `${uniqueUser}@test.lk`;

    // Click Sign In on landing page header
    cy.get('#landing-user-auth-btn').click();
    cy.get('#user-auth-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');

    // Switch to Create Account
    cy.get('#tab-btn-user-register').click();
    cy.get('#user-register-username').type(uniqueUser);
    cy.get('#user-register-email').type(uniqueEmail);
    cy.get('#user-register-password').type('Ceylon@2026');
    cy.get('#user-register-submit-btn').click();

    // Verify modal closes and user pill appears in header
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
    cy.get('#user-profile-pill').should('be.visible');
    cy.get('#user-display-username').should('contain.text', uniqueUser);

    // Add and remove attraction
    cy.get('.attraction-card').first().find('.btn-add-plan').click();
    cy.get('.attraction-card').first().find('.btn-add-plan').should('have.class', 'added').and('contain.text', 'Added');
    cy.get('.attraction-card').first().find('.btn-add-plan').click();
    cy.get('.attraction-card').first().find('.btn-add-plan').should('not.have.class', 'added').and('contain.text', '+ Add to Plan');

    // Sign out
    cy.get('#landing-user-logout-btn').click();
    cy.get('#landing-user-auth-btn').should('be.visible');
    cy.get('#user-profile-pill').should('not.exist');
  });

  it('opens admin login modal on header admin button click', () => {
    cy.get('#landing-admin-btn').click();
    cy.get('#landing-admin-modal').should('have.class', 'active');
    cy.get('body').should('have.class', 'landing-modal-open');
    cy.get('#landing-admin-modal .btn-modal-close').click();
    cy.get('#landing-admin-modal').should('not.have.class', 'active');
    cy.get('body').should('not.have.class', 'landing-modal-open');
  });

  it('resets older itinerary when a new user registers or logs in', () => {
    // Seed an older itinerary in localStorage
    cy.window().then((win) => {
      const mockOlderItinerary = [
        { id: 999, name: 'Previous User Old Stop', category: 'Nature', distance_km: 10 }
      ];
      win.localStorage.setItem('ceylon_journey_itinerary', JSON.stringify(mockOlderItinerary));
    });
    cy.visit('/index.html');

    // Confirm older itinerary existed in localStorage
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem('ceylon_journey_itinerary') || '[]');
      expect(stored.length).to.be.greaterThan(0);
    });

    // Register new user
    const newUser = `resetuser_${Date.now()}`;
    cy.get('#landing-user-auth-btn').click();
    cy.get('#tab-btn-user-register').click();
    cy.get('#user-register-username').type(newUser);
    cy.get('#user-register-email').type(`${newUser}@reset.lk`);
    cy.get('#user-register-password').type('Ceylon@2026');
    cy.get('#user-register-submit-btn').click();

    // Wait for registration to complete and modal to close
    cy.get('#user-auth-modal').should('not.have.class', 'active');
    cy.get('#user-profile-pill').should('be.visible');

    // Verify older itinerary is completely reset
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem('ceylon_journey_itinerary') || '[]');
      expect(stored).to.have.length(0);
    });
  });
});
