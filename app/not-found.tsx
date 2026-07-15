import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] text-center px-6 font-sans">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-8">
        <svg className="w-10 h-10 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
        404
      </h1>
      <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
        Halaman Tidak Ditemukan
      </p>
      <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-md mx-auto mb-10 leading-relaxed">
        URL yang Anda tuju tidak ada atau sudah dipindahkan. Pastikan alamat yang diketik sudah benar.
      </p>
      <Link
        href="/"
        className="px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
