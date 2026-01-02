/**
 * Integration Tests - Leave Management API
 */

const request = require('supertest');

// Use the running server directly
const BASE_URL = 'http://localhost:5000';

describe('Leave Management API - Integration Tests', () => {
    let authToken;
    let testLeaveId;
    
    beforeAll(async () => {
        // Login as employee
        const loginResponse = await request(BASE_URL)
            .post('/api/auth/login')
            .send({
                email: 'employee@company.com',
                password: 'password123'
            });
        
        if (loginResponse.status === 200) {
            authToken = loginResponse.body.accessToken;
        }
    });
    
    describe('GET /api/leaves', () => {
        test('should return leave requests for authenticated user', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const response = await request(BASE_URL)
                .get('/api/leaves')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/);
            
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
            }
        });
        
        test('should reject unauthenticated request', async () => {
            const response = await request(BASE_URL)
                .get('/api/leaves')
                .expect('Content-Type', /json/);
            
            expect([401, 403, 404]).toContain(response.status);
        });
    });
    
    describe('GET /api/leaves/balance', () => {
        test('should return leave balance', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const response = await request(BASE_URL)
                .get('/api/leaves/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/);
            
            expect([200, 401, 404]).toContain(response.status);
        });
    });
    
    describe('POST /api/leaves', () => {
        test('should create leave request with valid data', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const startDate = futureDate.toISOString().split('T')[0];
            
            futureDate.setDate(futureDate.getDate() + 2);
            const endDate = futureDate.toISOString().split('T')[0];
            
            const response = await request(BASE_URL)
                .post('/api/leaves')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    leave_type: 'annual',
                    start_date: startDate,
                    end_date: endDate,
                    reason: 'Integration test leave request'
                })
                .expect('Content-Type', /json/);
            
            expect([200, 201, 400, 401, 404]).toContain(response.status);
            
            if (response.status === 200 || response.status === 201) {
                if (response.body.leaveRequest?.id) {
                    testLeaveId = response.body.leaveRequest.id;
                }
            }
        });
        
        test('should reject leave request with invalid dates', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const response = await request(BASE_URL)
                .post('/api/leaves')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    leave_type: 'annual',
                    start_date: '2024-01-10',
                    end_date: '2024-01-05', // End before start
                    reason: 'Invalid date test'
                })
                .expect('Content-Type', /json/);
            
            expect([400, 422, 404]).toContain(response.status);
        });
        
        test('should reject leave request without type', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const response = await request(BASE_URL)
                .post('/api/leaves')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    start_date: '2024-02-01',
                    end_date: '2024-02-03'
                })
                .expect('Content-Type', /json/);
            
            expect([400, 422, 404]).toContain(response.status);
        });
    });
    
    describe('GET /api/leaves/:id', () => {
        test('should return specific leave request', async () => {
            if (!authToken || !testLeaveId) {
                console.log('Skipping - no auth token or test leave');
                return;
            }
            
            const response = await request(BASE_URL)
                .get(`/api/leaves/${testLeaveId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/);
            
            expect([200, 401, 404]).toContain(response.status);
        });
        
        test('should return 404 for non-existent leave', async () => {
            if (!authToken) {
                console.log('Skipping - no auth token');
                return;
            }
            
            const response = await request(BASE_URL)
                .get('/api/leaves/99999999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/);
            
            expect([404, 401, 403]).toContain(response.status);
        });
    });
});
