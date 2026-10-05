// ***********************************************************
// This is processed and loaded automatically before test files.
// ***********************************************************

import './commands';

// Prevent uncaught exceptions from failing tests if third-party libraries (e.g. Leaflet) throw non-critical warnings
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});
