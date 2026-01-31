const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const company = await prisma.company.findFirst({
    where: { id: 'e37dd688-393d-44f3-85a5-cdfc575de595' },
    include: { 
      leave_types: true,
      settings: true
    }
  });
  
  console.log('Company:', company?.name);
  console.log('Leave Types count:', company?.leave_types?.length || 0);
  
  if (company?.leave_types) {
    company.leave_types.forEach(lt => {
      console.log('  -', lt.code, lt.name, 'quota:', lt.annual_quota.toString());
    });
  }
  
  console.log('Settings:', company?.settings ? 'exists' : 'null');
  
  // Check work schedule
  console.log('\nWork Schedule:');
  console.log('  Start:', company?.work_start_time);
  console.log('  End:', company?.work_end_time);
  console.log('  Work Days:', company?.work_days);
  
  await prisma.$disconnect();
}

check().catch(e => { 
  console.error(e); 
  prisma.$disconnect();
});
