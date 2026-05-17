// Financial Report Route
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today'; // today, week, month, all
    
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(0); // All time
    }

    // 1. Fetch Orders
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                productIngredients: {
                  include: {
                    ingredient: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 2. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      }
    });

    // 3. Calculate Metrics
    let totalRevenue = 0;
    let totalCOGS = 0;

    orders.forEach(order => {
      totalRevenue += order.total;
      
      order.items.forEach(item => {
        let itemCOGS = 0;
        item.product.productIngredients.forEach(rec => {
          itemCOGS += rec.quantity * rec.ingredient.costPerUnit;
        });
        totalCOGS += itemCOGS * item.qty;
      });
    });

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      grossProfit,
      netProfit,
      orderCount: orders.length,
      expenseCount: expenses.length,
      range
    });
  } catch (error) {
    console.error('Error fetching profit report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
