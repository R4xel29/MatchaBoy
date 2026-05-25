const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'driver@matchaboy.com';
  const newPassword = 'password123';
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log(`=== BERHASIL MERESET PASSWORD ===`);
  console.log(`Akun: ${user.name} (${user.email})`);
  console.log(`Password Baru: ${newPassword}`);
  console.log(`Silakan login menggunakan email dan password di atas.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
