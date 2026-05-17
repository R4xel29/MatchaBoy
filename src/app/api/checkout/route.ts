import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientId } from '@/lib/rate-limit'

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()

        // Must be logged in
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan untuk memesan' }, { status: 401 })
        }

        // Rate limit: 10 requests per minute per user
        const clientId = getClientId(req, session.user.id)
        const { success, remaining } = rateLimit(`checkout:${clientId}`, { maxRequests: 10, windowMs: 60_000 })
        if (!success) {
            return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 })
        }

        // Server-side validation
        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
        }

        if (!body.name || !body.phone) {
            return NextResponse.json({ error: 'Nama dan nomor HP wajib diisi' }, { status: 400 })
        }

        // Validate pickup fields
        const orderType = body.orderType || 'PICKUP'
        if (orderType === 'PICKUP' && (!body.pickupDate || !body.pickupTime)) {
            return NextResponse.json({ error: 'Tanggal dan jam pengambilan wajib diisi' }, { status: 400 })
        }

        // --- SECURE SERVER-SIDE PRICE CALCULATION ---
        const productIds = body.items.map((item: any) => item.productId)
        const dbProducts = await prisma.product.findMany({
            where: { id: { in: productIds } }
        })

        let secureSubtotal = 0
        const orderItemsToCreate: Array<{
            productId: string;
            qty: number;
            price: number;
            modifiers: string | null;
        }> = []

        for (const item of body.items) {
            const dbProduct = dbProducts.find(p => p.id === item.productId)
            if (!dbProduct) {
                return NextResponse.json({ error: `Produk tidak ditemukan: ${item.name}` }, { status: 400 })
            }

            // Parse DB modifiers
            let dbModifiers: any = {}
            if (dbProduct.modifiers) {
                try {
                    dbModifiers = JSON.parse(dbProduct.modifiers)
                } catch {
                    // Ignore schema parse error
                }
            }

            // Calculate Add-Ons total
            let addOnsTotal = 0
            if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
                for (const addOnId of item.addOnIds) {
                    const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
                    if (validAddOn) {
                        addOnsTotal += validAddOn.price
                    }
                }
            }

            // Secure item price calculation
            const secureItemPrice = dbProduct.price + addOnsTotal
            const secureItemTotal = secureItemPrice * item.quantity
            secureSubtotal += secureItemTotal

            orderItemsToCreate.push({
                productId: dbProduct.id,
                qty: item.quantity,
                price: secureItemPrice,
                modifiers: item.modsString || null
            })
        }

        // Fetch store settings for delivery fee
        const storeSettings = await prisma.storeSettings.findFirst()
        const perKmFee = storeSettings?.deliveryFeePerKm ?? 2000
        const maxDist = storeSettings?.maxDeliveryDistance ?? 10
        
        let distanceKm = 0
        let deliveryFee = 0
        
        if (orderType === 'DELIVERY') {
            distanceKm = body.address?.distance || 0
            if (distanceKm > maxDist) {
                 return NextResponse.json({ error: `Jarak pengiriman melebihi batas maksimal (${maxDist} km)` }, { status: 400 })
            }
            deliveryFee = Math.round(distanceKm * perKmFee)
        }

        // Tumbler discount
        const hasTumbler = body.hasTumbler === true
        let tumblerDiscount = 0
        if (hasTumbler) {
            const loyaltySettings = await prisma.loyaltySettings.findFirst()
            if (loyaltySettings?.tumblerBonusEnabled && loyaltySettings.tumblerDiscountPct > 0) {
                tumblerDiscount = Math.round(secureSubtotal * loyaltySettings.tumblerDiscountPct / 100)
            }
        }

        // Handle voucher
        const voucherCode = body.voucherCode
        let voucherDiscount = 0
        let validVoucherId = null
        if (voucherCode) {
            const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode } })
            if (voucher && voucher.userId === session.user.id && !voucher.isUsed && (!voucher.expiresAt || voucher.expiresAt >= new Date())) {
                validVoucherId = voucher.id
                if (voucher.type === 'FREE_DRINK') voucherDiscount = 25000
                else if (voucher.type === 'FREE_TOPPING') voucherDiscount = 3000
                else if (voucher.type === 'UPGRADE_SIZE') voucherDiscount = 5000
                else if (voucher.type === 'REFERRAL_REWARD') voucherDiscount = 25000
                else voucherDiscount = 10000 // CUSTOM or fallback
            } else {
                return NextResponse.json({ error: 'Voucher tidak valid' }, { status: 400 })
            }
        }

        // Handle points
        const pointsUsed = parseInt(body.pointsUsed || '0')
        let pointsDiscount = 0
        if (pointsUsed > 0) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } })
            if (!user || user.points < pointsUsed) {
                return NextResponse.json({ error: 'Poin tidak mencukupi' }, { status: 400 })
            }
            pointsDiscount = pointsUsed * 1000 // 1 point = Rp1.000
        }

        let secureTotal = Math.max(0, secureSubtotal - tumblerDiscount - voucherDiscount - pointsDiscount) + deliveryFee

        // Build address string
        const address = orderType === 'PICKUP'
            ? 'Ambil di toko'
            : `${body.address?.label || ''} - ${body.address?.detail || ''} (${body.address?.lat || 0}, ${body.address?.lng || 0})`

        // Wrap database operations in a single interactive transaction to ensure data atomicity
        const order = await prisma.$transaction(async (tx) => {
            // 1. Double check points if used to prevent race conditions during parallel checkout attempts
            if (pointsUsed > 0) {
                const user = await tx.user.findUnique({ where: { id: session.user.id } })
                if (!user || user.points < pointsUsed) {
                    throw new Error('Poin tidak mencukupi')
                }
            }

            // 2. Double check voucher if used
            if (validVoucherId) {
                const voucher = await tx.voucher.findUnique({ where: { id: validVoucherId } })
                if (!voucher || voucher.isUsed || (voucher.expiresAt && voucher.expiresAt < new Date())) {
                    throw new Error('Voucher tidak valid atau sudah digunakan')
                }
            }

            // 3. Create the order
            const newOrder = await tx.order.create({
                data: {
                    userId: session.user.id,
                    orderType,
                    customerName: body.name,
                    customerPhone: body.phone,
                    address,
                    distanceKm,
                    pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
                    pickupTime: body.pickupTime || null,
                    paymentProofUrl: body.paymentProofUrl || null,
                    subtotal: secureSubtotal,
                    deliveryFee,
                    total: secureTotal,
                    paymentMethod: body.paymentMethod?.toUpperCase() || 'TRANSFER',
                    status: 'PENDING',
                    hasTumbler,
                    notes: body.notes || null,
                    items: {
                        create: orderItemsToCreate
                    }
                }
            })

            // 4. Mark voucher as used
            if (validVoucherId) {
                await tx.voucher.update({
                    where: { id: validVoucherId },
                    data: { isUsed: true, usedAt: new Date() }
                })
            }

            // 5. Deduct user points and write point history
            if (pointsUsed > 0) {
                await tx.user.update({
                    where: { id: session.user.id },
                    data: { points: { decrement: pointsUsed } }
                })
                await tx.pointHistory.create({
                    data: {
                        userId: session.user.id,
                        amount: -pointsUsed,
                        type: 'REDEEM_ORDER',
                        description: `Tukar ${pointsUsed} poin untuk diskon ${formatCurrency(pointsDiscount)}`,
                        orderId: newOrder.id
                    }
                })
            }

            return newOrder
        })

        // Send order notification to user
        try {
            const { sendNotification } = await import('@/lib/notification-service')
            await sendNotification({
                userId: session.user.id,
                type: 'order',
                title: 'Pesanan Diterima! 🍵',
                message: `Pesanan ${order.id.slice(0, 8).toUpperCase()} berhasil dibuat. ${orderType === 'PICKUP' ? `Ambil pada ${body.pickupTime} tanggal ${body.pickupDate}` : 'Akan segera diproses.'}`,
                linkUrl: `/orders/${order.id}`,
                data: { orderId: order.id },
            })
        } catch (e) {
            console.error('[CHECKOUT] Notification error:', e)
        }

        return NextResponse.json({ success: true, orderId: order.id, total: secureTotal })
    } catch (error) {
        console.error('Checkout error:', error)
        // Forward validation errors from transaction as 400 (not generic 500)
        if (error instanceof Error && (
            error.message.includes('Poin tidak mencukupi') ||
            error.message.includes('Voucher tidak valid')
        )) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
    }
}
