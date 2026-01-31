import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
    const policy = await prisma.constraintPolicy.findFirst();
    console.log("Policy ID:", policy?.id);
    console.log("Org ID:", policy?.org_id);
    
    if (policy?.rules) {
        const rules = policy.rules as Record<string, any>;
        console.log("\nRule Keys:", Object.keys(rules));
        console.log("\nSample rule:", JSON.stringify(Object.values(rules)[0], null, 2));
        
        // Check if any key starts with RULE
        const hasRulePrefix = Object.keys(rules).some(k => k.startsWith("RULE"));
        console.log("\nHas RULE prefix:", hasRulePrefix);
    }
}

check().finally(() => prisma.$disconnect());
