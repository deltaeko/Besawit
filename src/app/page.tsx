import { redirect } from "next/navigation";
import Link from "next/link";

import { AppLogo } from "@/components/branding/app-logo";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { TenantInstanceState } from "@/components/shared/tenant-instance-state";
import { appBrand } from "@/lib/brand";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { TrialRequestForm } from "@/modules/marketing/trial-request-form";

const platformSteps = [
  "Calon customer daftar trial dari website publik.",
  "Sistem mencatat request ke control database dan membuat antrean provisioning.",
  "Setiap trial mendapatkan database terpisah, bukan tabel campur dengan customer lain.",
  "Begitu trial siap, user diarahkan ke login dan checklist onboarding awal.",
  "Saat trial selesai, data tetap bisa dipakai bila customer lanjut berbayar.",
];

export default async function HomePage() {
  const tenantContext = await resolveTenantContextFromRequest();

  if (tenantContext.kind === "tenant") {
    if (tenantContext.instance?.status === "ready") {
      redirect("/login");
    }

    return <TenantInstanceState context={tenantContext} />;
  }

  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-border/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,204,84,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,52,32,0.18),transparent_35%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <header className="flex items-center justify-between gap-6">
            <div>
              <AppLogo
                className="gap-4"
                markClassName="h-12 w-12 rounded-[1.1rem] text-sm"
                showTagline={false}
              />
              <div className="mt-2 text-sm text-muted-foreground">
                {appBrand.tagline}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full border border-border/80 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/70"
                href="/login"
              >
                Login
              </Link>
              <a
                className="rounded-full bg-[#183216] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#24452b]"
                href="#trial"
              >
                Mulai Trial
              </a>
            </div>
          </header>

          <div className="grid flex-1 gap-10 py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] lg:items-start lg:gap-12 lg:py-10 xl:gap-16">
            <section className="max-w-4xl pt-4 lg:pt-10">
              <div className="inline-flex rounded-full border border-[#22462f]/10 bg-white/80 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[#315d3f] shadow-sm">
                Trial otomatis dengan database terpisah
              </div>
              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-[#112017] sm:text-6xl lg:text-7xl">
                Website publik untuk closing, aplikasi operasional untuk customer yang
                siap jalan.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[#3d5144] sm:text-lg">
                {appBrand.name} sekarang diarahkan ke model yang lebih aman untuk trial dan
                customer berbayar: satu codebase, banyak instance, dan satu database
                terpisah untuk setiap usaha yang mendaftar.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.6rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_-24px_rgba(31,45,29,0.25)]">
                  <div className="font-mono text-xs uppercase tracking-[0.26em] text-primary/70">
                    Trial
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[#112017]">7 Hari</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Cocok untuk user mencoba alur beli TBS, stok, toko, dan finance.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/80 bg-[#183216] p-5 text-white shadow-[0_18px_40px_-24px_rgba(24,50,22,0.45)]">
                  <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#d8f26a]">
                    Isolasi Data
                  </div>
                  <div className="mt-3 text-2xl font-semibold">1 DB / Customer</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Menghindari data campur dan mempermudah backup, restore, dan upgrade.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_-24px_rgba(31,45,29,0.25)]">
                  <div className="font-mono text-xs uppercase tracking-[0.26em] text-primary/70">
                    Aktivasi
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[#112017]">Contact Sales</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Setelah trial selesai, data tetap bisa dilanjutkan tanpa reset.
                  </p>
                </div>
              </div>

              <div className="mt-12">
                <div className="font-mono text-xs uppercase tracking-[0.34em] text-primary/65">
                  Mekanisme Trial
                </div>
                <div className="mt-5 grid gap-3">
                  {platformSteps.map((step, index) => (
                    <div
                      className="flex items-start gap-4 rounded-[1.4rem] border border-white/80 bg-white/75 px-4 py-4 shadow-sm"
                      key={step}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d8f26a] font-mono text-sm font-semibold text-[#183216]">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-7 text-[#2e4234]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <SupportWhatsappButton
                  label="Tanya via WhatsApp"
                  message={`Halo, saya tertarik mencoba ${appBrand.name} dan ingin tanya dulu sebelum daftar trial.`}
                  showAvailability
                  source="landing-inline"
                />
                <p className="text-sm text-muted-foreground">
                  Jika calon customer bingung soal setup atau trial, arahkan langsung ke chat
                  ini supaya tidak berhenti di form.
                </p>
              </div>
            </section>

            <section className="self-start lg:sticky lg:top-6 xl:top-8" id="trial">
              <TrialRequestForm />
            </section>
          </div>
        </div>
        <SupportWhatsappButton
          float
          label="Chat Sales"
          message={`Halo, saya sedang melihat landing page ${appBrand.name} dan ingin tanya mengenai trial atau paket berbayar.`}
          source="landing-float"
        />
      </section>
    </main>
  );
}
