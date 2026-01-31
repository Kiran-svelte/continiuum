// List all employees in the company
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = 'e37dd688-393d-44f3-85a5-cdfc575de595';

async function main() {
  const employees = await prisma.employee.findMany({
    where: { org_id: COMPANY_ID },
    select: {
      emp_id: true,
      email: true,
      full_name: true,
      role: true,
      clerk_id: true
    }
  });

  console.log('Employees in company:', employees.length);
  console.log(JSON.stringify(employees, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
