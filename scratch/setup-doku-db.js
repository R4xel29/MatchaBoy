const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Mengonfigurasi PaymentSettings di database...');
  
  let settings = await prisma.paymentSettings.findFirst();
  
  const dokuData = {
    dokuEnabled: true,
    dokuClientId: 'doku_key_sandbox_c42d9f3183f8479e8b31a70e7ab2be01',
    dokuSharedKey: 'SK-m91Pe5lTWErpA3el8oZ7',
    dokuSandbox: true,
  };

  if (!settings) {
    settings = await prisma.paymentSettings.create({
      data: {
        ...dokuData,
        codEnabled: true,
        qrisEnabled: true,
        transferEnabled: true,
      }
    });
    console.log('PaymentSettings baru berhasil dibuat:', settings);
  } else {
    settings = await prisma.paymentSettings.update({
      where: { id: settings.id },
      data: dokuData
    });
    console.log('PaymentSettings berhasil diperbarui:', settings);
  }
}

main()
  .catch(e => {
    console.error('Gagal memperbarui database:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
