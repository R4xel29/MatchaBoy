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
    const { ingredientId, quantity, totalCost, notes } = body;

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return new NextResponse('Ingredient not found', { status: 404 });
    }

    const newStock = ingredient.stock + parseFloat(quantity);
    
    // Calculate new average cost
    // Formula: (Current Stock * Current Cost + New Stock * New Cost) / Total Stock
    // But usually simpler: total spent / total units if we track everything.
    // Let's use: ((current stock * current cost) + totalCost) / (current stock + quantity)
    const currentTotalValue = ingredient.stock * ingredient.costPerUnit;
    const newTotalValue = currentTotalValue + parseInt(totalCost);
    const newAverageCost = Math.round(newTotalValue / newStock);

    const updatedIngredient = await prisma.$transaction([
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
          quantity: parseFloat(quantity),
          type: 'IN',
          reason: notes || 'Restock',
        },
      }),
    ]);

    return NextResponse.json(updatedIngredient[0]);
  } catch (error) {
    console.error('Error restocking ingredient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
