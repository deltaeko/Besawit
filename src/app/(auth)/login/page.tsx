import Link from "next/link";

import { AppLogo } from "@/components/branding/app-logo";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TenantInstanceState } from "@/components/shared/tenant-instance-state";
import { appBrand } from "@/lib/brand";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { buildSupportWhatsappHref } from "@/lib/support";
import { LoginForm } from "@/modules/auth/login-form";
import { getResolvedBrandingSettings } from "@/services/branding-service";

function readTrialOnboardingMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      loginUrl: null,
      setupExpiresAt: null,
    };
  }

  const data = metadata as Record<string, unknown>;
  const trialSetup =
    data.trialSetup && typeof data.trialSetup === "object" && !Array.isArray(data.trialSetup)
      ? (data.trialSetup as Record<string, unknown>)
      : null;

  return {
    loginUrl: typeof data.loginUrl === "string" ? data.loginUrl : null,
    setupExpiresAt:
      trialSetup && typeof trialSetup.expiresAt === "string" ? trialSetup.expiresAt : null,
  };
}

export default async function LoginPage() {
  const tenantContext = await resolveTenantContextFromRequest();

  if (tenantContext.kind === "tenant" && tenantContext.instance?.status !== "ready") {
    return <TenantInstanceState context={tenantContext} />;
  }

  const trialOnboarding =
    tenantContext.kind === "tenant" && tenantContext.instance
      ? readTrialOnboardingMetadata(tenantContext.instance.metadata)
      : null;
  const isTrialTenant =
    tenantContext.kind === "tenant" && tenantContext.instance?.instanceType === "trial";
  const whatsappHref =
    tenantContext.kind === "tenant" && tenantContext.instance
      ? buildSupportWhatsappHref({
          message: `Halo, saya sedang onboarding trial ${appBrand.name} untuk ${tenantContext.instance.companyName} (${tenantContext.subdomain}) dan butuh bantuan setup awal.`,
          phone: tenantContext.instance.metadata &&
            typeof tenantContext.instance.metadata === "object" &&
            !Array.isArray(tenantContext.instance.metadata) &&
            typeof (tenantContext.instance.metadata as Record<string, unknown>).supportPhone === "string"
              ? String((tenantContext.instance.metadata as Record<string, unknown>).supportPhone)
              : null,
        })
      : null;
  const defaultEmail =
    tenantContext.kind === "tenant" ? tenantContext.instance?.adminEmail ?? "" : "";
  const branding = await getResolvedBrandingSettings();

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(157,204,84,0.16),transparent_24%),linear-gradient(180deg,#f6faf6_0%,#eef4ee_100%)] px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto h-full w-full max-w-6xl">
        <section className="grid h-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_38px_90px_-44px_rgba(28,46,29,0.28)] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative flex h-full overflow-hidden bg-[#233126] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,242,106,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(92,140,87,0.16),transparent_32%)]" />
            <div className="relative flex h-full w-full flex-col gap-5 p-7 sm:p-8 lg:p-9">
              {tenantContext.kind === "tenant" && tenantContext.instance ? (
                <>
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#c8ddb9]">
                      Step 2 Onboarding
                    </div>
                    <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
                      Trial {tenantContext.instance.companyName} sudah siap dipakai.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
                      Masuk dengan akun trial, cek data inti usaha, lalu uji satu transaksi
                      pertama supaya user langsung paham alur Besawit.
                    </p>
                  </div>

                  <Card className="border-white/10 bg-white/8 text-white shadow-none">
                    <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#c8ddb9]">
                          Subdomain
                        </div>
                        <div className="mt-1.5 text-sm font-semibold sm:text-base">
                          {tenantContext.subdomain}.localhost:6001
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#c8ddb9]">
                          Status
                        </div>
                        <div className="mt-1.5 text-sm font-semibold sm:text-base">Ready</div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#c8ddb9]">
                          Email Login
                        </div>
                        <div className="mt-1.5 break-all text-sm font-semibold sm:text-base">
                          {defaultEmail || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#c8ddb9]">
                          Setup Akun
                        </div>
                        <div className="mt-1.5 break-all text-sm font-semibold sm:text-base">
                          {trialOnboarding?.setupExpiresAt
                            ? `Buat password via setup link sebelum ${new Date(trialOnboarding.setupExpiresAt).toLocaleString("id-ID")}`
                            : "Cek email/notifikasi trial ready untuk setup link, lalu buat password admin sebelum login."}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                        1. Login
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        Buka setup link dari email atau notifikasi trial ready untuk membuat
                        password admin, lalu login.
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                        2. Isi Master
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        Tambahkan data supplier, produk, gudang, atau user kerja yang dibutuhkan.
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                        3. Uji Transaksi
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        Buat satu transaksi contoh agar dashboard dan laporan mulai terisi.
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-1">
                    {trialOnboarding?.loginUrl ? (
                      <Button asChild className="bg-[#d8f26a] text-[#183216] hover:bg-[#c7e75b]">
                        <a href={trialOnboarding.loginUrl}>Buka URL Trial</a>
                      </Button>
                    ) : null}
                    {whatsappHref ? (
                      <Button
                        asChild
                        className="border-white/15 bg-transparent text-white hover:bg-white/10"
                        variant="outline"
                      >
                        <a href={whatsappHref} rel="noreferrer" target="_blank">
                          Minta Bantuan Setup
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <AppLogo
                    fallbackImageUrl={branding.logoUrl}
                    imageAlt={branding.appDisplayName}
                    imageUrl={branding.logoSquareUrl}
                    mark={branding.mark}
                    markClassName="h-12 w-12 rounded-[1.1rem] border-white/10 text-sm"
                    name={branding.appDisplayName}
                    showTagline={false}
                    textClassName="text-white"
                  />
                  <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    Palm agent, inventory, toko pertanian, dan finance dalam satu sistem.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/72">
                    Fokus pada operasional cepat, akurasi margin, kontrol stock, dan jejak
                    audit yang jelas untuk bisnis sawit dan toko.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex h-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(244,248,244,0.96)_100%)] p-6 sm:p-8 lg:p-9">
            <div className="w-full max-w-md space-y-3">
              <div className="mb-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary/65">
                  {branding.appDisplayName} Tenant
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#152419]">
                  Masuk ke area kerja
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Gunakan akun trial yang sudah disiapkan untuk mulai onboarding dan mencoba
                  alur operasional pertama.
                </p>
              </div>
              <LoginForm brandName={branding.appDisplayName} defaultEmail={defaultEmail} />
              {isTrialTenant ? (
                <div className="rounded-2xl border border-border/80 bg-white/80 p-4 text-sm leading-6 text-muted-foreground shadow-[0_18px_50px_-34px_rgba(31,45,29,0.3)]">
                  Setup link dikirim setelah trial siap dipakai. Jika Anda belum membuat password
                  admin, cek email/notifikasi trial ready lebih dulu atau minta bantuan kirim
                  ulang link setup.
                  <div className="mt-3">
                    <Link
                      className="font-semibold text-foreground underline-offset-4 hover:underline"
                      href="/"
                    >
                      Kembali ke status trial
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      <SupportWhatsappButton
        float
        label="Chat Bantuan"
        message={
          tenantContext.kind === "tenant" && tenantContext.instance
            ? `Halo, saya sedang berada di halaman login tenant ${tenantContext.instance.companyName} (${tenantContext.subdomain}) dan butuh bantuan masuk atau setup.`
            : `Halo, saya butuh bantuan login ke ${branding.appDisplayName}.`
        }
        phone={branding.supportPhone}
        showAvailability
        source="tenant-login"
      />
    </main>
  );
}
