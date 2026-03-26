"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";

type DuplicateStrategy = "update_existing" | "skip_existing";

type PreviewRow = {
  lineNumber: number;
  code: string;
  name: string;
  categoryCode: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  operation: "create" | "update" | "skip";
  status: "valid" | "error" | "skip";
  messages: string[];
};

type PreviewResult = {
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    createRows: number;
    updateRows: number;
    skipRows: number;
  };
  rows: PreviewRow[];
  missingHeaders: string[];
};

type ApplyResult = {
  summary: {
    totalRows: number;
    createdRows: number;
    updatedRows: number;
    skippedRows: number;
    errorRows: number;
  };
  skippedCodes: string[];
  errors: Array<{ lineNumber: number; code: string; message: string }>;
};

function operationBadge(operation: PreviewRow["operation"]) {
  if (operation === "create") {
    return <Badge variant="success">Buat Baru</Badge>;
  }

  if (operation === "update") {
    return <Badge variant="warning">Update</Badge>;
  }

  return <Badge variant="neutral">Lewati</Badge>;
}

function statusBadge(status: PreviewRow["status"]) {
  if (status === "valid") {
    return <Badge variant="success">Siap Import</Badge>;
  }

  if (status === "skip") {
    return <Badge variant="neutral">Dilewati</Badge>;
  }

  return <Badge variant="destructive">Perlu Perbaikan</Badge>;
}

