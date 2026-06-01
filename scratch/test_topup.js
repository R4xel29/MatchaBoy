const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }

  const amount = 50000;
  const hasBonus = amount >= 100000;
  const bonusAmount = hasBonus ? Math.floor(amount * 0.1) : 0;
  const totalTopUp = amount + bonusAmount;

  console.log(`Simulating top up of Rp${amount} for user: ${user.name || user.email}`);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: user.id },
      data: {
        walletBalance: { increment: totalTopUp }
      }
    });

    await tx.walletTransaction.create({
      data: {
        userId: user.id,
        amount: amount,
        type: 'TOP_UP',
        description: `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')}`,
      }
    });

    return u;
  });

  console.log('Top up successful! New balance:', updatedUser.walletBalance);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
