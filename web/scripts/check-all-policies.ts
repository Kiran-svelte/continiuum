import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
    const policies = await prisma.constraintPolicy.findMany();
    console.log('Total policies:', policies.length);
    
    for (const pol of policies) {
        const rules = pol.rules as Record<string, any> | null;
        const keys = rules ? Object.keys(rules) : [];
        const hasRulePrefix = keys.some(k => k.startsWith('RULE'));
        console.log('\nOrg:', pol.org_id.substring(0,8));
        console.log('  Keys sample:', keys.slice(0,5));
        console.log('  Has RULE prefix:', hasRulePrefix);
    }
}

check().finally(() => prisma.$disconnect());
