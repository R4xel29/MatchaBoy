const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      driverProfile: {
        select: {
          status: true
        }
      }
    }
  });

  console.log("=== DAFTAR AKUN DRIVER DI DATABASE ===");
  if (drivers.length === 0) {
    console.log("Tidak ada akun driver yang terdaftar.");
  } else {
    drivers.forEach(d => {
      console.log(`- Nama: ${d.name || 'Tanpa Nama'}`);
      console.log(`  Email: ${d.email}`);
      console.log(`  WhatsApp: ${d.phone || '-'}`);
      console.log(`  Status Profil: ${d.driverProfile?.status || 'APPROVED'}`);
      console.log(`  ID: ${d.id}`);
      console.log("-------------------------------------");
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
