/**
 * Test Setup and Global Configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = 5999;
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_NAME = 'company'; // Use same DB for now

// Increase timeout for DB operations
jest.setTimeout(30000);

// Global test utilities
global.testHelpers = {
    generateTestEmail: () => `test_${Date.now()}@test.com`,
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup after all tests
afterAll(async () => {
    // Close any open handles
    await new Promise(resolve => setTimeout(resolve, 500));
});
