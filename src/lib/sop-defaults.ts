import { prisma } from './prisma';

export const DEFAULT_JOBDESKS = [
  { code: 'GENERAL', name: 'Semua / Umum', description: 'Tugas umum yang berlaku untuk seluruh staf operasional', sortOrder: 1 },
  { code: 'BARISTA', name: 'Barista Bar', description: 'Operasional coffee bar, kalibrasi espresso, mesin & grinder', sortOrder: 2 },
  { code: 'CASHIER', name: 'Kasir POS', description: 'Pelayanan kasir, laci modal, transaksi pembayaran, dan packaging', sortOrder: 3 },
  { code: 'KITCHEN', name: 'Kitchen / Dapur', description: 'Pengolahan makanan, snack, etalase pastry, dan kebersihan dapur', sortOrder: 4 },
  { code: 'CLEANING', name: 'Kebersihan & Fasilitas', description: 'Kebersihan area meja dine-in, lantai, toilet, dan sarana outlet', sortOrder: 5 },
];

export const DEFAULT_OPENING_ITEMS = [
  { category: 'OPENING', jobdeskCode: 'CLEANING', title: 'Kebersihan area meja bar, lantai outlet, dan meja kursi pelanggan', description: 'Sapu, pel lantai, dan lap meja menggunakan sanitizer sebelum outlet buka.', isPhotoRequired: true, sortOrder: 1 },
  { category: 'OPENING', jobdeskCode: 'BARISTA', title: 'Nyalakan mesin espresso, grinder, dan water boiler', description: 'Pastikan tekanan bar & suhu boiler stabil, dial-in kalibrasi espresso pertama.', isPhotoRequired: false, sortOrder: 2 },
  { category: 'OPENING', jobdeskCode: 'BARISTA', title: 'Periksa stok es batu kristal dan suhu chiller/kulkas', description: 'Pastikan suhu chiller susu di bawah 4°C dan stok es mencukupi untuk shift pagi.', isPhotoRequired: true, sortOrder: 3 },
  { category: 'OPENING', jobdeskCode: 'CASHIER', title: 'Hitung dan pastikan uang modal awal kembalian di laci kasir', description: 'Cocokkan nominal fisik kas laci dengan modal awal yang diinput di POS kasir.', isPhotoRequired: false, sortOrder: 4 },
  { category: 'OPENING', jobdeskCode: 'CASHIER', title: 'Nyalakan tablet kasir POS, koneksikan printer Bluetooth, dan buka shift', description: 'Tes cetak struk pembuka dan verifikasi koneksi internet outlet aktif.', isPhotoRequired: false, sortOrder: 5 },
  { category: 'OPENING', jobdeskCode: 'GENERAL', title: 'Cek kesiapan cup (12oz/16oz), tutup cup, sedotan, tisu, dan bag take-away', description: 'Pastikan packaging bersih, tersusun rapi, dan stok minimum aman.', isPhotoRequired: true, sortOrder: 6 },
];

