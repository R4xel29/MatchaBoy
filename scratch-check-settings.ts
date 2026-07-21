import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const settings = await prisma.paymentSettings.findFirst();
    if (!settings) {
      console.log('No payment settings found!');
      return;
    }

    console.log('--- DOKU SETTINGS ---');
    console.log(`dokuEnabled: ${settings.dokuEnabled}`);
    console.log(`dokuClientId: "${settings.dokuClientId}" (Length: ${settings.dokuClientId?.length})`);
    console.log(`dokuSharedKey: "${settings.dokuSharedKey ? settings.dokuSharedKey.slice(0, 4) + '...' + settings.dokuSharedKey.slice(-4) : ''}" (Length: ${settings.dokuSharedKey?.length})`);
    console.log(`dokuSandbox: ${settings.dokuSandbox}`);
  } catch (error) {
    console.error('Error querying payment settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
