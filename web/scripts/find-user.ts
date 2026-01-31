import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findUser() {
    // Find the user from screenshot (jetaw97374@1200b.com)
    const employee = await prisma.employee.findFirst({
        where: { email: { contains: 'jetaw97374' } },
        include: { company: true }
    });
    
    if (employee) {
        console.log("Found employee:", employee.full_name);
        console.log("Email:", employee.email);
        console.log("Company:", employee.company?.name);
        console.log("Org ID:", employee.org_id);
        console.log("Role:", employee.role);
        
        // Check their constraint policy
        if (employee.org_id) {
            const policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id }
            });
            
            if (policy) {
                console.log("\nPolicy found:", policy.id);
                const rules = policy.rules as Record<string, any>;
                console.log("Rule keys:", Object.keys(rules).slice(0, 5));
                console.log("Has RULE prefix:", Object.keys(rules).some(k => k.startsWith('RULE')));
            } else {
                console.log("\nNo policy found for this org - needs initialization");
            }
        }
    } else {
        console.log("Employee not found");
        
        // List some employees
        const employees = await prisma.employee.findMany({
            where: { role: 'hr' },
            take: 5,
            select: { email: true, full_name: true, org_id: true }
        });
        console.log("\nSample HR employees:");
        employees.forEach(e => console.log(`  ${e.email} - ${e.full_name} - ${e.org_id?.substring(0,8)}`));
    }
}

findUser().finally(() => prisma.$disconnect());
