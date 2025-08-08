import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
  supportFile: 'cypress/support/e2e.ts',
  specPattern: 'cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on, config) {
      // Allow overriding API URL via CYPRESS_API_URL or .env
      config.env.API_URL = process.env.CYPRESS_API_URL || config.env.API_URL || 'http://localhost:4000'
      return config
    },
  },
})
