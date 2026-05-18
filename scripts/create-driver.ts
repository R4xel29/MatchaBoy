import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'driver@arumseduh.com';
  const password = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'DRIVER',
    },
    create: {
      name: 'Kurir Utama',
      email,
      password,
      role: 'DRIVER',
    },
  });
  
  console.log(`Driver account created or updated: ${user.email} / password123`);
  
  await prisma.driverProfile.upsert({
    where: { userId: user.id },
    update: {
      vehicleType: 'Honda Vario 150',
      plateNumber: 'B 1234 XYZ',
    },
    create: {
      userId: user.id,
      vehicleType: 'Honda Vario 150',
      plateNumber: 'B 1234 XYZ',
    }
  });
  console.log('Driver profile attached.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
