"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  platformSmtpSettingsSchema,
  platformSmtpTestSchema,
  type PlatformSmtpSettingsInput,
} from "@/lib/validation/platform-smtp";
import type { PlatformSmtpSettingsView } from "@/services/platform-smtp-service";

type PlatformSmtpFormProps = {
  initialValues: PlatformSmtpSettingsView;
};

type PlatformSmtpFormInput = z.input<typeof platformSmtpSettingsSchema>;

export function PlatformSmtpForm({ initialValues }: PlatformSmtpFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const form = useForm<PlatformSmtpFormInput>({
    resolver: zodResolver(platformSmtpSettingsSchema),
    defaultValues: {
      host: initialValues.host,
      port: initialValues.port,
      secure: initialValues.secure,
      username: initialValues.username,
      password: "",
      fromEmail: initialValues.fromEmail,
      fromName: initialValues.fromName,
      leadInboxEmail: initialValues.leadInboxEmail,
    },
  });
  const secureValue = useWatch({
    control: form.control,
    name: "secure",
  });

  async function onSubmit(values: PlatformSmtpFormInput) {
    setIsSaving(true);

    try {
      const payload = platformSmtpSettingsSchema.parse(values) satisfies PlatformSmtpSettingsInput;
      const response = await fetch("/api/platform/smtp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "Gagal menyimpan SMTP platform.");
        setIsSaving(false);
        return;
      }

      toast.success("SMTP platform berhasil disimpan.");
      window.location.reload();
    } catch {
      toast.error("Terjadi gangguan saat menyimpan SMTP platform.");
      setIsSaving(false);
    }
  }

  async function handleTestEmail() {
    const parsed = platformSmtpTestSchema.safeParse({ toEmail: testEmail });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Email test tidak valid.");
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch("/api/platform/smtp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "Test SMTP gagal.");
        setIsTesting(false);
        return;
      }

      toast.success("Email test berhasil dikirim.");
      window.location.reload();
    } catch {
      toast.error("Terjadi gangguan saat mengirim test email.");
      setIsTesting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>SMTP Global</CardTitle>
            <CardDescription>
              Dipakai untuk email calon customer dari console utama, termasuk notifikasi trial
              ready dan setup link.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input id="host" placeholder="smtp.domainanda.com" {...form.register("host")} />
              <p className="text-xs text-destructive">{form.formState.errors.host?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                placeholder="587"
                type="number"
                {...form.register("port", { valueAsNumber: true })}
              />
              <p className="text-xs text-destructive">{form.formState.errors.port?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secure">Secure</Label>
              <Select
                id="secure"
                onChange={(event) =>
                  form.setValue("secure", event.target.value === "true", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                value={secureValue ? "true" : "false"}
              >
                <option value="false">Tidak</option>
                <option value="true">Ya</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="no-reply@domainanda.com" {...form.register("username")} />
              <p className="text-xs text-destructive">{form.formState.errors.username?.message}</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">Password SMTP</Label>
              <Input id="password" placeholder={initialValues.hasPassword ? "Biarkan kosong untuk mempertahankan password lama" : "Masukkan password SMTP"} type="password" {...form.register("password")} />
              <p className="text-xs text-muted-foreground">
                {initialValues.hasPassword
                  ? "Password tersimpan di server dan tidak akan ditampilkan kembali."
                  : "Password wajib diisi saat setup pertama."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input id="fromEmail" placeholder="no-reply@domainanda.com" {...form.register("fromEmail")} />
              <p className="text-xs text-destructive">{form.formState.errors.fromEmail?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input id="fromName" placeholder="Besawit" {...form.register("fromName")} />
              <p className="text-xs text-destructive">{form.formState.errors.fromName?.message}</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="leadInboxEmail">Lead Notification Email</Label>
              <Input
                id="leadInboxEmail"
                placeholder="sales@domainanda.com"
                {...form.register("leadInboxEmail")}
              />
              <p className="text-xs text-muted-foreground">
                Email internal untuk menerima notifikasi trial request baru.
              </p>
              <p className="text-xs text-destructive">
                {form.formState.errors.leadInboxEmail?.message}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Menyimpan..." : "Simpan SMTP"}
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status SMTP</CardTitle>
            <CardDescription>
              Gambaran cepat apakah SMTP aktif dari database platform atau masih fallback ke environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/80 bg-muted/10 p-4">
              <div className="font-medium text-foreground">
                {initialValues.isConfigured ? "SMTP aktif" : "SMTP belum lengkap"}
              </div>
              <p className="mt-2 text-muted-foreground">
                Sumber konfigurasi saat ini:{" "}
                <span className="font-semibold text-foreground">{initialValues.source}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Password:{" "}
                <span className="font-semibold text-foreground">
                  {initialValues.hasPassword ? "tersimpan" : "belum ada"}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/10 p-4">
              <div className="font-medium text-foreground">Hasil Test Terakhir</div>
              <p className="mt-2 text-muted-foreground">
                Status:{" "}
                <span className="font-semibold text-foreground">
                  {initialValues.lastTestStatus}
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Waktu:{" "}
                <span className="font-semibold text-foreground">
                  {initialValues.lastTestAt
                    ? new Date(initialValues.lastTestAt).toLocaleString("id-ID")
                    : "-"}
                </span>
              </p>
              {initialValues.lastTestError ? (
                <p className="mt-2 text-xs text-destructive">{initialValues.lastTestError}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>
              Kirim email uji dari konfigurasi SMTP yang tersimpan di platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email Tujuan Test</Label>
              <Input
                id="testEmail"
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="owner@domainanda.com"
                type="email"
                value={testEmail}
              />
            </div>
            <Button disabled={isTesting} onClick={handleTestEmail} type="button" variant="outline">
              {isTesting ? "Mengirim..." : "Kirim Test Email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
