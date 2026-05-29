import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deductStockForOrder } from '@/lib/inventory-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { api_key, client, sales_transactions, local_products, opex_items, master_ingredients, recipes } = body;

    // 1. Validasi API Key
    const secretApiKey = process.env.KULABOOTH_API_KEY;
    if (!secretApiKey || secretApiKey === 'default_secret_key') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[SECURITY WARNING] Using default or empty API key in production is blocked!');
        return NextResponse.json({ error: 'Unauthorized: Secure API Key must be configured in production' }, { status: 401 });
      } else {
        console.warn('[SECURITY WARNING] Using fallback default_secret_key. Configure KULABOOTH_API_KEY for production.');
      }
    }
    const finalKey = secretApiKey || 'default_secret_key';
    if (!api_key || api_key !== finalKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    if (!sales_transactions || !Array.isArray(sales_transactions)) {
      return NextResponse.json({ error: 'Bad Request: sales_transactions array is required' }, { status: 400 });
    }

    const createdProducts: Array<{ localId: number; webId: string }> = [];
    const syncErrors: string[] = [];

    // 2. Proses local_products baru jika ada
    if (local_products && Array.isArray(local_products)) {
      let category = await prisma.category.findFirst({
        where: { slug: { not: 'all' } }
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            id: 'classic',
            slug: 'classic',
            name: 'Classic'
          }
        });
      }

      for (const lp of local_products) {
        let product = await prisma.product.findFirst({
          where: { name: { equals: lp.name, mode: 'insensitive' } }
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: lp.name,
              description: 'Menu baru ditambahkan via KulaBooth POS',
              price: Math.round(lp.price),
              categoryId: category.id,
              badge: 'new'
            }
          });
        } else {
          // JIKA MENU SUDAH ADA, UPDATE HARGANYA DENGAN YANG TERBARU DARI APLIKASI POS!
          if (product.price !== Math.round(lp.price)) {
            product = await prisma.product.update({
              where: { id: product.id },
              data: {
                price: Math.round(lp.price)
              }
            });
          }
        }

        createdProducts.push({
          localId: lp.id,
          webId: product.id
        });
      }
    }

    const processedOrders: string[] = [];
    const skippedOrders: string[] = [];

    // 3. Proses tiap transaksi
    for (const txData of sales_transactions) {
      const orderId = `POS-${txData.id}`;

      // Cek apakah order sudah disinkronkan sebelumnya untuk menghindari double-entry
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (existingOrder) {
        skippedOrders.push(orderId);
        continue;
      }

      // Cari product berdasarkan ID (string) atau Nama (case-insensitive)
      let product = await prisma.product.findUnique({
        where: { id: String(txData.productId) },
      });

      if (!product) {
        product = await prisma.product.findFirst({
          where: { name: { equals: txData.productName, mode: 'insensitive' } },
        });
      }

      if (!product) {
        console.warn(`[POS SYNC] Product not found for ID: ${txData.productId}, Name: ${txData.productName}`);
        syncErrors.push(`Transaksi POS-${txData.id}: Produk '${txData.productName}' tidak ditemukan`);
        continue;
      }

      const totalRevenue = Math.round(txData.sellingPrice * txData.quantity);
      const orderTimestamp = txData.timestamp ? new Date(txData.timestamp) : new Date();

      // Buat Order di database menggunakan prisma transaction
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            id: orderId,
            source: 'POS',
            orderType: 'PICKUP',
            customerName: 'Pelanggan POS',
            customerPhone: '',
            subtotal: totalRevenue,
            deliveryFee: 0,
            total: totalRevenue,
            paymentMethod: 'CASH',
            status: 'COMPLETED',
            createdAt: orderTimestamp,
            updatedAt: new Date(),
            items: {
              create: [
                {
                  productId: product.id,
                  qty: txData.quantity,
                  price: Math.round(txData.sellingPrice),
                },
              ],
            },
          },
        });
      });

      // 4. Jalankan pengurangan stok secara transaksional lewat utility terpusat
      await deductStockForOrder(orderId);
      processedOrders.push(orderId);
    }

    // 5. Proses opex_items jika ada
    const processedOpex: string[] = [];
    if (opex_items && Array.isArray(opex_items)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      for (const opex of opex_items) {
        const opexName = opex.name;
        const opexCost = Math.round(opex.monthlyCost);

        // Klasifikasi kategori biaya otomatis
        let category = 'OTHER';
        const lowerName = opexName.toLowerCase();
        if (lowerName.includes('sewa') || lowerName.includes('kontrak') || lowerName.includes('kos') || lowerName.includes('sewa lapak') || lowerName.includes('lapak')) {
          category = 'RENT';
        } else if (lowerName.includes('listrik') || lowerName.includes('air') || lowerName.includes('internet') || lowerName.includes('wifi') || lowerName.includes('telepon') || lowerName.includes('pulsa') || lowerName.includes('pdam') || lowerName.includes('util')) {
          category = 'UTILITIES';
        } else if (lowerName.includes('gaji') || lowerName.includes('karyawan') || lowerName.includes('thr') || lowerName.includes('bonus') || lowerName.includes('upah') || lowerName.includes('staff')) {
          category = 'SALARY';
        } else if (lowerName.includes('marketing') || lowerName.includes('iklan') || lowerName.includes('promo') || lowerName.includes('ads') || lowerName.includes('sosmed')) {
          category = 'MARKETING';
        }

        // Cek apakah sudah ada expense dengan nama tersebut di bulan ini
        const existingExpense = await prisma.expense.findFirst({
          where: {
            name: { equals: opexName, mode: 'insensitive' },
            date: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        });

        if (existingExpense) {
          if (existingExpense.amount !== opexCost) {
            await prisma.expense.update({
              where: { id: existingExpense.id },
              data: { amount: opexCost }
            });
          }
          processedOpex.push(`${opexName} (updated)`);
        } else {
          await prisma.expense.create({
            data: {
              name: opexName,
              amount: opexCost,
              category: category,
              date: now
            }
          });
          processedOpex.push(`${opexName} (created)`);
        }
      }
    }

    // 6. Proses master_ingredients jika ada
    const mappedIngredients: Record<number, string> = {}; // peta localId (Android) -> ingredientId (Server UUID)
    if (master_ingredients && Array.isArray(master_ingredients)) {
      for (const mi of master_ingredients) {
        const costPerUnit = mi.packageSize > 0 ? Math.round(mi.packagePrice / mi.packageSize) : 0;
        
        let ingredient = await prisma.ingredient.findFirst({
          where: { name: { equals: mi.name, mode: 'insensitive' } }
        });

        if (ingredient) {
          // Update stok, biaya per unit, dan unit dari KulaBooth
          ingredient = await prisma.ingredient.update({
            where: { id: ingredient.id },
            data: {
              stock: mi.currentStock,
              costPerUnit: costPerUnit,
              unit: mi.unit ?? ingredient.unit
            }
          });
        } else {
          // Buat baru jika belum ada
          ingredient = await prisma.ingredient.create({
            data: {
              name: mi.name,
              unit: mi.unit ?? (mi.packageSize > 0 ? 'gr' : 'pcs'),
              stock: mi.currentStock,
              costPerUnit: costPerUnit
            }
          });
        }

        mappedIngredients[mi.id] = ingredient.id;
      }
    }

    // 7. Proses recipes (ProductIngredient) jika ada
    if (recipes && Array.isArray(recipes)) {
      // Kelompokkan resep berdasarkan produk agar kita bisa me-reset resep lama dari produk tersebut sekaligus
      const recipesByLocalProductId: Record<number, typeof recipes> = {};
      for (const recipe of recipes) {
        if (!recipesByLocalProductId[recipe.productId]) {
          recipesByLocalProductId[recipe.productId] = [];
        }
        recipesByLocalProductId[recipe.productId].push(recipe);
      }

      for (const localProdIdStr in recipesByLocalProductId) {
        const localProdId = Number(localProdIdStr);
        const prodRecipes = recipesByLocalProductId[localProdId];

        // Cari webId produk
        // Pertama, cari di createdProducts yang diproses di langkah 2
        let webProductId = createdProducts.find(cp => cp.localId === localProdId)?.webId;

        // Kedua, jika tidak ada, cari di database berdasarkan product settings (Android)
        if (!webProductId) {
          // Cari nama produk lokal dari local_products yang dikirim
          const localProdName = local_products?.find((lp: any) => lp.id === localProdId)?.name;
          if (localProdName) {
            const prod = await prisma.product.findFirst({
              where: { name: { equals: localProdName, mode: 'insensitive' } }
            });
            if (prod) webProductId = prod.id;
          }
        }

        // Ketiga, fallback: cari berdasarkan nama produk dari transaksi penjualan jika ada
        if (!webProductId) {
          const txMatch = sales_transactions.find((tx: any) => tx.productId === localProdId);
          if (txMatch) {
            const prod = await prisma.product.findFirst({
              where: { name: { equals: txMatch.productName, mode: 'insensitive' } }
            });
            if (prod) webProductId = prod.id;
          }
        }

        if (!webProductId) {
          console.warn(`[RECIPE SYNC] Mapped web product not found for local product ID: ${localProdId}`);
          syncErrors.push(`Resep: Produk lokal ID ${localProdId} tidak dapat dipetakan ke web product`);
          continue;
        }

        // Reset resep lama untuk produk ini agar tidak terjadi duplikasi saat update
        await prisma.productIngredient.deleteMany({
          where: { productId: webProductId }
        });

        // Tulis ulang relasi resep baru
        for (const recipe of prodRecipes) {
          const serverIngredientId = mappedIngredients[recipe.masterIngredientId];
          if (!serverIngredientId) {
            console.warn(`[RECIPE SYNC] Server ingredient not found for masterIngredientId: ${recipe.masterIngredientId}`);
            syncErrors.push(`Resep: Bahan masterIngredientId ${recipe.masterIngredientId} tidak ditemukan di server`);
            continue;
          }

          await prisma.productIngredient.create({
            data: {
              productId: webProductId,
              ingredientId: serverIngredientId,
              quantity: recipe.usageAmount
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      client: client || 'Unknown',
      processed: processedOrders,
      skipped: skippedOrders,
      created_products: createdProducts,
      processed_opex: processedOpex,
      processed_ingredients: Object.keys(mappedIngredients).length,
      processed_recipes: recipes ? recipes.length : 0,
      sync_errors: syncErrors
    });
  } catch (error: any) {
    console.error('[POS SYNC ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const api_key = searchParams.get('api_key');
    const secretApiKey = process.env.KULABOOTH_API_KEY;
    if (!secretApiKey || secretApiKey === 'default_secret_key') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[SECURITY WARNING] Using default or empty API key in production is blocked!');
        return NextResponse.json({ error: 'Unauthorized: Secure API Key must be configured in production' }, { status: 401 });
      } else {
        console.warn('[SECURITY WARNING] Using fallback default_secret_key. Configure KULABOOTH_API_KEY for production.');
      }
    }
    const finalKey = secretApiKey || 'default_secret_key';
    if (!api_key || api_key !== finalKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { badge: null },
          { badge: { not: 'archived' } }
        ]
      },
      include: {
        category: true
      }
    });

    const ingredients = await prisma.ingredient.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        stock: true,
        costPerUnit: true
      }
    });

    return NextResponse.json({
      success: true,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        category: p.category.name
      })),
      ingredient_stocks: ingredients.map(i => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        stock: i.stock,
        costPerUnit: i.costPerUnit
      }))
    });
  } catch (error: any) {
    console.error('[POS PRODUCTS GET ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
