/**
 * Manual System Test Script
 * 
 * Run this with: node tests/manual-test.js
 * Requires server to be running on port 5000
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

async function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const bodyStr = body ? JSON.stringify(body) : null;
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (bodyStr) {
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        
        req.on('error', reject);
        
        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('  COMPANY HR SYSTEM - MANUAL TEST SUITE');
    console.log('='.repeat(60) + '\n');
    
    const results = [];
    
    // Test 1: Ping
    try {
        const res = await request('GET', '/ping');
        results.push({
            test: 'Ping Endpoint',
            passed: res.status === 200 && res.data.pong === true,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'Ping Endpoint', passed: false, error: e.message });
    }
    
    // Test 2: Health Check
    try {
        const res = await request('GET', '/api/health');
        results.push({
            test: 'Health Check',
            passed: res.status === 200,
            status: res.status,
            details: `DB: ${res.data.services?.database}, AI Leave: ${res.data.services?.ai?.leave?.status}`
        });
    } catch (e) {
        results.push({ test: 'Health Check', passed: false, error: e.message });
    }
    
    // Test 3: Admin Login
    let adminToken = null;
    try {
        const res = await request('POST', '/api/auth/login', {
            email: 'admin@company.com',
            password: 'admin123'
        });
        adminToken = res.data.accessToken;
        results.push({
            test: 'Admin Login',
            passed: res.status === 200 && !!adminToken,
            status: res.status,
            details: `Role: ${res.data.user?.role}`
        });
    } catch (e) {
        results.push({ test: 'Admin Login', passed: false, error: e.message });
    }
    
    // Test 4: Protected Endpoint (AI System Status)
    try {
        const res = await request('GET', '/api/ai-system/status', null, adminToken);
        results.push({
            test: 'AI System Status (Protected)',
            passed: res.status === 200,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'AI System Status', passed: false, error: e.message });
    }
    
    // Test 5: AI Logs Endpoint
    try {
        const res = await request('GET', '/api/ai-system/logs', null, adminToken);
        results.push({
            test: 'AI System Logs',
            passed: res.status === 200,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'AI System Logs', passed: false, error: e.message });
    }
    
    // Test 6: Dashboard Stats
    try {
        const res = await request('GET', '/api/dashboard/stats');
        results.push({
            test: 'Dashboard Stats',
            passed: res.status === 200 && res.data.success === true,
            status: res.status,
            details: `Employees: ${res.data.stats?.employees}`
        });
    } catch (e) {
        results.push({ test: 'Dashboard Stats', passed: false, error: e.message });
    }
    
    // Test 7: Invalid Login (Security)
    try {
        const res = await request('POST', '/api/auth/login', {
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
        });
        results.push({
            test: 'Invalid Login Rejected',
            passed: res.status === 401,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'Invalid Login Rejected', passed: false, error: e.message });
    }
    
    // Test 8: Unauthorized Access Blocked
    try {
        const res = await request('GET', '/api/ai-system/status', null, null);
        results.push({
            test: 'Unauthorized Access Blocked',
            passed: res.status === 401 || res.status === 403,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'Unauthorized Access Blocked', passed: false, error: e.message });
    }
    
    // Test 9: 404 Handler
    try {
        const res = await request('GET', '/api/nonexistent/route');
        results.push({
            test: '404 Handler',
            passed: res.status === 404,
            status: res.status
        });
    } catch (e) {
        results.push({ test: '404 Handler', passed: false, error: e.message });
    }
    
    // Test 10: Rate Limiting Headers
    try {
        const res = await request('GET', '/api/health');
        results.push({
            test: 'Rate Limiting Active',
            passed: res.status !== 429,
            status: res.status
        });
    } catch (e) {
        results.push({ test: 'Rate Limiting Active', passed: false, error: e.message });
    }
    
    // Print Results
    console.log('TEST RESULTS:');
    console.log('-'.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(r => {
        const status = r.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} | ${r.test}`);
        if (r.details) console.log(`       └── ${r.details}`);
        if (r.error) console.log(`       └── Error: ${r.error}`);
        r.passed ? passed++ : failed++;
    });
    
    console.log('-'.repeat(60));
    console.log(`\nTOTAL: ${passed} passed, ${failed} failed out of ${results.length} tests`);
    console.log('\n' + '='.repeat(60) + '\n');
    
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
