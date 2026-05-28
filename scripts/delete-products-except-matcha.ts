import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteProductsExceptMatcha() {
  try {
    console.log('🔍 Mencari semua produk kecuali "Matcha Latte"...\n');

    // Cari semua produk kecuali Matcha Latte
    const productsToDelete = await prisma.product.findMany({
      where: {
        name: {
          not: {
            equals: 'Matcha Latte',
            mode: 'insensitive'
          }
        }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    });

    if (productsToDelete.length === 0) {
      console.log('✅ Tidak ada produk yang perlu dihapus. Hanya "Matcha Latte" yang tersisa.\n');
      return;
    }

    console.log(`📋 Ditemukan ${productsToDelete.length} produk yang akan dihapus:\n`);
    productsToDelete.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
    });

    console.log('\n🗑️  Memulai proses penghapusan...\n');

    // Hapus relasi ProductIngredient terlebih dahulu
    for (const product of productsToDelete) {
      await prisma.productIngredient.deleteMany({
        where: { productId: product.id }
      });
      console.log(`   ✓ Menghapus relasi ingredient untuk: ${product.name}`);
    }

    // Hapus relasi OrderItem
    for (const product of productsToDelete) {
      await prisma.orderItem.deleteMany({
        where: { productId: product.id }
      });
      console.log(`   ✓ Menghapus order items untuk: ${product.name}`);
    }

    // Hapus produk
    const deleteResult = await prisma.product.deleteMany({
      where: {
        id: {
          in: productsToDelete.map(p => p.id)
        }
      }
    });

    console.log(`\n✅ Berhasil menghapus ${deleteResult.count} produk!`);
    console.log('✅ Hanya "Matcha Latte" yang tersisa di database.\n');

    // Tampilkan produk yang tersisa
    const remainingProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('📦 Produk yang tersisa:');
    remainingProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - Rp ${product.price.toLocaleString('id-ID')} (${product.category.name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
deleteProductsExceptMatcha()
  .then(() => {
    console.log('\n✨ Script selesai dijalankan!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script gagal:', error);
    process.exit(1);
  });
