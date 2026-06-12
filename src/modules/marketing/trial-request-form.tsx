"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { SupportWhatsappButton } from "@/components/shared/support-whatsapp-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trialRequestSchema } from "@/lib/validation/trial";

type TrialRequestValues = z.infer<typeof trialRequestSchema>;

type TrialRequestResponse = {
  ok: boolean;
  mode: "created" | "existing";
  subdomain?: string | null;
  loginUrl?: string | null;
  setupUrl?: string | null;
  trialEndsAt?: string | Date | null;
  contactWhatsapp?: string | null;
  error?: string;
};

export function TrialRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TrialRequestResponse | null>(null);
  const form = useForm<TrialRequestValues>({
    resolver: zodResolver(trialRequestSchema),
    defaultValues: {
      fullName: "",
      companyName: "",
      email: "",
      phone: "",
      city: "",
      requestedSubdomain: "",
      notes: "",
    },
  });

  async function onSubmit(values: TrialRequestValues) {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/trial-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as TrialRequestResponse;

      if (!response.ok) {
        toast.error(payload.error ?? "Trial belum bisa dibuat.");
        setIsSubmitting(false);
        return;
      }

      setResult(payload);
      form.reset();
      toast.success(
        payload.mode === "existing"
          ? "Trial yang masih aktif sudah ditemukan."
          : "Permintaan trial sudah masuk ke antrean provisioning.",
      );
    } catch {
      toast.error("Terjadi gangguan saat mengirim permintaan trial.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const trialReadyUrl = result?.loginUrl ?? null;
  const trialEndsLabel = result?.trialEndsAt
    ? new Date(result.trialEndsAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;
  const isProvisioningPending = Boolean(result && !result.setupUrl);
  const primaryResultActionLabel = isProvisioningPending ? "Lihat Status Trial" : "Buka Tenant";
  const setupStatusLabel = isProvisioningPending
    ? "Setup link menyusul setelah trial ready"
    : "Setup link sudah siap dipakai";

  return (
    <Card className="overflow-hidden border border-white/15 bg-[#112017]/90 text-white shadow-[0_36px_90px_-42px_rgba(0,0,0,0.6)]">
      <CardHeader className="border-b border-white/10 px-6 py-6 sm:px-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#d8f26a]/86">
          Trial instan
        </div>
        <CardTitle className="mt-3 text-3xl leading-tight">Coba Gratis 7 Hari</CardTitle>
        <CardDescription className="mt-2 max-w-xl text-[15px] leading-7 text-white/72">
          Isi data usaha Anda. Sistem akan membuat antrean trial dan menyiapkan instance
          terpisah untuk database Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-6 sm:px-7">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white" htmlFor="fullName">Nama PIC</Label>
              <Input className="h-12 rounded-2xl border-white/10 bg-white" id="fullName" {...form.register("fullName")} />
              <p className="text-xs text-[#ffb7ab]">{form.formState.errors.fullName?.message}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-white" htmlFor="companyName">Nama Usaha</Label>
              <Input className="h-12 rounded-2xl border-white/10 bg-white" id="companyName" {...form.register("companyName")} />
              <p className="text-xs text-[#ffb7ab]">
                {form.formState.errors.companyName?.message}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white" htmlFor="email">Email</Label>
              <Input className="h-12 rounded-2xl border-white/10 bg-white" id="email" type="email" {...form.register("email")} />
              <p className="text-xs text-[#ffb7ab]">{form.formState.errors.email?.message}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-white" htmlFor="phone">WhatsApp</Label>
              <Input className="h-12 rounded-2xl border-white/10 bg-white" id="phone" {...form.register("phone")} />
              <p className="text-xs text-[#ffb7ab]">{form.formState.errors.phone?.message}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-3">
              <Label className="text-white" htmlFor="city">Kota</Label>
              <Input className="h-12 rounded-2xl border-white/10 bg-white" id="city" {...form.register("city")} />
              <p className="text-xs text-[#ffb7ab]">{form.formState.errors.city?.message}</p>
            </div>
            <div className="space-y-2 lg:col-span-4">
              <Label className="text-white" htmlFor="requestedSubdomain">Subdomain yang Diinginkan</Label>
              <Input
                className="h-12 rounded-2xl border-white/10 bg-white"
                id="requestedSubdomain"
                placeholder="contoh: sawit-jaya"
                {...form.register("requestedSubdomain")}
              />
              <p className="text-xs text-[#a7c5b0]">Opsional. Akan dipakai bila masih tersedia.</p>
            </div>
            <div className="space-y-2 lg:col-span-5">
              <Label className="text-white" htmlFor="notes">Catatan</Label>
              <Textarea
                className="min-h-[124px] rounded-2xl border-white/10 bg-white"
                id="notes"
                placeholder="Jumlah admin, kebutuhan laporan, atau catatan setup lainnya."
                {...form.register("notes")}
              />
            </div>
          </div>

          <Button
            className="mt-2 h-12 w-full rounded-2xl bg-[#d8f26a] text-base font-semibold text-[#183216] hover:bg-[#c9e75a]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Mendaftarkan trial..." : "Daftarkan Trial"}
          </Button>
        </form>

        {result ? (
          <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/80">
            <div className="font-semibold text-white">
              {result.mode === "existing"
                ? "Trial aktif sudah ditemukan"
                : "Permintaan trial berhasil dicatat"}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Status
                </div>
                <div className="mt-2 font-semibold text-white">
                  {isProvisioningPending ? "Menunggu provisioning" : "Siap onboarding"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Subdomain
                </div>
                <div className="mt-2 break-all font-mono text-white">
                  {result.subdomain ?? "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Trial Aktif Sampai
                </div>
                <div className="mt-2 font-semibold text-white">{trialEndsLabel ?? "-"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3 sm:col-span-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#d8f26a]">
                  Setup Link
                </div>
                <div className="mt-2 font-semibold text-white">{setupStatusLabel}</div>
                <p className="mt-2 text-xs leading-5 text-white/70">
                  {isProvisioningPending
                    ? "Begitu trial selesai diproses, admin akan menerima setup link lewat email atau notifikasi trial ready."
                    : "Buka setup link untuk membuat password admin pertama sebelum login ke tenant."}
                </p>
              </div>
            </div>
            {result.subdomain ? (
              <p className="mt-2">
                Subdomain yang dicadangkan: <span className="font-mono text-[#d8f26a]">{result.subdomain}</span>
              </p>
            ) : null}
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-medium text-white">Langkah berikutnya</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8f26a]">
                    1. Tunggu
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/72">
                    Sistem menyiapkan tenant dan database terpisah untuk trial Anda.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8f26a]">
                    2. Setup
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/72">
                    {result.setupUrl
                      ? "Gunakan setup link untuk membuat password admin pertama."
                      : "Setup link akan dikirim setelah provisioning selesai. Jika trial sudah ready tapi link belum masuk, minta kirim ulang lewat WhatsApp."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8f26a]">
                    3. Uji Alur
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/72">
                    Login, isi master penting, lalu buat satu transaksi contoh.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-white/66">
              Untuk aktivasi penuh setelah uji coba, customer akan diarahkan ke kontak Anda.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-[#183216] hover:bg-white/90" variant="secondary">
                {trialReadyUrl ? (
                  <a href={trialReadyUrl} rel="noreferrer" target="_blank">
                    Masuk ke Aplikasi
                  </a>
                ) : (
                  <Link href="/login">Masuk ke Aplikasi</Link>
                )}
              </Button>
              {trialReadyUrl ? (
                <Button asChild className="border border-white/20 bg-transparent text-white hover:bg-white/8" variant="outline">
                  <a href={trialReadyUrl} rel="noreferrer" target="_blank">
                    {primaryResultActionLabel}
                  </a>
                </Button>
              ) : null}
              {result.setupUrl ? (
                <Button asChild className="border border-white/20 bg-transparent text-white hover:bg-white/8" variant="outline">
                  <a href={result.setupUrl} rel="noreferrer" target="_blank">
                    Setup Password Admin
                  </a>
                </Button>
              ) : null}
              <SupportWhatsappButton
                className="border border-white/18 bg-transparent text-white hover:bg-white/8"
                label={isProvisioningPending ? "Minta Update Trial" : "Minta Kirim Ulang Setup Link"}
                message={
                  isProvisioningPending
                    ? `Halo, saya baru daftar trial Besawit untuk ${result.subdomain ?? "calon customer"} dan ingin cek status provisioning trial saya.`
                    : `Halo, trial ${result.subdomain ?? "saya"} sudah ready tetapi saya butuh bantuan atau kirim ulang setup link admin.`
                }
                phone={result.contactWhatsapp}
                source="trial-result"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
