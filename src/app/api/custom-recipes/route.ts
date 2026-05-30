import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const recipes = await prisma.customRecipe.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, recipes })
    } catch (error) {
        console.error('GET Custom Recipes Error:', error)
        return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { recipeName, baseProductId, matchaLevel, creaminess, sweetness, milkType, toppings } = body

        if (!recipeName || !baseProductId || !milkType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const matchaVal = typeof matchaLevel === 'number' ? matchaLevel : 5
        const creamVal = typeof creaminess === 'number' ? creaminess : 5
        const sweetVal = typeof sweetness === 'number' ? sweetness : 5

        // Save toppings as JSON string if passed as an array, else just set it
        let toppingsJson: string | null = null
        if (toppings) {
            toppingsJson = typeof toppings === 'string' ? toppings : JSON.stringify(toppings)
        }

        const newRecipe = await prisma.customRecipe.create({
            data: {
                userId: session.user.id,
                baseProductId,
                recipeName,
                matchaLevel: matchaVal,
                creaminess: creamVal,
                sweetness: sweetVal,
                milkType,
                toppings: toppingsJson,
                isPublic: body.isPublic || false
            }
        })

        return NextResponse.json({ success: true, recipe: newRecipe }, { status: 201 })
    } catch (error) {
        console.error('POST Custom Recipe Error:', error)
        return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
    }
}
