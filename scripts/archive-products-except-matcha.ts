import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function archiveProductsExceptMatcha() {
  try {
    console.log('🔍 Mencari semua produk kecuali "Matcha Latte"...\n');

    // Cari semua produk kecuali Matcha Latte yang belum diarsipkan
    const productsToArchive = await prisma.product.findMany({
      where: {
        AND: [
          {
            name: {
              not: {
                equals: 'Matcha Latte',
                mode: 'insensitive'
              }
            }
          },
          {
            OR: [
              { badge: null },
              { badge: { not: 'archived' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        price: true,
        badge: true
      }
    });

    if (productsToArchive.length === 0) {
      console.log('✅ Tidak ada produk yang perlu diarsipkan. Hanya "Matcha Latte" yang aktif.\n');
      return;
    }

    console.log(`📋 Ditemukan ${productsToArchive.length} produk yang akan diarsipkan:\n`);
    productsToArchive.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (ID: ${product.id}) - Badge: ${product.badge || 'none'}`);
    });

    console.log('\n📦 Memulai proses pengarsipan...\n');

    // Arsipkan produk dengan mengubah badge menjadi 'archived'
    const updateResult = await prisma.product.updateMany({
      where: {
        id: {
          in: productsToArchive.map(p => p.id)
        }
      },
      data: {
        badge: 'archived'
      }
    });

    console.log(`✅ Berhasil mengarsipkan ${updateResult.count} produk!`);
    console.log('✅ Hanya "Matcha Latte" yang masih aktif.\n');

    // Tampilkan produk aktif yang tersisa
    const activeProducts = await prisma.product.findMany({
      where: {
        OR: [
          { badge: null },
          { badge: { not: 'archived' } }
        ]
      },
      select: {
        id: true,
        name: true,
        price: true,
        badge: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('📦 Produk aktif yang tersisa:');
    activeProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - Rp ${product.price.toLocaleString('id-ID')} (${product.category.name})`);
    });

    console.log('\n💡 Catatan: Produk yang diarsipkan masih ada di database tetapi tidak akan muncul di storefront.');
    console.log('💡 Anda bisa mengembalikannya dengan mengubah badge dari "archived" ke null atau badge lainnya.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
archiveProductsExceptMatcha()
  .then(() => {
    console.log('✨ Script selesai dijalankan!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script gagal:', error);
    process.exit(1);
  });
