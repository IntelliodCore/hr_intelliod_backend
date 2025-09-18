import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@intelliod.com' },
    update: {},
    create: {
      email: 'admin@intelliod.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      isFirstLogin: false,
    },
  });

  // Create admin profile
  await prisma.employeeProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      employeeId: 'ADM001',
      firstName: 'System',
      lastName: 'Administrator',
      department: 'IT',
      position: 'System Admin',
      joinDate: new Date('2020-01-15'),
      contractType: 'FULL_TIME',
      workLocation: 'HYBRID',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });