import { prisma } from './prisma';
import { sendWhatsAppMessage } from './whatsapp-service';
import { parseItemModifiers, getReceiptModifierLines } from './receipt-modifiers';

/**
 * Mengirimkan nota/struk digital pesanan kepada pelanggan melalui gateway WhatsApp secara asinkron.
 *
 * Sesuai aturan **AGENTS.md Bagian 4 & Bagian 8**:
 * - Eksekusi pengiriman pesan dilakukan secara *fire-and-forget* tanpa memblokir respon kasir/checkout.
 * - Memformat rincian belanja, diskon voucher, biaya pengiriman, dan perolehan poin secara transparan.
 * - Tidak menggunakan emoji sistem operasi default pada teks pesan.
 *
 * @param {string} orderId - ID pesanan unik yang telah lunas / selesai
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendDigitalReceipt('order-abc-123');
 * ```
 */
export async function sendDigitalReceipt(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      console.warn(`[Receipt Service] Pesanan ${orderId} tidak ditemukan.`);
      return;
    }

    const phone = order.customerPhone || order.user?.phone;
    if (!phone) {
      console.warn(`[Receipt Service] Tidak ada nomor telepon untuk pesanan ${orderId}.`);
      return;
    }

    // Standarisasi nomor telepon untuk WhatsApp
    let stdPhone = phone.replace(/[^0-9]/g, '');
    if (stdPhone.startsWith('08')) {
      stdPhone = '62' + stdPhone.substring(1);
    } else if (stdPhone.startsWith('8')) {
      stdPhone = '62' + stdPhone;
    }

    const shortId = order.id.slice(0, 8).toUpperCase();
    const dateStr = new Date(order.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let itemsText = '';
    order.items.forEach((item) => {
      let modDetails = '';
      if (item.modifiers) {
        const parsed = parseItemModifiers({
          name: item.product?.name || 'Item',
          price: item.price,
          modifiersString: item.modifiers,
        });
        const modLines = getReceiptModifierLines(parsed, true);
        if (modLines.length > 0) {
          modDetails = '\n' + modLines.map((l) => `     » ${l.label}: ${l.value}`).join('\n');
        }
      }

      itemsText += `• *${item.qty}x ${item.product.name}* - Rp${(item.price * item.qty).toLocaleString('id-ID')}${modDetails}\n`;
    });

    const formatPrice = (val: number) => `Rp${val.toLocaleString('id-ID')}`;

    let voucherText = '';
    if (order.voucherCode) {
      const discountVal = order.subtotal + order.deliveryFee - order.total;
      if (discountVal > 0) {
        voucherText = `Diskon Voucher: -${formatPrice(discountVal)} (${order.voucherCode})\n`;
      }
    }

    const receiptMessage = `*ARUM SEDUH*
----------------------------------------
No. Antrean: *${order.queueNumber || 'N/A'}*
No. Pesanan: \`${shortId}\`
Waktu: ${dateStr}
Pelanggan: *${order.customerName}*
Tipe Order: *${order.orderType}*
----------------------------------------
${itemsText}----------------------------------------
Subtotal: ${formatPrice(order.subtotal)}
${order.deliveryFee > 0 ? `Ongkir: ${formatPrice(order.deliveryFee)}\n` : ''}${voucherText}----------------------------------------
*TOTAL AKHIR:* *${formatPrice(order.total)}*
Metode Bayar: *${order.paymentMethod}*
----------------------------------------
Poin Didapat: *+${order.pointsEarned} Poin*
----------------------------------------
Terima kasih telah berbelanja di *Arum Seduh*! Nikmati seduhan istimewa kami.`;

    // Gunakan whatsapp-service terpusat yang aman dengan timeout & error handling
    await sendWhatsAppMessage(stdPhone, receiptMessage);
  } catch (error) {
    console.error(`[Receipt Service] Gagal mengirim nota digital untuk pesanan ${orderId}:`, error);
  }
}
