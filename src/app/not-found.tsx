import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(224,244,110,0.16),_transparent_28%),linear-gradient(180deg,_#f5f8f1_0%,_#edf3eb_100%)] px-6 py-16">
      <div className="w-full max-w-2xl rounded-[2rem] border border-border/70 bg-background/92 p-8 shadow-[0_28px_80px_-48px_rgba(31,59,35,0.45)] backdrop-blur">
        <div className="font-mono text-xs uppercase tracking-[0.32em] text-primary">
          404
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          URL yang Anda buka tidak tersedia, sudah dipindahkan, atau tenant yang dituju
          belum terdaftar di Besawit.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            href="/"
          >
            Kembali ke Beranda
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40"
            href="/login"
          >
            Buka Login
          </Link>
        </div>
      </div>
    </main>
  );
}
