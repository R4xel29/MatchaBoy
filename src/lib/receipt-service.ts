import { prisma } from './prisma';

export async function sendDigitalReceipt(orderId: string) {
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
      console.warn(`[Receipt Service] Order ${orderId} not found.`);
      return;
    }

    const phone = order.customerPhone || order.user?.phone;
    if (!phone) {
      console.warn(`[Receipt Service] No phone number for order ${orderId}.`);
      return;
    }

    // Standardize phone number for WhatsApp
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
        try {
          const mods = JSON.parse(item.modifiers);
          const parts = [];
          if (mods.size && mods.size !== 'Normal') parts.push(`Size: ${mods.size}`);
          if (mods.iceLevel && mods.iceLevel !== 'Normal Ice') parts.push(mods.iceLevel);
          if (mods.sugarLevel && mods.sugarLevel !== 'Normal Sugar') parts.push(mods.sugarLevel);
          if (mods.addOns && mods.addOns.length > 0) {
            const addOnsNames = mods.addOns.map((a: any) => a.name).join(', ');
            parts.push(`Add-ons: ${addOnsNames}`);
          }
          if (mods.bundleSelections && mods.bundleSelections.length > 0) {
            const bundleNames = mods.bundleSelections.map((s: any) => s.productName).join(', ');
            parts.push(`Bundle: ${bundleNames}`);
          }
          if (parts.length > 0) {
            modDetails = `\n     _${parts.join(' | ')}_`;
          }
        } catch {
          // Fallback if not JSON
          modDetails = `\n     _${item.modifiers}_`;
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

    const receiptMessage = `🍵 *ARUM SEDUH MATCHABOY* 🍵
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
Terima kasih telah berbelanja di *Arum Seduh Matchaboy*! Nikmati matcha terbaikmu! 🍃💚`;

    const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
    const apiKey = process.env.WA_BOT_API_KEY || "";

    const res = await fetch(waProviderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({ phone: stdPhone, message: receiptMessage }),
    });

    if (res.ok) {
      console.log(`[Receipt Service] Digital receipt sent successfully to ${stdPhone} for order ${shortId}`);
    } else {
      console.error(`[Receipt Service] WhatsApp Bot returned error:`, await res.text());
    }
  } catch (error) {
    console.error(`[Receipt Service] Failed to send digital receipt for order ${orderId}:`, error);
  }
}
