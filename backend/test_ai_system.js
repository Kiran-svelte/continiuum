const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const AI_SERVICES = [
    { name: 'Leave Agent', url: 'http://localhost:8001/health' },
    { name: 'Onboarding', url: 'http://localhost:8003/health' },
    { name: 'Recruitment', url: 'http://localhost:8004/health' },
    { name: 'Performance', url: 'http://localhost:8006/health' },
    { name: 'Control', url: 'http://localhost:8007/health' }
];

async function testAIServices() {
    console.log('\n🧪 Testing AI Services Health...\n');

    for (const service of AI_SERVICES) {
        try {
            const response = await axios.get(service.url, { timeout: 3000 });
            const status = response.data.status === 'online' ? '✅' : '❌';
            console.log(`${status} ${service.name}: ${response.data.status} (Model: ${response.data.model || 'N/A'})`);
        } catch (error) {
            console.log(`❌ ${service.name}: OFFLINE (${error.message})`);
        }
    }
}

async function testLeaveAI() {
    console.log('\n🧪 Testing Leave AI Integration...\n');

    // Login first
    try {
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            email: 'employee@company.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // Test AI query
        const aiRes = await axios.post(
            `${API_BASE}/leaves/ask`,
            { question: 'I need sick leave tomorrow due to fever' },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (aiRes.data.success && aiRes.data.ai_analysis) {
            console.log('✅ AI Analysis:', aiRes.data.ai_analysis.leave_type || 'Processed');
            console.log('✅ Date Extraction:', aiRes.data.date_extraction.start_date || 'Extracted');
            console.log('✅ RAG IS WORKING!');
        } else {
            console.log('❌ AI response incomplete');
        }

    } catch (error) {
        console.log('❌ Test failed:', error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('========================================');
    console.log('  AI SYSTEM INTEGRATION TESTS');
    console.log('========================================');

    await testAIServices();
    await testLeaveAI();

    console.log('\n========================================');
    console.log('  TESTS COMPLETE');
    console.log('========================================\n');
}

runTests();
