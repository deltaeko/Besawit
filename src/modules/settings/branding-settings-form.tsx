"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, type ChangeEvent } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import { AppLogo } from "@/components/branding/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildBrandTheme } from "@/lib/branding-theme";
import type { BrandingAssetKind } from "@/lib/branding-assets";
import {
  brandingSettingsSchema,
  type BrandingSettingsFormValues,
} from "@/lib/validation/branding";
import { deriveBrandMark } from "@/lib/brand";

type BrandingSettingsFormProps = {
  initialValues: BrandingSettingsFormValues;
};

type AssetFieldProps = {
  fieldName: BrandingAssetKind;
  formError?: string;
  helper: string;
  inputId: string;
  isUploading: boolean;
  label: string;
  onChange: UseFormRegisterReturn;
  onFileUpload: (fieldName: BrandingAssetKind, event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  value?: string;
};

function PreviewImage({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} className="h-20 w-full object-contain bg-muted/10 p-3" src={src} />
    </div>
  );
}

function AssetField({
  fieldName,
  formError,
  helper,
  inputId,
  isUploading,
  label,
  onChange,
  onFileUpload,
  placeholder,
  value,
}: AssetFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} placeholder={placeholder} {...onChange} />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          htmlFor={`${inputId}-upload`}
        >
          {isUploading ? "Mengunggah..." : "Upload File"}
        </label>
        <input
          accept=".png,.jpg,.jpeg,.webp,.ico"
          className="hidden"
          disabled={isUploading}
          id={`${inputId}-upload`}
          onChange={(event) => onFileUpload(fieldName, event)}
          type="file"
        />
        {value ? (
          <Button
            onClick={() => {
              onChange.onChange({
                target: { name: onChange.name, value: "" },
              });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Kosongkan URL
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{helper}</p>
      <p className="text-xs text-destructive">{formError}</p>
    </div>
  );
}

export function BrandingSettingsForm({ initialValues }: BrandingSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<BrandingAssetKind | null>(null);
  const form = useForm<BrandingSettingsFormValues>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: initialValues,
  });

  const watched = useWatch({
    control: form.control,
  });
  const previewName = watched.appDisplayName?.trim() || watched.companyName?.trim() || "Brand";
  const previewTagline = watched.tagline?.trim() || "Tagline perusahaan";
  const previewMark = useMemo(() => deriveBrandMark(previewName), [previewName]);
  const previewTheme = useMemo(
    () =>
      buildBrandTheme({
        primaryColor: watched.primaryColor,
        accentColor: watched.accentColor,
      }),
    [watched.accentColor, watched.primaryColor],
  );

  const logoUrlField = form.register("logoUrl");
  const logoSquareUrlField = form.register("logoSquareUrl");
  const faviconUrlField = form.register("faviconUrl");

  async function handleFileUpload(
    fieldName: BrandingAssetKind,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadingField(fieldName);

    try {
      const formData = new FormData();
      formData.set("assetKind", fieldName);
      formData.set("file", file);

      const response = await fetch("/api/settings/branding/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { assetUrl?: string; error?: string };

      if (!response.ok || !result.assetUrl) {
        toast.error(result.error ?? "Upload branding asset gagal.");
        setUploadingField(null);
        return;
      }

      form.setValue(fieldName, result.assetUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Asset berhasil diunggah.");
    } catch {
      toast.error("Terjadi gangguan saat upload asset.");
    } finally {
      setUploadingField(null);
    }
  }

  async function onSubmit(values: BrandingSettingsFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(result.error ?? "Gagal menyimpan branding settings.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Branding settings berhasil disimpan.");
      window.location.reload();
    } catch {
      toast.error("Terjadi gangguan saat menyimpan branding settings.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Identitas Brand</CardTitle>
            <CardDescription>
              Atur nama usaha, nama aplikasi yang tampil, dan tagline singkat untuk shell
              aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nama Perusahaan / Usaha</Label>
              <Input id="companyName" {...form.register("companyName")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.companyName?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDisplayName">Nama Tampil Aplikasi</Label>
              <Input
                id="appDisplayName"
                placeholder="contoh: Sugeng Sawit"
                {...form.register("appDisplayName")}
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.appDisplayName?.message}
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea
                id="tagline"
                placeholder="Operasional sawit, stok, toko, dan finance untuk satu usaha."
                rows={3}
                {...form.register("tagline")}
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.tagline?.message}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aset Visual</CardTitle>
            <CardDescription>
              Anda bisa tempel URL publik atau upload file langsung dari aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <AssetField
              fieldName="logoUrl"
              formError={form.formState.errors.logoUrl?.message}
              helper="Dipakai pada area preview besar atau fallback jika logo kotak belum diisi."
              inputId="logoUrl"
              isUploading={uploadingField === "logoUrl"}
              label="Logo URL"
              onChange={logoUrlField}
              onFileUpload={handleFileUpload}
              placeholder="https://domainanda.com/logo.png"
              value={watched.logoUrl}
            />
            <AssetField
              fieldName="logoSquareUrl"
              formError={form.formState.errors.logoSquareUrl?.message}
              helper="Paling cocok untuk sidebar, header, dan ikon aplikasi tenant."
              inputId="logoSquareUrl"
              isUploading={uploadingField === "logoSquareUrl"}
              label="Logo Kotak URL"
              onChange={logoSquareUrlField}
              onFileUpload={handleFileUpload}
              placeholder="https://domainanda.com/logo-square.png"
              value={watched.logoSquareUrl}
            />
            <AssetField
              fieldName="faviconUrl"
              formError={form.formState.errors.faviconUrl?.message}
              helper="Jika diisi, browser tab tenant akan mencoba memakai icon ini."
              inputId="faviconUrl"
              isUploading={uploadingField === "faviconUrl"}
              label="Favicon URL"
              onChange={faviconUrlField}
              onFileUpload={handleFileUpload}
              placeholder="https://domainanda.com/favicon.png"
              value={watched.faviconUrl}
            />
            <p className="text-xs text-muted-foreground">
              Format upload: PNG, JPG, WEBP, atau ICO. Maksimum 4 MB per file.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warna dan Kontak</CardTitle>
            <CardDescription>
              Siapkan warna dasar brand dan kontak bantuan yang akan dipakai untuk tahap
              berikutnya.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input id="primaryColor" placeholder="#1f3b23" {...form.register("primaryColor")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.primaryColor?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <Input id="accentColor" placeholder="#e0f46e" {...form.register("accentColor")} />
              <p className="text-xs text-destructive">
                {form.formState.errors.accentColor?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Email Bantuan</Label>
              <Input
                id="supportEmail"
                placeholder="support@domainanda.com"
                {...form.register("supportEmail")}
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.supportEmail?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">No. Bantuan</Label>
              <Input
                id="supportPhone"
                placeholder="081234567890"
                {...form.register("supportPhone")}
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.supportPhone?.message}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Menyimpan..." : "Simpan Branding"}
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview Shell</CardTitle>
            <CardDescription>
              Gambaran cepat bagaimana brand akan tampil pada header dan sidebar tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AppLogo
              imageAlt={previewName}
              imageUrl={watched.logoSquareUrl || watched.logoUrl || null}
              mark={previewMark}
              name={previewName}
              showTagline
              tagline={previewTagline}
            />
            <div
              className="rounded-[1.5rem] border border-border/80 p-4 text-white"
              style={{
                background:
                  `radial-gradient(circle at top right, ${previewTheme["--brand-accent-glow"]}, transparent 34%), ` +
                  `linear-gradient(145deg, ${previewTheme["--brand-primary"]} 0%, #142117 100%)`,
              }}
            >
              <AppLogo
                imageAlt={previewName}
                imageUrl={watched.logoSquareUrl || watched.logoUrl || null}
                mark={previewMark}
                name={previewName}
                showTagline={false}
                textClassName="text-white"
              />
              <p className="mt-3 text-sm text-white/70">Preview panel gelap untuk area login.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-[1.35rem] border border-border/80 p-4 shadow-sm"
                style={{
                  background:
                    `radial-gradient(circle at top left, ${previewTheme["--brand-accent-soft"]}, transparent 42%), ` +
                    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,247,0.96))",
                }}
              >
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Warna Aktif
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-3 py-2">
                    <span
                      className="size-6 rounded-full border border-black/10"
                      style={{ backgroundColor: previewTheme["--brand-primary"] }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Primary</div>
                      <div className="text-xs text-muted-foreground">{watched.primaryColor || "#1f3b23"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 px-3 py-2">
                    <span
                      className="size-6 rounded-full border border-black/10"
                      style={{ backgroundColor: previewTheme["--brand-accent"] }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Accent</div>
                      <div className="text-xs text-muted-foreground">{watched.accentColor || "#e0f46e"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-border/80 bg-white/90 p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Kontak Bantuan
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-semibold text-foreground">
                      {watched.supportEmail?.trim() || "support@domainanda.com"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                    <div className="text-xs text-muted-foreground">WhatsApp / Telepon</div>
                    <div className="text-sm font-semibold text-foreground">
                      {watched.supportPhone?.trim() || "081234567890"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {watched.logoUrl ? <PreviewImage alt="Logo utama" src={watched.logoUrl} /> : null}
            {watched.logoSquareUrl ? (
              <PreviewImage alt="Logo kotak" src={watched.logoSquareUrl} />
            ) : null}
            {watched.faviconUrl ? <PreviewImage alt="Favicon" src={watched.faviconUrl} /> : null}
            {!watched.logoUrl && !watched.logoSquareUrl && !watched.faviconUrl ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                Preview gambar akan muncul setelah Anda mengisi URL aset visual.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
