import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@college.local';
  const name = 'Admin';
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      password: hash,
      role: Role.ADMIN,
    },
  });

  console.log('Seed complete. Admin credentials:');
  console.log(`  email: ${email}`);
  console.log('  password: Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
