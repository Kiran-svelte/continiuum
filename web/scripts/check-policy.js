const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const policy = await p.constraintPolicy.findFirst();
    console.log('Stored Policy:');
    console.log(JSON.stringify(policy, null, 2));
    await p.$disconnect();
}

check();
