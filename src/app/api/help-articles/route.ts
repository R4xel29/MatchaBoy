import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Fetch active help articles
export async function GET() {
  try {
    const articles = await prisma.helpArticle.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Fetch help articles error:', error)
    return NextResponse.json({ error: 'Failed to fetch help articles' }, { status: 500 })
  }
}
