import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const groupCart = await prisma.groupCart.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                image: true,
                                modifiers: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        })

        if (!groupCart) {
            return NextResponse.json({ error: 'Group Cart tidak ditemukan' }, { status: 404 })
        }

        // Group items by member name
        const grouped: Record<string, typeof groupCart.items> = {}
        let totalSubtotal = 0

        for (const item of groupCart.items) {
            const name = item.memberName || 'Anonim'
            if (!grouped[name]) {
                grouped[name] = []
            }
            grouped[name].push(item)
            totalSubtotal += item.price * item.qty
        }

        // Calculate split bill breakdown
        const breakdown = Object.entries(grouped).map(([memberName, items]) => {
            const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0)
            const sharePercentage = totalSubtotal > 0 ? (subtotal / totalSubtotal) * 100 : 0
            
            return {
                memberName,
                items: items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    productName: item.product.name,
                    productImage: item.product.image,
                    qty: item.qty,
                    price: item.price,
                    modifiers: item.modifiers ? JSON.parse(item.modifiers) : null
                })),
                subtotal,
                sharePercentage: parseFloat(sharePercentage.toFixed(2))
            }
        })

        return NextResponse.json({
            groupCart: {
                id: groupCart.id,
                creatorId: groupCart.creatorId,
                creatorName: groupCart.creator.name || 'Creator',
                status: groupCart.status,
                createdAt: groupCart.createdAt
            },
            groupedItems: grouped,
            splitBill: {
                breakdown,
                subtotal: totalSubtotal,
                total: totalSubtotal // before checkout delivery fee / discount is applied
            }
        })
    } catch (error: any) {
        console.error('Error fetching group cart items:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { memberName, productId, modifiers } = body
        const qty = body.qty || body.quantity || 1

        if (!memberName || !memberName.trim()) {
            return NextResponse.json({ error: 'Nama anggota wajib diisi' }, { status: 400 })
        }

        if (!productId) {
            return NextResponse.json({ error: 'Product ID wajib diisi' }, { status: 400 })
        }

        // Verify group cart exists and is active
        const groupCart = await prisma.groupCart.findUnique({
            where: { id }
        })

        if (!groupCart) {
            return NextResponse.json({ error: 'Group Cart tidak ditemukan' }, { status: 404 })
        }

        if (groupCart.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Group Cart ini sudah dicheckout atau tidak aktif' }, { status: 400 })
        }

        // Fetch product to calculate secure price
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
        }

        // Calculate secure price
        let securePrice = product.price
        let parsedMods: any = {}
        if (modifiers) {
            parsedMods = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers
        }

        if (parsedMods.size && parsedMods.size !== 'Normal' && product.modifiers) {
            try {
                const productMods = JSON.parse(product.modifiers)
                if (productMods.sizes && Array.isArray(productMods.sizes)) {
                    const validSize = productMods.sizes.find((s: any) => s.name === parsedMods.size)
                    if (validSize) {
                        securePrice += validSize.price
                    }
                }
            } catch (e) {
                console.error('Error parsing product size modifier:', e)
            }
        }

        if (parsedMods.addOnIds && Array.isArray(parsedMods.addOnIds) && product.modifiers) {
            try {
                const productMods = JSON.parse(product.modifiers)
                if (productMods.addOns) {
                    for (const addOnId of parsedMods.addOnIds) {
                        const validAddOn = productMods.addOns.find((a: any) => a.id === addOnId)
                        if (validAddOn) {
                            securePrice += validAddOn.price
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing product add-ons modifier:', e)
            }
        }

        // Add item to group cart
        const newItem = await prisma.groupCartItem.create({
            data: {
                groupCartId: id,
                productId,
                memberName: memberName.trim(),
                qty,
                price: securePrice,
                modifiers: modifiers ? (typeof modifiers === 'string' ? modifiers : JSON.stringify(modifiers)) : null
            },
            include: {
                product: true
            }
        })

        return NextResponse.json(newItem)
    } catch (error: any) {
        console.error('Error adding group cart item:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        let itemId = new URL(request.url).searchParams.get('itemId')

        if (!itemId) {
            try {
                const body = await request.json()
                itemId = body.itemId
            } catch {}
        }

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID wajib diisi' }, { status: 400 })
        }

        // Check if item belongs to the group cart
        const item = await prisma.groupCartItem.findFirst({
            where: {
                id: itemId,
                groupCartId: id
            }
        })

        if (!item) {
            return NextResponse.json({ error: 'Item tidak ditemukan di group cart ini' }, { status: 404 })
        }

        // Delete item
        await prisma.groupCartItem.delete({
            where: { id: itemId }
        })

        return NextResponse.json({ success: true, message: 'Item berhasil dihapus dari group cart' })
    } catch (error: any) {
        console.error('Error deleting group cart item:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
