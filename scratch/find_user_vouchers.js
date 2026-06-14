const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'axelinonitian755@gmail.com' },
    include: {
      vouchers: {
        include: {
          template: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`User ID: ${user.id}`);
  console.log(`User Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Points: ${user.points}`);
  console.log(`Vouchers count: ${user.vouchers.length}`);
  console.log('\n--- Vouchers List ---');
  user.vouchers.forEach((v, index) => {
    console.log(`${index + 1}. Code: ${v.code}`);
    console.log(`   Description: ${v.description}`);
    console.log(`   Type: ${v.type}`);
    console.log(`   Discount Amount: ${v.discountAmount}`);
    console.log(`   Is Used: ${v.isUsed}`);
    console.log(`   Template: ${v.template ? v.template.title + ' (Code: ' + v.template.code + ')' : 'None (No Template)'}`);
    console.log(`   From Referral User ID: ${v.fromReferralUserId || 'None'}`);
    console.log(`   Expires At: ${v.expiresAt}`);
    console.log(`   Created At: ${v.createdAt}`);
    console.log('---------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
