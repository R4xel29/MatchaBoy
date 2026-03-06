import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Matcha cup illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-matcha-100 to-matcha-200 
          flex items-center justify-center shadow-lg shadow-matcha-200/30 rotate-6">
          <span className="text-5xl -rotate-6">🍵</span>
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full 
          bg-red-100 flex items-center justify-center border-2 border-white shadow-sm">
          <span className="text-lg font-bold text-red-500">?</span>
        </div>
      </div>

      <h1 className="font-heading font-bold text-4xl text-foreground mb-2">404</h1>
      <h2 className="font-heading font-bold text-xl text-foreground mb-2">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        Sepertinya matcha yang kamu cari tersesat. Yuk kembali ke menu utama!
      </p>

      <Link
        href="/"
        className="px-8 py-3.5 rounded-xl gradient-matcha text-white 
          font-semibold text-sm shadow-lg shadow-matcha-700/20
          hover:opacity-95 transition-opacity"
      >
        Kembali ke Menu
      </Link>

      <p className="text-[10px] text-muted-foreground mt-6">
        mattchaboy — New Culture Matcha
      </p>
    </div>
  );
}
