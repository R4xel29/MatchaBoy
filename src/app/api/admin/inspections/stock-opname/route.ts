import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST: Melakukan Stock Opname (pencocokan stok fisik vs sistem dan catat selisih/waste)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ingredientId, physicalStock, reasonCategory = 'ADJUST', notes = '' } = body;

    if (!ingredientId) {
      return NextResponse.json({ error: 'ID bahan baku wajib disertakan' }, { status: 400 });
    }

    const parsedPhysical = parseFloat(physicalStock);
    if (isNaN(parsedPhysical) || parsedPhysical < 0) {
      return NextResponse.json({ error: 'Jumlah stok fisik aktual tidak valid' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return NextResponse.json({ error: 'Bahan baku tidak ditemukan di sistem' }, { status: 404 });
    }

    const systemStock = ingredient.stock;
    const diff = Math.round((parsedPhysical - systemStock) * 100) / 100;
    const staffName = session.user.name || 'Staf Barista';

    // Label alasan
    const reasonLabels: Record<string, string> = {
      WASTE: 'Tumpah / Kalibrasi Mesin (Waste)',
      EXPIRED: 'Bahan Rusak / Kedaluwarsa',
      STAFF_MEAL: 'Konsumsi Internal Staf',
      ADJUST: 'Penyesuaian Hitungan Fisik',
    };

    const reasonText = reasonLabels[reasonCategory] || 'Penyesuaian Stock Opname';
    const movementType = reasonCategory === 'WASTE' || reasonCategory === 'EXPIRED' ? 'WASTE' : 'ADJUST';

    const txOperations: any[] = [
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { stock: parsedPhysical },
      }),
      prisma.stockMovement.create({
        data: {
          ingredientId,
          quantity: diff,
          type: movementType,
          reason: `Stock Opname Bar: ${reasonText}${notes ? ` - ${notes}` : ''} [Fisik: ${parsedPhysical} ${ingredient.unit}, Selisih: ${diff > 0 ? '+' : ''}${diff} ${ingredient.unit}, Oleh: ${staffName}]`,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'STOCK_OPNAME',
          entity: 'INGREDIENT',
          entityId: ingredientId,
          details: `Stock Opname ${ingredient.name}: Sistem ${systemStock} → Fisik ${parsedPhysical} ${ingredient.unit} (Selisih: ${diff > 0 ? '+' : ''}${diff}) [Alasan: ${reasonText}] [Staf: ${staffName}]`,
        },
      }),
    ];

    const results = await prisma.$transaction(txOperations);

    return NextResponse.json({
      success: true,
      message: `Stock Opname untuk ${ingredient.name} berhasil diperbarui`,
      data: {
        ingredientId,
        name: ingredient.name,
        unit: ingredient.unit,
        previousStock: systemStock,
        newStock: parsedPhysical,
        difference: diff,
        movement: results[1],
      },
    });
  } catch (error) {
    console.error('[STOCK_OPNAME_POST_ERROR]', error);
    return NextResponse.json({ error: 'Gagal memproses stock opname' }, { status: 500 });
  }
}