export const DEFAULT_CLOSING_ITEMS = [
  { category: 'CLOSING', jobdeskCode: 'BARISTA', title: 'Backflush dan cuci portafilter mesin espresso dengan chemical cleaner', description: 'Gunakan blind basket & bubuk pembersih espresso, bilas hingga air jernih.', isPhotoRequired: true, sortOrder: 1 },
  { category: 'CLOSING', jobdeskCode: 'BARISTA', title: 'Bersihkan kerak susu steam wand & lap kering kain microfiber', description: 'Purge steam wand, rendam ujung wand dengan air panas bila ada kerak susu.', isPhotoRequired: true, sortOrder: 2 },
  { category: 'CLOSING', jobdeskCode: 'BARISTA', title: 'Kosongkan hopper grinder dan simpan sisa biji kopi ke wadah kedap udara', description: 'Vakum sisa bubuk kopi di chamber grinder agar tidak bau tengik.', isPhotoRequired: false, sortOrder: 3 },
  { category: 'CLOSING', jobdeskCode: 'CLEANING', title: 'Buang ampas knockbox dan bersihkan semua tempat sampah ke luar', description: 'Ganti plastik sampah baru di semua tong sampah bar & area dine-in.', isPhotoRequired: true, sortOrder: 4 },
  { category: 'CLOSING', jobdeskCode: 'BARISTA', title: 'Simpan seluruh susu terbuka, saus, dan sirup ke dalam kulkas tertutup', description: 'Tutup rapat botol saus/sirup, simpan susu ke chiller bersuhu dingin.', isPhotoRequired: false, sortOrder: 5 },
  { category: 'CLOSING', jobdeskCode: 'CASHIER', title: 'Tutup shift di kasir POS, hitung uang fisik kasir, dan amankan setoran', description: 'Pastikan total kas fisik dicocokkan dengan laporan tutup shift POS.', isPhotoRequired: true, sortOrder: 6 },
  { category: 'CLOSING', jobdeskCode: 'GENERAL', title: 'Matikan mesin espresso, chiller AC, sound system BGM, dan lampu non-vital', description: 'Pastikan seluruh kran air tertutup rapat dan steker alat non-kulkas dicabut.', isPhotoRequired: false, sortOrder: 7 },
  { category: 'CLOSING', jobdeskCode: 'GENERAL', title: 'Kunci seluruh pintu kaca dan pasang gembok pengaman / rolling door', description: 'Periksa kembali jendela, pintu darurat, dan rolling door terkunci ganda.', isPhotoRequired: true, sortOrder: 8 },
];

export const DEFAULT_ROUTINE_ITEMS = [
  { category: 'ROUTINE', jobdeskCode: 'CLEANING', title: 'Pembersihan meja dine-in & pengecekan toilet pelanggan', description: 'Cek kebersihan toilet setiap 2 jam, pastikan tisu dan sabun cuci tangan tersedia.', isPhotoRequired: false, sortOrder: 1 },
  { category: 'ROUTINE', jobdeskCode: 'BARISTA', title: 'Pengecekan level stok sirup, susu cair, dan cup bar', description: 'Restock dari gudang penyimpanan sebelum habis pada jam sibuk.', isPhotoRequired: false, sortOrder: 2 },
  { category: 'ROUTINE', jobdeskCode: 'KITCHEN', title: 'Lap kaca display pastry dan rapikan area kasir', description: 'Pastikan etalase bersih bebas debu dan area laci kasir rapi.', isPhotoRequired: false, sortOrder: 3 },
];

export async function getOrSeedSopJobdesks(isAdmin: boolean = false) {
  try {
    const totalCount = await prisma.sopJobdesk.count();
    if (totalCount === 0) {
      for (const jd of DEFAULT_JOBDESKS) {
        await prisma.sopJobdesk.create({
          data: {
            code: jd.code,
            name: jd.name,
            description: jd.description,
            sortOrder: jd.sortOrder,
            isActive: true,
          },
        });
      }
    }

    return await prisma.sopJobdesk.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  } catch (err) {
    console.error('getOrSeedSopJobdesks error:', err);
    return [];
  }
}

export async function getOrSeedSopTemplates(isAdmin: boolean = false) {
  try {
    // Pastikan jobdesk default ada
    await getOrSeedSopJobdesks(true);

    const totalCount = await prisma.sopTemplateItem.count();
    if (totalCount === 0) {
      const allDefaults = [
        ...DEFAULT_OPENING_ITEMS,
        ...DEFAULT_CLOSING_ITEMS,
        ...DEFAULT_ROUTINE_ITEMS,
      ];
      for (const item of allDefaults) {
        await prisma.sopTemplateItem.create({
          data: {
            category: item.category,
            jobdeskCode: item.jobdeskCode || 'GENERAL',
            title: item.title,
            description: item.description,
            isPhotoRequired: item.isPhotoRequired,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });
      }
    }

    return await prisma.sopTemplateItem.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  } catch (err) {
    console.error('getOrSeedSopTemplates error:', err);
    return [];
  }
}
