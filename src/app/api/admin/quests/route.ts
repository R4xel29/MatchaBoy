import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quests = await prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userQuests: {
          select: {
            id: true,
            isCompleted: true,
            isClaimed: true,
          },
        },
      },
    });

    const mapped = quests.map((q) => {
      const total = q.userQuests.length;
      const completed = q.userQuests.filter((uq) => uq.isCompleted).length;
      const claimed = q.userQuests.filter((uq) => uq.isClaimed).length;
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        type: q.type,
        targetType: q.targetType,
        targetValue: q.targetValue,
        rewardPoints: q.rewardPoints,
        rewardVoucher: q.rewardVoucher,
        isActive: q.isActive,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        stats: { total, completed, claimed },
      };
    });

    // Overview stats
    const totalActive = mapped.filter((q) => q.isActive).length;
    const totalCompletions = mapped.reduce((sum, q) => sum + q.stats.completed, 0);
    const mostPopular = mapped.length > 0
      ? mapped.reduce((best, q) => (q.stats.total > best.stats.total ? q : best))
      : null;

    return NextResponse.json({
      quests: mapped,
      overview: {
        totalActive,
        totalCompletions,
        totalQuests: mapped.length,
        mostPopular: mostPopular ? { id: mostPopular.id, title: mostPopular.title, participants: mostPopular.stats.total } : null,
      },
    });
  } catch (error) {
    console.error('Admin quests GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, type, targetType, targetValue, rewardPoints, rewardVoucher, isActive } = body;

    if (!title || !description || !type || !targetType || !targetValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const quest = await prisma.quest.create({
      data: {
        title,
        description,
        type,
        targetType,
        targetValue: Number(targetValue),
        rewardPoints: Number(rewardPoints) || 0,
        rewardVoucher: rewardVoucher || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ quest }, { status: 201 });
  } catch (error) {
    console.error('Admin quests POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing quest id' }, { status: 400 });
    }

    if (updates.targetValue) updates.targetValue = Number(updates.targetValue);
    if (updates.rewardPoints !== undefined) updates.rewardPoints = Number(updates.rewardPoints);

    const quest = await prisma.quest.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ quest });
  } catch (error) {
    console.error('Admin quests PATCH error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing quest id' }, { status: 400 });
    }

    await prisma.quest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin quests DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
