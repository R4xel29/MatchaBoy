import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // Fetch all active products
        const allProducts = await prisma.product.findMany({
            include: { category: true }
        })

        // Best sellers as fallback / base
        const bestSellers = allProducts.filter(p => p.badge === 'best-seller')
        const fallbackList = bestSellers.length > 0 ? bestSellers : allProducts.slice(0, 3)

        if (!userId) {
            // Guest Recommendations based on general popularity
            const guestRecommendations = fallbackList.map((product, idx) => {
                const rationales = [
                    "Bestseller teratas kami! Diramu khusus untuk memberikan tendangan matcha premium yang lembut namun berenergi tinggi.",
                    "Favorit komunitas! Kombinasi rasa gurih khas matcha premium dengan sensasi manis-gurih yang seimbang.",
                    "Sangat direkomendasikan untuk petualangan rasa pertamamu di Matchaboy HQ. Segar dan autentik!"
                ]
                return {
                    product,
                    rationale: rationales[idx % rationales.length]
                }
            })

            return NextResponse.json({ success: true, recommendations: guestRecommendations })
        }

        // Authenticated user: Query their history
        const [orders, favorites, customRecipes] = await Promise.all([
            prisma.order.findMany({
                where: { userId, status: { in: ['COMPLETED', 'DELIVERED'] } },
                include: { items: { include: { product: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma.favorite.findMany({
                where: { userId },
                include: { product: true }
            }),
            prisma.customRecipe.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 3
            })
        ])

        // Analyze preferences
        const orderedProductIds = new Set<string>()
        let totalQty = 0
        let icedCount = 0
        let hotCount = 0
        let sweetCount = 0

        orders.forEach(order => {
            order.items.forEach(item => {
                orderedProductIds.add(item.productId)
                totalQty += item.qty
                const name = item.product.name.toLowerCase()
                if (name.includes('iced') || name.includes('sparkle') || name.includes('affogato')) {
                    icedCount += item.qty
                }
                if (name.includes('hot') || name.includes('croissant')) {
                    hotCount += item.qty
                }
                if (item.modifiers) {
                    try {
                        const mods = JSON.parse(item.modifiers)
                        if (mods.sugarLevel && !mods.sugarLevel.includes('Less Sugar')) {
                            sweetCount += item.qty
                        }
                    } catch (e) {}
                }
            })
        })

        // Saved recipes preferences
        let prefersOatMilk = false
        customRecipes.forEach(recipe => {
            if (recipe.milkType.toLowerCase().includes('oat')) {
                prefersOatMilk = true
            }
        })

        // Generate recommendations
        const recommended: Array<{ product: any; rationale: string }> = []
        const addedIds = new Set<string>()

        // 1. If user has custom recipes, suggest matching premium drinks
        if (customRecipes.length > 0) {
            const firstRecipe = customRecipes[0]
            const signature = allProducts.find(p => p.id === 'brand-signature')
            if (signature && !addedIds.has(signature.id)) {
                recommended.push({
                    product: signature,
                    rationale: `Berdasarkan resep kustommu "${firstRecipe.recipeName}", kami yakin kamu akan menyukai Matcha Signature kami yang diracik dengan oat milk premium dan standar emas ceremonial-grade!`
                })
                addedIds.add(signature.id)
            }
        }

        // 2. If user loves iced drinks
        if (icedCount > hotCount) {
            const strawberry = allProducts.find(p => p.id === 'brand-strawberry')
            const biscoff = allProducts.find(p => p.id === 'brand-biscoff')
            const yuzu = allProducts.find(p => p.id === 'yuzu-matcha')

            if (strawberry && !addedIds.has(strawberry.id)) {
                recommended.push({
                    product: strawberry,
                    rationale: "Kami melihat kamu menyukai minuman dingin yang segar! Cobalah perpaduan visual estetik strawberry puree dengan matcha kami yang menyegarkan hari."
                })
                addedIds.add(strawberry.id)
            }
            if (biscoff && !addedIds.has(biscoff.id)) {
                recommended.push({
                    product: biscoff,
                    rationale: "Untuk sensasi manis-gurih dingin yang sempurna, Matchaboy Biscoff dengan saus karamel ini sangat cocok dengan seleramu!"
                })
                addedIds.add(biscoff.id)
            }
            if (yuzu && !addedIds.has(yuzu.id)) {
                recommended.push({
                    product: yuzu,
                    rationale: "Ingin yang segar berkilau? Yuzu Matcha Sparkle memadukan asam segar citrus Jepang dengan earthy matcha pilihan!"
                })
                addedIds.add(yuzu.id)
            }
        }

        // 3. If user loves hot/earthy drinks
        if (hotCount >= icedCount && hotCount > 0) {
            const hotMatcha = allProducts.find(p => p.id === 'hot-matcha')
            const dirty = allProducts.find(p => p.id === 'dirty-matcha')

            if (hotMatcha && !addedIds.has(hotMatcha.id)) {
                recommended.push({
                    product: hotMatcha,
                    rationale: "Sebagai pencinta minuman hangat meditasi, Hot Matcha murni kami siap menemani pagi harimu dengan ketenangan ekstra."
                })
                addedIds.add(hotMatcha.id)
            }
            if (dirty && !addedIds.has(dirty.id)) {
                recommended.push({
                    product: dirty,
                    rationale: "Coba padukan kehangatan earthy matcha dengan espresso robusta-arabica bold kami dalam Dirty Matcha yang menantang!"
                })
                addedIds.add(dirty.id)
            }
        }

        // 4. Fill with best sellers if short
        for (const p of fallbackList) {
            if (recommended.length >= 3) break
            if (!addedIds.has(p.id)) {
                recommended.push({
                    product: p,
                    rationale: "Pilihan terbaik kurasi AI berdasarkan racikan terfavorit komunitas Matchaboy minggu ini!"
                })
                addedIds.add(p.id)
            }
        }

        return NextResponse.json({ success: true, recommendations: recommended })
    } catch (error) {
        console.error('AI Recommendations API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
