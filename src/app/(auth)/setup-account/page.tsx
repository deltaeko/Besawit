import { redirect } from "next/navigation";

import { AppLogo } from "@/components/branding/app-logo";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { SetupAccountForm } from "@/modules/auth/setup-account-form";
import { appBrand } from "@/lib/brand";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { getResolvedBrandingSettings } from "@/services/branding-service";

type SetupAccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SetupAccountPage({
  searchParams,
}: SetupAccountPageProps) {
  const tenantContext = await resolveTenantContextFromRequest();
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const branding = await getResolvedBrandingSettings();

  if (!token) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(157,204,84,0.16),transparent_24%),linear-gradient(180deg,#f6faf6_0%,#eef4ee_100%)] px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_38px_90px_-44px_rgba(28,46,29,0.28)] lg:grid lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex overflow-hidden bg-[#233126] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,242,106,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(92,140,87,0.16),transparent_32%)]" />
          <div className="relative flex w-full flex-col gap-6 p-7 sm:p-8 lg:p-9">
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
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.34em] text-[#c8ddb9]">
                Step 1 Onboarding
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
                Buat password admin untuk mulai trial.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
                Link ini hanya dipakai sekali untuk mengaktifkan akun tenant. Setelah password
                tersimpan, Anda bisa langsung login dan uji alur operasional pertama.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Tenant
                </div>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  {tenantContext.kind === "tenant" && tenantContext.instance
                    ? tenantContext.instance.companyName
                    : "Trial Besawit"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Subdomain
                </div>
                <p className="mt-2 break-all text-sm leading-6 text-white/76">
                  {tenantContext.kind === "tenant" ? tenantContext.subdomain : "-"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Setelah Ini
                </div>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  Login, isi master inti, lalu coba satu transaksi contoh.
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <SupportWhatsappButton
                className="border border-white/15 bg-transparent text-white hover:bg-white/10"
                label="Butuh bantuan setup?"
                message={
                  tenantContext.kind === "tenant" && tenantContext.instance
                    ? `Halo, saya sedang setup akun trial ${tenantContext.instance.companyName} (${tenantContext.subdomain}) dan butuh bantuan.`
                    : `Halo, saya sedang setup akun trial ${appBrand.name} dan butuh bantuan.`
                }
                phone={branding.supportPhone}
                source="setup-account"
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(244,248,244,0.96)_100%)] p-6 sm:p-8 lg:p-9">
          <SetupAccountForm
            defaultEmail={tenantContext.kind === "tenant" ? tenantContext.instance?.adminEmail ?? "" : ""}
            token={token}
          />
        </section>
      </div>
    </main>
  );
}
