const bcrypt = require('bcryptjs');

async function generateHashes() {
    const passwords = [
        { name: 'employee123', role: 'employee' },
        { name: 'hr123', role: 'hr' },
        { name: 'admin123', role: 'admin' }
    ];

    for (const pwd of passwords) {
        const hash = await bcrypt.hash(pwd.name, 10);
        console.log(`${pwd.role}: ${hash}`);
    }
}

generateHashes();
