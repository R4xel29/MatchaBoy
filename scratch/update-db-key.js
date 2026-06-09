const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found to update');
    return;
  }

  const updated = await prisma.paymentSettings.update({
    where: { id: settings.id },
    data: {
      dokuSharedKey: 'doku_key_43f1a9d33f2a4cfabf847233f91fc40d'
    }
  });

  console.log('Database updated successfully! New settings:', {
    dokuClientId: updated.dokuClientId,
    dokuSharedKey: updated.dokuSharedKey,
    dokuSandbox: updated.dokuSandbox
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
