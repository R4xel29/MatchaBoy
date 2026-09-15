import { prisma } from './prisma';

export const DEFAULT_OPENING_ITEMS = [
  { category: 'OPENING', title: 'Kebersihan area meja bar, lantai outlet, dan meja kursi pelanggan', description: 'Sapu, pel lantai, dan lap meja menggunakan sanitizer sebelum outlet buka.', isPhotoRequired: true, sortOrder: 1 },
  { category: 'OPENING', title: 'Nyalakan mesin espresso, grinder, dan water boiler', description: 'Pastikan tekanan bar & suhu boiler stabil, dial-in kalibrasi espresso pertama.', isPhotoRequired: false, sortOrder: 2 },
  { category: 'OPENING', title: 'Periksa stok es batu kristal dan suhu chiller/kulkas', description: 'Pastikan suhu chiller susu di bawah 4°C dan stok es mencukupi untuk shift pagi.', isPhotoRequired: true, sortOrder: 3 },
  { category: 'OPENING', title: 'Hitung dan pastikan uang modal awal kembalian di laci kasir', description: 'Cocokkan nominal fisik kas laci dengan modal awal yang diinput di POS kasir.', isPhotoRequired: false, sortOrder: 4 },
  { category: 'OPENING', title: 'Nyalakan tablet kasir POS, koneksikan printer Bluetooth, dan buka shift', description: 'Tes cetak struk pembuka dan verifikasi koneksi internet outlet aktif.', isPhotoRequired: false, sortOrder: 5 },
  { category: 'OPENING', title: 'Cek kesiapan cup (12oz/16oz), tutup cup, sedotan, tisu, dan bag take-away', description: 'Pastikan packaging bersih, tersusun rapi, dan stok minimum aman.', isPhotoRequired: true, sortOrder: 6 },
];

export const DEFAULT_CLOSING_ITEMS = [
  { category: 'CLOSING', title: 'Backflush dan cuci portafilter mesin espresso dengan chemical cleaner', description: 'Gunakan blind basket & bubuk pembersih espresso, bilas hingga air jernih.', isPhotoRequired: true, sortOrder: 1 },
  { category: 'CLOSING', title: 'Bersihkan kerak susu steam wand & lap kering kain microfiber', description: 'Purge steam wand, rendam ujung wand dengan air panas bila ada kerak susu.', isPhotoRequired: true, sortOrder: 2 },
  { category: 'CLOSING', title: 'Kosongkan hopper grinder dan simpan sisa biji kopi ke wadah kedap udara', description: 'Vakum sisa bubuk kopi di chamber grinder agar tidak bau tengik.', isPhotoRequired: false, sortOrder: 3 },
  { category: 'CLOSING', title: 'Buang ampas knockbox dan bersihkan semua tempat sampah ke luar', description: 'Ganti plastik sampah baru di semua tong sampah bar & area dine-in.', isPhotoRequired: true, sortOrder: 4 },
  { category: 'CLOSING', title: 'Simpan seluruh susu terbuka, saus, dan sirup ke dalam kulkas tertutup', description: 'Tutup rapat botol saus/sirup, simpan susu ke chiller bersuhu dingin.', isPhotoRequired: false, sortOrder: 5 },
  { category: 'CLOSING', title: 'Tutup shift di kasir POS, hitung uang fisik kasir, dan amankan setoran', description: 'Pastikan total kas fisik dicocokkan dengan laporan tutup shift POS.', isPhotoRequired: true, sortOrder: 6 },
  { category: 'CLOSING', title: 'Matikan mesin espresso, chiller AC, sound system BGM, dan lampu non-vital', description: 'Pastikan seluruh kran air tertutup rapat dan steker alat non-kulkas dicabut.', isPhotoRequired: false, sortOrder: 7 },
  { category: 'CLOSING', title: 'Kunci seluruh pintu kaca dan pasang gembok pengaman / rolling door', description: 'Periksa kembali jendela, pintu darurat, dan rolling door terkunci ganda.', isPhotoRequired: true, sortOrder: 8 },
];

export const DEFAULT_ROUTINE_ITEMS = [
  { category: 'ROUTINE', title: 'Pembersihan meja dine-in & pengecekan toilet pelanggan', description: 'Cek kebersihan toilet setiap 2 jam, pastikan tisu dan sabun cuci tangan tersedia.', isPhotoRequired: false, sortOrder: 1 },
  { category: 'ROUTINE', title: 'Pengecekan level stok sirup, susu cair, dan cup bar', description: 'Restock dari gudang penyimpanan sebelum habis pada jam sibuk.', isPhotoRequired: false, sortOrder: 2 },
  { category: 'ROUTINE', title: 'Lap kaca display pastry dan rapikan area kasir', description: 'Pastikan etalase bersih bebas debu dan area laci kasir rapi.', isPhotoRequired: false, sortOrder: 3 },
];

export async function getOrSeedSopTemplates(isAdmin: boolean = false) {
  try {
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
