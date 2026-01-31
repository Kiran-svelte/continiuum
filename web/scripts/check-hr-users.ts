import { prisma } from "../lib/prisma";

async function main() {
  const hrEmps = await prisma.employee.findMany({
    where: { role: 'hr' },
    select: { email: true, role: true, full_name: true, clerk_id: true, org_id: true }
  });
  console.log('HR employees:', JSON.stringify(hrEmps, null, 2));
  
  const adminEmps = await prisma.employee.findMany({
    where: { role: 'admin' },
    select: { email: true, role: true, full_name: true, clerk_id: true, org_id: true }
  });
  console.log('Admin employees:', JSON.stringify(adminEmps, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
