import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()

        // Must be logged in
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan untuk memesan' }, { status: 401 })
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
        const orderItemsToCreate = []

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

        const deliveryFee = orderType === 'PICKUP' ? 0 : (body.deliveryFee || 0)
        const secureTotal = secureSubtotal + deliveryFee

        // Build address string
        const address = orderType === 'PICKUP'
            ? 'Ambil di toko'
            : `${body.address?.label || ''} - ${body.address?.detail || ''}`

        // Create the order
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                orderType,
                customerName: body.name,
                customerPhone: body.phone,
                address,
                distanceKm: orderType === 'PICKUP' ? 0 : (body.address?.distance || 0),
                pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
                pickupTime: body.pickupTime || null,
                paymentProofUrl: body.paymentProofUrl || null,
                subtotal: secureSubtotal,
                deliveryFee,
                total: secureTotal,
                paymentMethod: body.paymentMethod?.toUpperCase() || 'TRANSFER',
                status: 'PENDING',
                notes: body.notes || null,
                items: {
                    create: orderItemsToCreate
                }
            }
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
        return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
    }
}
