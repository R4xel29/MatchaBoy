const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Step 1: Checking and Creating Voucher Templates ===');
  
  // Define the default templates we want to ensure exist
  const defaultTemplates = [
    {
      code: 'FREE_TOPPING',
      title: 'Eco Milestone - Gratis 1 Topping',
      description: 'Voucher Gratis 1 Topping dari pencapaian Milestone 1',
      type: 'FREE_TOPPING',
      discountValue: 3000,
      minPurchase: 0,
      terms: 'Berlaku untuk semua minuman\nGratis 1 topping pilihan Anda',
    },
    {
      code: 'UPGRADE_SIZE',
      title: 'Eco Milestone - Free Upgrade Size',
      description: 'Voucher Free Upgrade Size dari pencapaian Milestone 2',
      type: 'UPGRADE_SIZE',
      discountValue: 5000,
      minPurchase: 0,
      terms: 'Berlaku untuk semua minuman\nFree Upgrade Size ke Large',
    },
    {
      code: 'FREE_DRINK',
      title: 'Eco Milestone - 1 Minuman Gratis Pilihan',
      description: 'Voucher 1 Minuman Gratis Pilihan dari pencapaian Milestone 3',
      type: 'FREE_DRINK',
      discountValue: 25000,
      minPurchase: 0,
      terms: 'Berlaku untuk 1 cup minuman pilihan Anda',
    }
  ];

  const templateMap = {};

  for (const t of defaultTemplates) {
    let template = await prisma.voucherTemplate.findUnique({
      where: { code: t.code }
    });

    if (!template) {
      template = await prisma.voucherTemplate.create({
        data: t
      });
      console.log(`Created new template: ${t.title} (${t.code})`);
    } else {
      console.log(`Template already exists: ${t.title} (${t.code})`);
    }
    templateMap[t.code] = template;
  }

  // Also fetch the REFERRAL_REWARD template
  let referralTemplate = await prisma.voucherTemplate.findUnique({
    where: { code: 'REFERRAL_REWARD' }
  });
  if (referralTemplate) {
    templateMap['REFERRAL_REWARD'] = referralTemplate;
    console.log(`Found REFERRAL_REWARD template: ${referralTemplate.title}`);
  }

  console.log('\n=== Step 2: Backfilling Existing Vouchers ===');

  // Find all vouchers with templateId === null
  const nullVouchers = await prisma.voucher.findMany({
    where: { templateId: null }
  });

  console.log(`Found ${nullVouchers.length} vouchers without a template.`);

  let updatedCount = 0;

  for (const v of nullVouchers) {
    let targetTemplateCode = null;

    if (v.type === 'FREE_TOPPING') {
      targetTemplateCode = 'FREE_TOPPING';
    } else if (v.type === 'UPGRADE_SIZE') {
      targetTemplateCode = 'UPGRADE_SIZE';
    } else if (v.type === 'FREE_DRINK') {
      targetTemplateCode = 'FREE_DRINK';
    } else if (v.type === 'REFERRAL_REWARD') {
      targetTemplateCode = 'REFERRAL_REWARD';
    }

    if (targetTemplateCode && templateMap[targetTemplateCode]) {
      const template = templateMap[targetTemplateCode];
      await prisma.voucher.update({
        where: { id: v.id },
        data: {
          templateId: template.id,
          // Update description if it matches fallback or is empty
          description: v.description || template.description,
          discountAmount: v.discountAmount || template.discountValue
        }
      });
      console.log(`Updated voucher ${v.code} (${v.type}) -> Linked to template ${template.code}`);
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully backfilled ${updatedCount} vouchers.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
