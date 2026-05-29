import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || new URL(req.url).searchParams.get('token');
    const expectedToken = process.env.WA_BOT_API_KEY;
    if (expectedToken && authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Query users with birthday today in PostgreSQL
    const birthdayUsers = await prisma.$queryRaw<any[]>`
      SELECT * FROM "User"
      WHERE EXTRACT(MONTH FROM "birthDate") = ${month}
      AND EXTRACT(DAY FROM "birthDate") = ${day}
    `;

    const processedUsers = [];

    for (const user of birthdayUsers) {
      // Avoid double voucher in the same calendar month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const existingVoucher = await prisma.voucher.findFirst({
        where: {
          userId: user.id,
          description: {
            contains: 'Ulang Tahun'
          },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      if (existingVoucher) {
        continue; // Already processed
      }

      // Find template or create custom
      const templateCode = 'BIRTHDAY_GIFT';
      const template = await prisma.voucherTemplate.findUnique({
        where: { code: templateCode }
      });

      let voucherCode = `BDAY-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      let discountAmount = 25000;
      let description = 'Selamat Ulang Tahun! Gratis 1 Minuman Pilihan (Rp25.000) 🎂';
      let type = 'FREE_DRINK';

      if (template) {
        voucherCode = `${template.code}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        discountAmount = template.discountValue || 25000;
        description = template.description;
        type = template.type;
      }

      // Create voucher
      const voucher = await prisma.voucher.create({
        data: {
          userId: user.id,
          code: voucherCode,
          type: type,
          description: description,
          discountAmount: discountAmount,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isUsed: false,
          templateId: template?.id || null
        }
      });

      // Send in-app notification
      try {
        const { sendNotification } = await import('@/lib/notification-service');
        await sendNotification({
          userId: user.id,
          type: 'promo',
          title: 'Selamat Ulang Tahun! 🎂🎉',
          message: `Selamat hari lahir! Sebagai kado spesial, kamu mendapatkan voucher gratis pilihan: "${description}". Cek halaman voucher kamu!`,
          linkUrl: '/profile'
        });
      } catch (err) {
        console.error('Failed to send in-app notification:', err);
      }

      // Send WhatsApp notification if user has phone
      if (user.phone && user.phoneVerified) {
        const waMessage = `Selamat Ulang Tahun, *${user.name || 'Matcha Lover'}*! 🎉🎂\n\nSebagai kado spesial dari Matchaboy, nikmati voucher *${description}* dengan kode *${voucherCode}*.\n\nSelamat merayakan hari spesialmu dengan secangkir matcha hangat! 🍵✨\n\n_Voucher ini berlaku selama 30 hari dan dapat ditukarkan di storefront/kasir Matchaboy._`;
        
        try {
          const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
          await fetch(waProviderUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": expectedToken || ""
            },
            body: JSON.stringify({ phone: user.phone, message: waMessage }),
          });
        } catch (err) {
          console.error('Failed to send birthday WhatsApp:', err);
        }
      }

      processedUsers.push({ id: user.id, name: user.name, phone: user.phone, voucherCode });
    }

    return NextResponse.json({ success: true, processedCount: processedUsers.length, users: processedUsers });
  } catch (error: any) {
    console.error('Error running birthday cron:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
