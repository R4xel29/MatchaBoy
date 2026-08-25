import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [paymentSettings, storeSettings, banners, products, categories, packagingIngredients] = await Promise.all([
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
      prisma.ingredient.findMany({
        where: { isPackaging: true },
        select: { id: true, name: true, stock: true },
      }),
    ]);

    let cupRegularStock = 999;
    let cupJumboStock = 999;

    packagingIngredients.forEach((p) => {
      const name = p.name.toLowerCase();
      if (name.includes('jumbo') || name.includes('large') || name.includes('22')) {
        cupJumboStock = p.stock;
      } else if (name.includes('regular') || name.includes('14') || name.includes('16') || name.includes('gelas')) {
        cupRegularStock = p.stock;
      }
    });

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

    const isRegularOut = cupRegularStock <= 0 && cupJumboStock > 0;
    const isBothCupsOut = cupRegularStock <= 0 && cupJumboStock <= 0;

    const formattedProducts = activeProducts.map((p) => {
      let modifiers: any = undefined;
      if (p.modifiers) {
        try {
          modifiers = JSON.parse(p.modifiers);
        } catch {}
      }

      const isBundle = modifiers?.isBundle === true;

      const isBadgeSoldOut =
        p.badge?.toLowerCase().includes('sold') ||
        p.badge?.toLowerCase().includes('habis') ||
        p.badge?.toLowerCase().includes('empty');

      const isIngredientEmpty = p.productIngredients.some(
        (pi) => pi.ingredient.stock < pi.quantity
      );

      const isSoldOut = isBadgeSoldOut || isIngredientEmpty || (isBothCupsOut && !isBundle && p.category.slug !== 'pastries');

      let displayPrice = p.price;
      if (isRegularOut && !isBundle && p.category.slug !== 'pastries') {
        const largeSize = modifiers?.sizes?.find(
          (s: any) => s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
        )?.price ?? 3000;
        displayPrice = p.price + largeSize;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: displayPrice,
        image: p.image,
        badge: isRegularOut && !isBundle && !isSoldOut ? (p.badge || 'Hanya Jumbo') : p.badge,
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
      packagingStock: { cupRegular: cupRegularStock, cupJumbo: cupJumboStock },
    });
  } catch (error) {
    console.error('Display settings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display settings' }, { status: 500 });
  }
}
