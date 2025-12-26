const axios = require('axios');
(async () => {
    try {
        const res = await axios.post('http://127.0.0.1:8001/analyze', {
            text: 'test',
            employee_id: 'EMP001',
            extracted_info: { type: 'vacation', dates: ['2024-04-01'], duration: 1 },
            team_state: {},
            leave_balance: {}
        }, { timeout: 5000 });
        console.log('Python response:', JSON.stringify(res.data));
    } catch (e) {
        console.error('Error contacting Python:', e.message);
        if (e.response) console.error('Response data:', e.response.data);
    }
})();
