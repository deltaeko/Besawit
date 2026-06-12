"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type WelcomeOnboardingModalProps = {
  open: boolean;
  firstPendingHref: string | null;
};

export function WelcomeOnboardingModal({
  open,
  firstPendingHref,
}: WelcomeOnboardingModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(open);

  const cleanedHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  if (!isVisible) {
    return null;
  }

  function dismiss() {
    setIsVisible(false);
    router.replace(cleanedHref);
  }

  function continueToOnboarding() {
    setIsVisible(false);
    router.replace(firstPendingHref ?? cleanedHref);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_36px_90px_-36px_rgba(22,39,24,0.38)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#183216_0%,#8fbe59_100%)]" />
        <button
          aria-label="Tutup onboarding"
          className="absolute right-4 top-4 rounded-full border border-border/80 bg-white/90 p-2 text-muted-foreground transition hover:text-foreground"
          onClick={dismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
            <Sparkles className="size-4" />
            First Login
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Selamat datang di Besawit
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Supaya user baru tidak bingung, kami sudah siapkan checklist onboarding di
              dashboard. Fokusnya sederhana: lengkapi data inti, lalu jalankan satu transaksi
              pertama agar alur kerja Besawit langsung terasa.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border/80 bg-muted/20 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
                1. Data Inti
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tambah gudang, produk, dan mitra utama yang paling sering dipakai.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/80 bg-muted/20 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
                2. Tim
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tambahkan pengguna kerja bila tenant ini dipakai lebih dari satu orang.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/80 bg-muted/20 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
                3. Uji Alur
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Jalankan satu transaksi contoh agar dashboard dan laporan mulai terisi.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="min-w-44" onClick={continueToOnboarding} type="button">
              Lanjut ke Checklist
            </Button>
            <Button onClick={dismiss} type="button" variant="outline">
              Nanti Saja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
