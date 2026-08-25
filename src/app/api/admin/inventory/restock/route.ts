import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { ingredientId, quantity, totalCost, notes, source = 'CASH_DRAWER' } = body;

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return new NextResponse('Ingredient not found', { status: 404 });
    }

    const qty = parseFloat(quantity) || 0;
    const cost = parseInt(totalCost) || 0;
    const newStock = ingredient.stock + qty;

    const currentTotalValue = ingredient.stock * ingredient.costPerUnit;
    const newTotalValue = currentTotalValue + cost;
    const newAverageCost = newStock > 0 ? Math.round(newTotalValue / newStock) : ingredient.costPerUnit;

    const txOperations: any[] = [
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          stock: newStock,
          costPerUnit: newAverageCost,
        },
      }),
      prisma.stockMovement.create({
        data: {
          ingredientId,
          quantity: qty,
          type: 'IN',
          reason: notes ? `Restock: ${notes}` : `Restock ${ingredient.name} (${qty} ${ingredient.unit})`,
        },
      }),
    ];

    if (cost > 0) {
      const sourceLabel = source === 'CASH_DRAWER' ? 'Kas Laci (Tunai)' : 'Transfer Bank / Rekening';
      txOperations.push(
        prisma.expense.create({
          data: {
            name: `Restock: ${ingredient.name} (${qty} ${ingredient.unit})`,
            amount: cost,
            category: 'RAW_MATERIAL',
            date: new Date(),
            notes: notes
              ? `${notes} [Sumber: ${sourceLabel}]`
              : `Pembelian stok bahan baku ${ingredient.name} [Sumber: ${sourceLabel}]`,
          },
        })
      );
    }

    const updatedResult = await prisma.$transaction(txOperations);
    return NextResponse.json(updatedResult[0]);
  } catch (error) {
    console.error('Error restocking ingredient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
