import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') return null
  return session.user.id
}

// GET: List all custom recipes with user info
export async function GET(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // 'public' | 'private' | 'all'
    const sortBy = searchParams.get('sortBy') // 'popularity' | 'newest'

    const where: Record<string, unknown> = {}

    if (status === 'public') {
      where.isPublic = true
    } else if (status === 'private') {
      where.isPublic = false
    }

    const orderBy: Record<string, string> = {}
    if (sortBy === 'popularity') {
      orderBy.orderCount = 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const recipes = await prisma.customRecipe.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    })

    // Calculate stats
    const allRecipes = await prisma.customRecipe.findMany({
      select: { isPublic: true },
    })
    const totalRecipes = allRecipes.length
    const publicCount = allRecipes.filter(r => r.isPublic).length
    const privateCount = totalRecipes - publicCount

    return NextResponse.json({
      recipes,
      stats: {
        totalRecipes,
        publicCount,
        privateCount,
        pendingApproval: privateCount,
      },
    })
  } catch (error) {
    console.error('Fetch recipes error:', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}

// PATCH: Update recipe status (approve/reject/feature)
export async function PATCH(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, action } = body as { id: string; action: 'approve' | 'reject' | 'feature' | 'unfeature' }

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
      case 'feature':
        updateData = { isPublic: true }
        break
      case 'reject':
      case 'unfeature':
        updateData = { isPublic: false }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const recipe = await prisma.customRecipe.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, image: true },
        },
      },
    })

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error('Update recipe error:', error)
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
  }
}

// DELETE: Remove a custom recipe
export async function DELETE(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing recipe ID' }, { status: 400 })
    }

    await prisma.customRecipe.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete recipe error:', error)
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
  }
}
