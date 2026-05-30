import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GroupCartClient from './GroupCartClient'

export const revalidate = 0 // Disable cache for real-time collaboration

export default async function GroupCartPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    // Fetch the group cart details
    const groupCart = await prisma.groupCart.findUnique({
        where: { id },
        include: {
            creator: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    })

    if (!groupCart) {
        notFound()
    }

    // Fetch active categories and products
    const [categories, products] = await Promise.all([
        prisma.category.findMany({
            orderBy: { createdAt: 'asc' }
        }),
        prisma.product.findMany({
            where: {
                OR: [
                    { badge: null },
                    { badge: { not: 'archived' } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        })
    ])

    // Map categories for UI
    const mappedCategories = [
        { id: 'all', name: 'Semua Menu', slug: 'all' },
        ...categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug
        }))
    ]

    // Map products, parsing their modifiers
    const mappedProducts = products.map((p) => {
        let modifiers = null
        if (p.modifiers) {
            try {
                modifiers = JSON.parse(p.modifiers)
            } catch {
                modifiers = null
            }
        }

        return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image: p.image || null,
            category: p.categoryId,
            badge: p.badge || null,
            modifiers
        }
    })

    return (
        <GroupCartClient
            groupCartId={groupCart.id}
            creatorId={groupCart.creatorId}
            creatorName={groupCart.creator.name || 'Creator'}
            status={groupCart.status}
            categories={mappedCategories}
            products={mappedProducts}
        />
    )
}
