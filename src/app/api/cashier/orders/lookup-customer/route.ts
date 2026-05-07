import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: code },
          { referralCode: code.toUpperCase() },
        ],
      },
      select: { id: true, name: true, points: true, email: true, phone: true },
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Lookup customer error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
