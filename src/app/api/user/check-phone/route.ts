import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ hasPhone: false })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, phoneVerified: true, pin: true, name: true },
    })

    const name = user?.name?.trim() || '';
    const hasRealName = name !== '' && !/^User \d+$/i.test(name);

    return NextResponse.json({
      hasPhone: !!(user?.phone && user.phone.trim() !== '' && user.phone !== '-'),
      phoneVerified: !!user?.phoneVerified,
      hasPin: !!(user?.pin && user.pin.trim() !== ''),
      hasName: hasRealName,
    })
  } catch {
    return NextResponse.json({ hasPhone: false, phoneVerified: false })
  }
}
