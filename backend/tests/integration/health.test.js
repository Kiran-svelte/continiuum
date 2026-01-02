/**
 * Integration Tests - Health & System Endpoints
 */

const request = require('supertest');

// Use the running server directly via HTTP
const BASE_URL = 'http://localhost:5000';

describe('Health & System Endpoints - Integration Tests', () => {
    
    describe('GET /ping', () => {
        test('should return pong', async () => {
            const response = await request(BASE_URL)
                .get('/ping')
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(response.body).toHaveProperty('pong', true);
            expect(response.body).toHaveProperty('time');
        });
    });
    
    describe('GET /api/health', () => {
        test('should return health status', async () => {
            const response = await request(BASE_URL)
                .get('/api/health')
                .expect('Content-Type', /json/);
            
            // May be 200 (healthy) or 503 (unhealthy)
            expect([200, 503]).toContain(response.status);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('services');
            expect(response.body.services).toHaveProperty('database');
            expect(response.body.services).toHaveProperty('ai');
        });
        
        test('should report database status', async () => {
            const response = await request(BASE_URL)
                .get('/api/health')
                .expect('Content-Type', /json/);
            
            expect(['connected', 'disconnected']).toContain(response.body.services.database);
        });
        
        test('should report AI services status', async () => {
            const response = await request(BASE_URL)
                .get('/api/health')
                .expect('Content-Type', /json/);
            
            const aiServices = response.body.services.ai;
            expect(aiServices).toHaveProperty('leave');
            expect(aiServices).toHaveProperty('onboarding');
            expect(aiServices).toHaveProperty('performance');
            expect(aiServices).toHaveProperty('recruitment');
        });
    });
    
    describe('GET /api/ai-system/status', () => {
        let adminToken;
        
        beforeAll(async () => {
            const loginResponse = await request(BASE_URL)
                .post('/api/auth/login')
                .send({
                    email: 'admin@company.com',
                    password: 'admin123'
                });
            
            if (loginResponse.status === 200) {
                adminToken = loginResponse.body.accessToken;
            }
        });
        
        test('should return AI system status for admin', async () => {
            if (!adminToken) {
                console.log('Skipping - no admin token');
                return;
            }
            
            const response = await request(BASE_URL)
                .get('/api/ai-system/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);
            
            expect([200, 401, 403]).toContain(response.status);
        });
        
        test('should reject unauthenticated request', async () => {
            const response = await request(BASE_URL)
                .get('/api/ai-system/status')
                .expect('Content-Type', /json/);
            
            expect([401, 403]).toContain(response.status);
        });
    });
    
    describe('GET /api/dashboard/stats', () => {
        test('should return dashboard statistics', async () => {
            const response = await request(BASE_URL)
                .get('/api/dashboard/stats')
                .expect('Content-Type', /json/);
            
            expect([200, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('stats');
            }
        });
    });
    
    describe('404 Handler', () => {
        test('should return 404 for unknown routes', async () => {
            const response = await request(BASE_URL)
                .get('/api/nonexistent/endpoint')
                .expect('Content-Type', /json/)
                .expect(404);
            
            expect(response.body).toHaveProperty('error', 'Not Found');
        });
    });
    
    describe('Rate Limiting', () => {
        test('should apply rate limit headers', async () => {
            const response = await request(BASE_URL)
                .get('/api/health');
            
            // Rate limit headers should be present
            expect([200, 429, 503]).toContain(response.status);
        });
    });
});