export function ProductImportForm() {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>("update_existing");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  const previewRows = useMemo(() => preview?.rows.slice(0, 20) ?? [], [preview]);
  const hasValidPreviewRows = Boolean(preview?.summary.validRows);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setFile(null);
      setPreview(null);
      return;
    }

    setFileName(file.name);
    setFile(file);
    setPreview(null);
    setApplyResult(null);
  }

  async function requestImport(action: "preview" | "apply") {
    if (!file) {
      toast.error("Pilih file Excel atau CSV produk terlebih dahulu.");
      return;
    }

    if (action === "preview") {
      setLoadingPreview(true);
    } else {
      setApplying(true);
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("duplicateStrategy", duplicateStrategy);
    formData.set("action", action);

    const response = await fetch("/api/products/import", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as
      | ({ error?: string } & Partial<PreviewResult> & Partial<ApplyResult>)
      | undefined;

    if (!response.ok) {
      toast.error(result?.error ?? "Gagal memproses import produk.");
      setLoadingPreview(false);
      setApplying(false);
      return;
    }

    if (action === "preview") {
      setPreview(result as PreviewResult);
      setApplyResult(null);
      toast.success("Preview import produk berhasil dibuat.");
      setLoadingPreview(false);
      return;
    }

    setApplyResult(result as ApplyResult);
    toast.success("Import produk selesai diproses.");
    setApplying(false);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="File Import"
        description="Gunakan file Excel hasil unduhan template. Sistem akan membaca data, menampilkan preview, lalu membuat atau memperbarui produk berdasarkan kode."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-import-file">File Import Produk</Label>
              <Input
                id="product-import-file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                type="file"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan file Excel sebagai format utama. CSV tetap tersedia sebagai opsi tambahan bila dibutuhkan.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicateStrategy">Perlakuan Jika Kode Produk Sudah Ada</Label>
              <Select
                id="duplicateStrategy"
                onChange={(event) =>
                  setDuplicateStrategy(event.target.value as DuplicateStrategy)
                }
                value={duplicateStrategy}
              >
                <option value="update_existing">Update produk existing berdasarkan kode</option>
                <option value="skip_existing">Lewati produk existing</option>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild type="button" variant="outline">
                <Link href="/api/products/import/template">Unduh Template Excel</Link>
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/api/products/import/template?format=csv">Unduh CSV</Link>
              </Button>
              <Button
                disabled={loadingPreview || !file}
                onClick={() => requestImport("preview")}
                type="button"
                variant="secondary"
              >
                {loadingPreview ? "Membaca File..." : "Preview Import"}
              </Button>
              <Button
                disabled={applying || !hasValidPreviewRows}
                onClick={() => requestImport("apply")}
                type="button"
              >
                {applying ? "Mengimpor..." : "Proses Import"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/20 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ringkasan File</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Nama file</span>
                <span className="font-semibold">{fileName || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Strategi duplikasi</span>
                <span className="font-semibold">
                  {duplicateStrategy === "update_existing" ? "Update Existing" : "Lewati Existing"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status preview</span>
                <span className="font-semibold">{preview ? "Siap ditinjau" : "Belum dibuat"}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
              Pastikan `category_code` sudah ada di master kategori sebelum import dilakukan.
            </div>
          </div>
        </div>
      </SectionCard>

      {preview ? (
        <SectionCard
          title="Preview Import"
          description="Periksa hasil validasi sebelum data benar-benar dimasukkan ke master produk."
        >
          {preview.missingHeaders.length ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              Header wajib belum lengkap: {preview.missingHeaders.join(", ")}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Baris</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.totalRows, 0)}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Siap Import</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.validRows, 0)}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Buat Baru</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.createRows, 0)}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Update</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.updateRows, 0)}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dilewati</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.skipRows, 0)}</div>
                </div>
                <div className="rounded-2xl border bg-destructive/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Error</div>
                  <div className="mt-2 text-lg font-semibold">{formatNumber(preview.summary.errorRows, 0)}</div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baris</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>Harga Beli</TableHead>
                      <TableHead>Harga Jual</TableHead>
                      <TableHead>Pesan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow key={`${row.lineNumber}-${row.code}`}>
                        <TableCell>{row.lineNumber}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell>{operationBadge(row.operation)}</TableCell>
                        <TableCell className="font-semibold">{row.code || "-"}</TableCell>
                        <TableCell>{row.name || "-"}</TableCell>
                        <TableCell>{row.categoryCode || "-"}</TableCell>
                        <TableCell>{row.unit || "-"}</TableCell>
                        <TableCell>{formatCurrency(row.purchasePrice)}</TableCell>
                        <TableCell>{formatCurrency(row.sellingPrice)}</TableCell>
                        <TableCell className="max-w-[320px] text-sm text-muted-foreground">
                          {row.messages.length ? row.messages.join(" ") : "Tidak ada masalah."}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {preview.rows.length > previewRows.length ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Menampilkan {previewRows.length} dari {preview.rows.length} baris hasil preview.
                </p>
              ) : null}
            </>
          )}
        </SectionCard>
      ) : null}

      {applyResult ? (
        <SectionCard
          title="Hasil Import"
          description="Ringkasan proses import setelah data dijalankan ke master produk."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Baris</div>
              <div className="mt-2 text-lg font-semibold">{applyResult.summary.totalRows}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Produk Baru</div>
              <div className="mt-2 text-lg font-semibold">{applyResult.summary.createdRows}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Produk Diupdate</div>
              <div className="mt-2 text-lg font-semibold">{applyResult.summary.updatedRows}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dilewati</div>
              <div className="mt-2 text-lg font-semibold">{applyResult.summary.skippedRows}</div>
            </div>
            <div className="rounded-2xl border bg-destructive/5 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Error</div>
              <div className="mt-2 text-lg font-semibold">{applyResult.summary.errorRows}</div>
            </div>
          </div>

          {applyResult.errors.length ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Masalah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applyResult.errors.map((error) => (
                    <TableRow key={`${error.lineNumber}-${error.code}`}>
                      <TableCell>{error.lineNumber}</TableCell>
                      <TableCell className="font-semibold">{error.code || "-"}</TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/master/products">Kembali ke Daftar Produk</Link>
            </Button>
            <Button asChild>
              <Link href="/master/products/new">Tambah Produk Manual</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
