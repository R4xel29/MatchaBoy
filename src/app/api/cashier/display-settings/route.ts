import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [paymentSettings, storeSettings, banners, products, categories] = await Promise.all([
      prisma.paymentSettings.findFirst({
        select: {
          qrisImage: true,
          qrisLabel: true,
          qrisNmid: true,
          qrisEnabled: true,
        },
      }),
      prisma.storeSettings.findFirst(),
      prisma.heroBanner.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        take: 5,
      }),
      prisma.product.findMany({
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          productIngredients: {
            include: { ingredient: { select: { id: true, stock: true } } },
          },
        },
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    // Update storeName in DB if it still says Matchaboy
    if (storeSettings && storeSettings.storeName.includes('Matchaboy')) {
      await prisma.storeSettings.update({
        where: { id: storeSettings.id },
        data: { storeName: 'Arum Seduh' },
      }).catch(() => {});
    }

    const activeProducts = products.filter((p) => {
      const badgeLower = (p.badge || '').toLowerCase();
      return !badgeLower.includes('archived') && !badgeLower.includes('hidden') && !badgeLower.includes('disabled');
    });

    const formattedProducts = activeProducts.map((p) => {
      const isBadgeSoldOut =
        p.badge?.toLowerCase().includes('sold') ||
        p.badge?.toLowerCase().includes('habis') ||
        p.badge?.toLowerCase().includes('empty');

      const isIngredientEmpty = p.productIngredients.some(
        (pi) => pi.ingredient.stock < pi.quantity
      );

      const isSoldOut = isBadgeSoldOut || isIngredientEmpty;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        badge: p.badge,
        isSoldOut,
        categoryId: p.categoryId,
        categoryName: p.category.name,
      };
    });

    return NextResponse.json({
      qrisImage: paymentSettings?.qrisImage || null,
      qrisLabel: paymentSettings?.qrisLabel || 'QRIS',
      qrisNmid: paymentSettings?.qrisNmid || '',
      storeName: 'Arum Seduh',
      storeAddress: storeSettings?.storeAddress || '',
      banners: banners.map((b) => ({
        id: b.id,
        image: b.image,
        headline: b.headline,
        subheadline: b.subheadline,
      })),
      categories,
      products: formattedProducts,
    });
  } catch (error) {
    console.error('Display settings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display settings' }, { status: 500 });
  }
}
