import Link from "next/link";

import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantContext } from "@/lib/platform/tenant-resolver";
import { buildSupportWhatsappHref } from "@/lib/support";

type TenantInstanceStateProps = {
  context: Extract<TenantContext, { kind: "tenant" }>;
};

function resolveTitle(context: TenantInstanceStateProps["context"]) {
  if (!context.instance) {
    return "Subdomain tidak ditemukan";
  }

  if (context.instance.status === "queued" || context.instance.status === "provisioning") {
    return "Instance trial sedang disiapkan";
  }

  if (context.instance.status === "expired") {
    return "Trial sudah berakhir";
  }

  if (context.instance.status === "suspended") {
    return "Akses instance ditangguhkan";
  }

  if (context.instance.status === "failed") {
    return "Provisioning trial belum berhasil";
  }

  return "Instance belum tersedia";
}

function resolveDescription(context: TenantInstanceStateProps["context"]) {
  if (!context.instance) {
    return `Subdomain ${context.subdomain} belum terdaftar di platform Besawit.`;
  }

  if (context.instance.status === "queued" || context.instance.status === "provisioning") {
    return `Database trial untuk ${context.instance.companyName} masih dalam proses provisioning. Setup link belum tersedia sekarang dan baru dikirim setelah trial siap dipakai.`;
  }

  if (context.instance.status === "expired") {
    return `Masa trial untuk ${context.instance.companyName} sudah selesai. Hubungi tim kami untuk aktivasi versi berbayar tanpa kehilangan data trial.`;
  }

  if (context.instance.status === "suspended") {
    return `Instance ${context.instance.companyName} sedang ditangguhkan. Hubungi tim kami untuk bantuan lanjutan.`;
  }

  if (context.instance.status === "failed") {
    return `Provisioning untuk ${context.instance.companyName} mengalami kegagalan. Tim kami perlu meninjau proses setup trial ini.`;
  }

  return `Instance ${context.instance.companyName} belum siap dipakai.`;
}

function buildWhatsappHref(context: TenantInstanceStateProps["context"]) {
  const companyName = context.instance?.companyName ?? context.subdomain;
  return buildSupportWhatsappHref({
    message: `Halo, saya butuh bantuan untuk instance Besawit ${companyName} (${context.subdomain}) dengan status ${context.instance?.status ?? "not-found"}.`,
  });
}

export function TenantInstanceState({ context }: TenantInstanceStateProps) {
  const whatsappHref = buildWhatsappHref(context);
  const isExpired = context.instance?.status === "expired";
  const isProvisioning =
    context.instance?.status === "queued" ||
    context.instance?.status === "provisioning";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(149,203,74,0.16),transparent_30%),linear-gradient(180deg,#f8faf8_0%,#eef3ef_100%)] px-4 py-12">
      <Card className="w-full max-w-2xl overflow-hidden border-white/80 bg-white/92 shadow-[0_32px_90px_-45px_rgba(24,50,22,0.35)]">
        <CardHeader>
          <div className="font-mono text-xs uppercase tracking-[0.34em] text-primary/75">
            {isExpired ? "Trial Expired" : isProvisioning ? "Provisioning" : "Instance Status"}
          </div>
          <CardTitle className="text-3xl tracking-tight">{resolveTitle(context)}</CardTitle>
          <CardDescription className="max-w-xl text-sm leading-7">
            {resolveDescription(context)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {context.instance ? (
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-sm">
              <div className="font-semibold text-foreground">{context.instance.companyName}</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                {context.subdomain}
              </div>
              {isProvisioning ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Setelah status berubah menjadi siap, admin akan menerima setup link untuk membuat
                  password pertama. Jika link belum masuk setelah trial ready, gunakan tombol
                  WhatsApp di bawah untuk meminta kirim ulang.
                </p>
              ) : null}
              {isExpired ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Data trial Anda tidak perlu diulang. Setelah aktivasi, instance yang sama bisa
                  langsung dilanjutkan sebagai customer berbayar.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {whatsappHref ? (
              <Button asChild className="bg-[#183216] hover:bg-[#24452b]">
                <a href={whatsappHref} rel="noreferrer" target="_blank">
                  Hubungi WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/">Kembali ke Beranda</Link>
            </Button>
            {isProvisioning ? (
              <Button asChild>
                <Link href="/">Refresh Halaman</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <SupportWhatsappButton
        float
        label="Hubungi Bantuan"
        message={`Halo, saya butuh bantuan untuk subdomain ${context.subdomain} di ${context.instance?.companyName ?? "Besawit"}.`}
        showAvailability
        source={`tenant-state:${context.instance?.status ?? "not-found"}`}
      />
    </main>
  );
}
