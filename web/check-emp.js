const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const emp = await prisma.employee.findFirst({
    where: { email: 'kiranlighter11@gmail.com' },
    select: { 
      emp_id: true, 
      full_name: true, 
      org_id: true, 
      clerk_id: true,
      company: { select: { id: true, name: true } }
    }
  });
  console.log('Employee:', JSON.stringify(emp, null, 2));
  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
