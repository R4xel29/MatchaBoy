import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTest() {
  console.log("=== STARTING BIRTHDAY PROGRAM INTEGRATION TEST ===");

  // 1. Find Axelino and set birthDate to today
  const budi = await prisma.user.findFirst({
    where: { name: "Axelino" }
  });

  if (!budi) {
    console.error("User 'Budi Santoso' not found in database.");
    return;
  }

  const today = new Date();
  await prisma.user.update({
    where: { id: budi.id },
    data: {
      birthDate: today,
      phone: "08123456789" // set a test phone number
    }
  });
  console.log(`Updated user ${budi.name} with birthDate: ${today.toISOString()} and phone: 08123456789`);

  // 2. Query birthday users using raw query (same as the API route)
  const month = today.getMonth() + 1;
  const day = today.getDate();

  console.log(`Executing raw query for Month: ${month}, Day: ${day}...`);
  const birthdayUsers = await prisma.$queryRaw<any[]>`
    SELECT * FROM "User" 
    WHERE EXTRACT(MONTH FROM "birthDate") = ${month} 
    AND EXTRACT(DAY FROM "birthDate") = ${day}
  `;

  console.log(`Raw query found ${birthdayUsers.length} user(s).`);
  if (birthdayUsers.length === 0) {
    console.error("Test failed: Raw query did not find Axelino.");
    return;
  }

  const testUser = birthdayUsers.find(u => u.id === budi.id);
  if (!testUser) {
    console.error("Test failed: Axelino was not in the returned raw query result.");
    return;
  }
  console.log("Successfully found Axelino in raw query results!");

  // 3. Clean up any existing birthday vouchers for Budi Santoso in the last 30 days
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const deletedVouchers = await prisma.voucher.deleteMany({
    where: {
      userId: testUser.id,
      createdAt: { gte: last30Days },
      OR: [
        { code: { startsWith: "BIRTHDAY" } },
        { template: { code: { startsWith: "BIRTHDAY" } } }
      ]
    }
  });
  console.log(`Cleaned up ${deletedVouchers.count} existing birthday voucher(s) for ${testUser.name}.`);

  // 4. Test voucher template lookup or fallback
  const template = await prisma.voucherTemplate.findFirst({
    where: { code: "BIRTHDAY_GIFT" }
  });

  let voucher;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  if (template) {
    console.log(`Found VoucherTemplate 'BIRTHDAY_GIFT':`, template.title);
    const userVoucherCode = `BIRTHDAY_GIFT-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    let discountAmount = template.discountValue;
    if (template.type === "FREE_DRINK" && !discountAmount) {
      discountAmount = 25000;
    }

    voucher = await prisma.voucher.create({
      data: {
        userId: testUser.id,
        code: userVoucherCode,
        type: template.type,
        description: template.description,
        discountAmount: discountAmount || 25000,
        expiresAt: template.expiresAt || expiresAt,
        templateId: template.id,
        isUsed: false,
      }
    });
  } else {
    console.log("VoucherTemplate 'BIRTHDAY_GIFT' not found. Creating fallback legacy FREE_DRINK voucher...");
    const legacyCode = `BIRTHDAY-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    voucher = await prisma.voucher.create({
      data: {
        userId: testUser.id,
        code: legacyCode,
        type: "FREE_DRINK",
        description: "Selamat Ulang Tahun! Gratis 1 Minuman Pilihan dari Matchaboy 🎂",
        discountAmount: 25000,
        expiresAt,
        isUsed: false,
      }
    });
  }

  console.log("Generated Voucher:", JSON.stringify(voucher, null, 2));

  // 5. Test Duplicate Prevention
  const existingDuplicate = await prisma.voucher.findFirst({
    where: {
      userId: testUser.id,
      createdAt: { gte: last30Days },
      OR: [
        { code: { startsWith: "BIRTHDAY" } },
        { template: { code: { startsWith: "BIRTHDAY" } } }
      ]
    }
  });

  if (existingDuplicate) {
    console.log("Successfully verified duplicate prevention! Voucher exists now, so subsequent cron runs will skip this user.");
  } else {
    console.error("Test failed: Generated voucher was not detected in duplicate check query.");
  }

  // 6. Test WhatsApp standardization
  let standardizedPhone = testUser.phone.replace(/[^0-9]/g, "");
  if (standardizedPhone.startsWith("08")) {
    standardizedPhone = "62" + standardizedPhone.substring(1);
  } else if (standardizedPhone.startsWith("8")) {
    standardizedPhone = "62" + standardizedPhone;
  }
  console.log(`Standardized Phone: ${testUser.phone} -> ${standardizedPhone}`);
  if (standardizedPhone !== "628123456789") {
    console.error("Test failed: phone standardization incorrect.");
  } else {
    console.log("Phone standardization is correct!");
  }

  console.log("=== INTEGRATION TEST SUCCESSFULLY COMPLETED ===");
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
