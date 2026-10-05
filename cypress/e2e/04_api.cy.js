describe('Ceylon Journey - Backend REST API Endpoints', () => {
  it('GET /api/health returns online status and Haloluwa benchmark', () => {
    cy.request('/api/health').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.status).to.eq('online');
      expect(res.body.benchmark).to.have.property('location').and.contain('Haloluwa');
      expect(res.body.benchmark.max_radius_km).to.eq(25);
    });
  });

  it('GET /api/attractions returns attractions array', () => {
    cy.request('/api/attractions').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array').and.have.length.at.least(1);
      const first = res.body.data[0];
      expect(first).to.have.property('name');
      expect(first).to.have.property('category');
      expect(first).to.have.property('distance_km');
      expect(parseFloat(first.distance_km)).to.be.lte(25.0);
    });
  });

  it('GET /api/stats returns dashboard KPI metrics', () => {
    cy.request('/api/stats').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body.stats).to.have.property('total');
      expect(res.body.stats).to.have.property('nature');
      expect(res.body.stats).to.have.property('heritage');
      expect(res.body.stats).to.have.property('free');
    });
  });

  it('POST /api/auth/login validates credentials accurately', () => {
    // Bad credentials
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'invalid_user', password: 'wrong_password' },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.success).to.be.false;
    });

    // Valid credentials
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@Ceylon2026' }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property('token');
      expect(res.body.user).to.have.property('username', 'admin');
    });
  });

  it('GET /api/admins returns administrators list', () => {
    cy.request('/api/admins').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array').and.have.length.at.least(1);
    });
  });
});
