// Check role for HR user
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findUnique({
    where: { clerk_id: 'user_38F6cWMwlU02XlhrjY7iVP0b8j6' },
    select: { 
      emp_id: true, 
      email: true, 
      full_name: true, 
      role: true 
    }
  });

  console.log('Employee:', JSON.stringify(employee, null, 2));
  console.log('');
  console.log('Role value:', employee?.role);
  console.log('Role type:', typeof employee?.role);
  console.log('Role lowercase:', employee?.role?.toLowerCase());
  
  const allowed = ['hr', 'admin', 'hr_manager', 'super_admin'];
  const roleNormalized = (employee?.role || '').toLowerCase();
  console.log('');
  console.log('Checking if "' + roleNormalized + '" is in allowed:', allowed);
  console.log('Result:', allowed.includes(roleNormalized));
  
  // Check for whitespace or encoding issues
  console.log('');
  console.log('Role char codes:', [...(employee?.role || '')].map(c => c.charCodeAt(0)));
  
  await prisma.$disconnect();
}

main().catch(console.error);
