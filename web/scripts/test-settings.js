// Test getCompanySettings to see what's returned
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = 'e37dd688-393d-44f3-85a5-cdfc575de595';

async function main() {
  console.log('Testing getCompanySettings logic for company:', COMPANY_ID);
  console.log('');

  // Query leave types
  const leaveTypes = await prisma.leaveType.findMany({
    where: { company_id: COMPANY_ID, is_active: true },
    orderBy: { sort_order: 'asc' }
  });

  console.log('Leave types found:', leaveTypes.length);
  console.log('Leave types:', JSON.stringify(leaveTypes, null, 2));

  // Query company
  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: {
      id: true,
      name: true,
      work_start_time: true,
      settings: true,
    }
  });

  console.log('');
  console.log('Company found:', company?.name);

  await prisma.$disconnect();
}

main().catch(console.error);
