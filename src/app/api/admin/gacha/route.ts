import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Default prize configuration stored as JSON in StoreSettings.customHours (or we use a separate approach)
// We'll use a simple JSON file approach via a GachaConfig concept stored in DB

const DEFAULT_PRIZES = [
  { id: '1', name: 'Bonus 10 Poin', type: 'POINTS', value: '10', weight: 40, image: '🎯' },
  { id: '2', name: 'Bonus 25 Poin', type: 'POINTS', value: '25', weight: 25, image: '⭐' },
  { id: '3', name: 'Bonus 50 Poin', type: 'POINTS', value: '50', weight: 15, image: '💎' },
  { id: '4', name: 'Free Topping', type: 'VOUCHER', value: 'FREE_TOPPING', weight: 10, image: '🍡' },
  { id: '5', name: 'Upgrade Size', type: 'VOUCHER', value: 'UPGRADE_SIZE', weight: 7, image: '📏' },
  { id: '6', name: 'Free Drink', type: 'VOUCHER', value: 'FREE_DRINK', weight: 3, image: '🍵' },
];

async function getGachaConfig(): Promise<{ prizes: typeof DEFAULT_PRIZES; isEnabled: boolean }> {
  // Store gacha config in StoreSettings.customHours as a JSON field hack
  // Or better, use a dedicated approach. Let's store it as a simple key-value.
  // We'll use the WaBotSession table as a key-value store.
  const configRow = await prisma.waBotSession.findUnique({ where: { key: 'gacha_config' } });
  if (configRow?.value) {
    try {
      return JSON.parse(configRow.value);
    } catch {
      return { prizes: DEFAULT_PRIZES, isEnabled: true };
    }
  }
  return { prizes: DEFAULT_PRIZES, isEnabled: true };
}

async function setGachaConfig(config: { prizes: typeof DEFAULT_PRIZES; isEnabled: boolean }) {
  await prisma.waBotSession.upsert({
    where: { key: 'gacha_config' },
    update: { value: JSON.stringify(config) },
    create: { key: 'gacha_config', value: JSON.stringify(config) },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const configOnly = searchParams.get('config') === 'true';

    if (configOnly) {
      const config = await getGachaConfig();
      return NextResponse.json({ config });
    }

    // Fetch draw history with user info
    const draws = await prisma.gachaDraw.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: {
          select: { id: true, name: true, phone: true, image: true },
        },
      },
    });

    const mappedDraws = draws.map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: d.user.name || 'Unknown',
      userPhone: d.user.phone || '-',
      userImage: d.user.image || null,
      prizeType: d.prizeType,
      prizeValue: d.prizeValue,
      description: d.description,
      createdAt: d.createdAt.toISOString(),
    }));

    // Stats
    const totalDraws = await prisma.gachaDraw.count();
    const prizeStats = await prisma.gachaDraw.groupBy({
      by: ['prizeType'],
      _count: { id: true },
    });

    const descStats = await prisma.gachaDraw.groupBy({
      by: ['description'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    const config = await getGachaConfig();

    return NextResponse.json({
      draws: mappedDraws,
      config,
      stats: {
        totalDraws,
        prizeBreakdown: prizeStats.map((p) => ({
          type: p.prizeType,
          count: p._count.id,
        })),
        mostCommonPrize: descStats[0]
          ? { description: descStats[0].description, count: descStats[0]._count.id }
          : null,
      },
    });
  } catch (error) {
    console.error('Admin gacha GET error:', error);
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
    const { prizes, isEnabled } = body;

    if (!Array.isArray(prizes)) {
      return NextResponse.json({ error: 'Invalid prizes format' }, { status: 400 });
    }

    await setGachaConfig({ prizes, isEnabled: isEnabled ?? true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin gacha POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
