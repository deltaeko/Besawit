import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { AuditLogPanel } from "@/components/shared/audit-log-panel";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appPermissionDefinitions, getEffectivePermissions } from "@/lib/auth/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { masterEntityConfig } from "@/modules/master/config";
import { isMasterEntity } from "@/modules/master/helpers";
import { MasterDetailPanel } from "@/modules/master/master-detail-panel";
import { StatusToggleButton } from "@/modules/master/status-toggle-button";
import { SectionCard } from "@/components/shared/section-card";
import { getAuditLogsByEntity } from "@/services/audit-service";
import { getFactoryReceivableStatement, getFarmerPayableStatement } from "@/services/finance-service";
import { getMasterDetail, getProductPriceHistoryList } from "@/services/master-service";

export default async function MasterDetailPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isMasterEntity(entity)) notFound();

  const config = masterEntityConfig[entity];
  const record = await getMasterDetail(entity, id);

  if (!record) notFound();
  const baseRecordView = record as Record<string, unknown>;
  const effectiveRolePermissions =
    entity === "roles"
      ? getEffectivePermissions(
          String(baseRecordView.code ?? ""),
          baseRecordView.permissions as Record<string, boolean> | undefined,
        )
      : undefined;
  const recordView =
    entity === "transport-personnel"
      ? {
          ...baseRecordView,
          roleLabel:
            baseRecordView.role === "driver"
              ? "Sopir"
              : baseRecordView.role === "co_driver"
                ? "Kernet"
                : baseRecordView.role === "helper"
                  ? "Helper"
                  : "-",
          primaryVehicleLabel:
            [baseRecordView.primaryVehiclePlateNumber, baseRecordView.primaryVehicleCode]
              .filter(Boolean)
              .join(" - ") || "-",
        }
      : entity === "roles"
        ? {
            ...baseRecordView,
            permissions: effectiveRolePermissions,
          }
        : baseRecordView;
  const titleValue = String(recordView.name ?? recordView.fullName ?? recordView.code ?? "").trim();
  const rolePermissions = entity === "roles" ? effectiveRolePermissions ?? {} : {};
  const permissionGroups =
    entity === "roles"
      ? appPermissionDefinitions.reduce<Record<string, Array<(typeof appPermissionDefinitions)[number]>>>(
          (acc, item) => {
            if (!rolePermissions[item.key]) return acc;
            acc[item.group] = [...(acc[item.group] ?? []), item];
            return acc;
          },
          {},
        )
      : {};
  const farmerStatement =
    entity === "farmers" ? await getFarmerPayableStatement(id).catch(() => null) : null;
  const factoryStatement =
    entity === "factories" ? await getFactoryReceivableStatement(id).catch(() => null) : null;
  const productPriceHistories =
    entity === "products" ? await getProductPriceHistoryList(id).catch(() => []) : [];
  const auditLogs = await getAuditLogsByEntity(entity, id, 20).catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data"
        title={`${config.singular} ${titleValue}`.trim()}
        description={config.description}
        action={
          <div className="flex flex-wrap gap-3">
            {entity === "farmers" ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/master/farmers/${id}/statement`}>Preview Statement</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reports/store-debt-offsets">Laporan Potong Hasil</Link>
                </Button>
              </>
            ) : null}
            {entity === "factories" ? (
              <Button asChild variant="outline">
                <Link href={`/master/factories/${id}/statement`}>Preview Statement</Link>
              </Button>
            ) : null}
            {entity === "products" ? (
              <Button asChild>
                <Link href={`/master/products/${id}/prices`}>Kelola Harga</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/master/${entity}/${id}/edit`}>Edit</Link>
            </Button>
            {config.supportsStatusToggle ? (
              <StatusToggleButton
                apiPath={
                  entity === "farmers"
                    ? `/api/farmers/${id}/status`
                    : `/api/master/${entity}/${id}/status`
                }
                isActive={Boolean(recordView.isActive)}
              />
            ) : null}
          </div>
        }
      />

      <MasterDetailPanel config={config} record={recordView} />

      {entity === "roles" ? (
        <SectionCard
          title="Ringkasan Hak Akses"
          description="Jumlah halaman dan aksi sensitif yang bisa diakses oleh role ini beserta pembagian grup utamanya."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-2xl border bg-primary/10 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Akses Aktif</div>
              <div className="mt-2 text-3xl font-semibold">{Object.keys(rolePermissions).length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              {Object.keys(permissionGroups).length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(permissionGroups).map(([group, items]) => (
                    <div className="rounded-xl border border-border/70 bg-background px-3 py-2.5" key={group}>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{group}</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">{items.length} akses aktif</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Belum ada hak akses yang dipilih.</div>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {entity === "transport-personnel" ? (
        <SectionCard
          title="Peran Operasional"
          description="Master ini sekarang menjadi sumber tunggal personel armada untuk pembelian TBS dan modul trip."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Peran Aktif</div>
              <div className="mt-2">
                <Badge
                  variant={
                    recordView.roleLabel === "Sopir"
                      ? "success"
                      : recordView.roleLabel === "Kernet"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {String(recordView.roleLabel ?? "-")}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pemakaian Saat Ini</div>
              <div className="mt-2 text-sm font-semibold">
                {recordView.role === "driver" ? "Muncul di transaksi pembelian TBS" : "Disiapkan untuk trip dan surat jalan"}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
              {recordView.role === "driver"
                ? "Data sopir di halaman ini sudah menggantikan master sopir lama. Saat admin memilih sopir pada transaksi pembelian TBS, daftar yang muncul berasal dari Personel Armada dengan peran Sopir."
                : "Personel dengan peran kernet atau helper tidak muncul di field Sopir pada pembelian TBS, tetapi tetap disiapkan untuk assignment trip dan surat jalan."}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {entity === "products" ? (
        <SectionCard
          title="Harga Aktif Produk"
          description="Gunakan blok ini untuk melihat harga yang sedang berlaku dan langsung masuk ke halaman kelola harga."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga Beli Aktif</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(Number(recordView.purchasePrice ?? 0))}</div>
            </div>
            <div className="rounded-2xl border bg-primary/10 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga Jual Aktif</div>
              <div className="mt-2 text-3xl font-semibold">{formatCurrency(Number(recordView.sellingPrice ?? 0))}</div>
            </div>
            <div className="flex items-center xl:justify-end">
              <Button asChild className="w-full xl:w-auto">
                <Link href={`/master/products/${id}/prices`}>Kelola Harga Aktif</Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <AuditLogPanel items={auditLogs} />

      {entity === "farmers" && farmerStatement ? (
        <>
          <SectionCard
            title="Ringkasan Hutang Petani"
            description="Posisi hutang TBS, pembayaran, dan outstanding saat ini."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Transaksi</div>
                <div className="mt-2 text-lg font-semibold">{farmerStatement.summary.transactionCount}</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Hutang</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(farmerStatement.summary.totalAmount)}</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Dibayar</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(farmerStatement.summary.totalPaid)}</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Potong Hutang Toko</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(farmerStatement.summary.totalStoreOffset)}</div>
              </div>
              <div className="rounded-2xl border bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sisa Hutang</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(farmerStatement.summary.totalOutstanding)}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Riwayat Hutang Per Transaksi"
            description="Data ini bisa dipakai sebagai dasar statement sisa hutang petani."
          >
            <SimpleTable
              columnLabels={{
                sourceCode: "Kode Pembelian",
                createdAt: "Tanggal",
                amount: "Total Hutang",
                paidAmount: "Sudah Dibayar",
                outstandingAmount: "Sisa Hutang",
                status: "Status",
              }}
              columns={["sourceCode", "createdAt", "amount", "paidAmount", "outstandingAmount", "status"]}
              getHref={(row) => `/finance/payables/${row.id}`}
              linkColumn="sourceCode"
              rows={farmerStatement.payables.map((item) => ({
                id: item.id,
                sourceCode: item.sourceCode ?? item.code,
                createdAt: formatDateTime(item.sourceDate ?? item.createdAt),
                amount: Number(item.amount),
                paidAmount: Number(item.paidAmount),
                outstandingAmount: Number(item.outstandingAmount),
                status: item.status,
              }))}
            />
          </SectionCard>

          <SectionCard
            title="Riwayat Hutang Toko"
            description="Piutang toko yang tertaut ke petani ini melalui pelanggan toko."
          >
            <SimpleTable
              columnLabels={{
                sourceCode: "Referensi Toko",
                createdAt: "Tanggal",
                customerName: "Pelanggan Toko",
                amount: "Total Piutang",
                paidAmount: "Sudah Dibayar",
                outstandingAmount: "Sisa Hutang",
                status: "Status",
              }}
              columns={["sourceCode", "createdAt", "customerName", "amount", "paidAmount", "outstandingAmount", "status"]}
              getHref={(row) => `/finance/receivables/${row.id}`}
              linkColumn="sourceCode"
              rows={farmerStatement.storeReceivables.map((item) => ({
                id: item.id,
                sourceCode: item.sourceCode ?? item.code,
                createdAt: formatDateTime(item.sourceDate ?? item.createdAt),
                customerName: item.customerName ?? "-",
                amount: Number(item.amount),
                paidAmount: Number(item.paidAmount),
                outstandingAmount: Number(item.outstandingAmount),
                status: item.status,
              }))}
            />
          </SectionCard>

          <SectionCard
            title="Histori Potong Hutang Toko"
            description="Potongan hasil panen yang dipakai untuk menutup piutang toko petani."
          >
            <SimpleTable
              columnLabels={{
                purchaseCode: "Kode Pembelian",
                purchaseDate: "Tanggal",
                receivableCode: "Kode Piutang",
                customerName: "Pelanggan Toko",
                sourceCode: "Referensi Toko",
                itemAppliedAmount: "Nilai Potong",
              }}
              columns={["purchaseCode", "purchaseDate", "receivableCode", "customerName", "sourceCode", "itemAppliedAmount"]}
              getHref={(row) => `/palm/purchases/${row.purchaseId}`}
              linkColumn="purchaseCode"
              rows={farmerStatement.storeOffsets.map((item) => ({
                id: item.id,
                purchaseId: item.purchaseId,
                purchaseCode: item.purchaseCode ?? "-",
                purchaseDate: formatDateTime(item.purchaseDate ?? item.createdAt),
                receivableCode: item.receivableCode ?? "-",
                customerName: item.customerName ?? "-",
                sourceCode: item.sourceCode ?? "-",
                itemAppliedAmount: Number(item.itemAppliedAmount ?? 0),
              }))}
            />
          </SectionCard>

          <SectionCard
            title="Histori Pembayaran Petani"
            description="Pembayaran parsial dan pelunasan yang sudah tercatat untuk petani ini."
          >
            <SimpleTable
              columnLabels={{
                code: "Kode Payment",
                paymentDate: "Tanggal",
                payableCode: "Kode Hutang",
                purchaseCode: "Kode Pembelian",
                amount: "Nominal",
                ledgerCategory: "Kas/Bank",
              }}
              columns={["code", "paymentDate", "payableCode", "purchaseCode", "amount", "ledgerCategory"]}
              getHref={(row) => `/print/payments/${row.id}/receipt`}
              linkColumn="code"
              rows={farmerStatement.payments.map((item) => ({
                id: item.id,
                code: item.code,
                paymentDate: formatDateTime(item.paymentDate),
                payableCode: item.payableCode ?? "-",
                purchaseCode: item.purchaseCode ?? "-",
                amount: Number(item.amount),
                ledgerCategory: item.ledgerCategory ?? "-",
              }))}
            />
          </SectionCard>
        </>
      ) : null}

      {entity === "factories" && factoryStatement ? (
        <>
          <SectionCard
            title="Ringkasan Piutang Pabrik"
            description="Posisi piutang penjualan TBS, penerimaan, dan outstanding saat ini."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Transaksi</div>
                <div className="mt-2 text-lg font-semibold">{factoryStatement.summary.transactionCount}</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Piutang</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(factoryStatement.summary.totalAmount)}</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Diterima</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(factoryStatement.summary.totalPaid)}</div>
              </div>
              <div className="rounded-2xl border bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sisa Piutang</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(factoryStatement.summary.totalOutstanding)}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Riwayat Piutang Per Transaksi"
            description="Data ini bisa dipakai sebagai dasar statement piutang pabrik."
          >
            <SimpleTable
              columnLabels={{
                sourceCode: "Kode Penjualan",
                createdAt: "Tanggal",
                amount: "Total Piutang",
                paidAmount: "Sudah Diterima",
                outstandingAmount: "Sisa Piutang",
                status: "Status",
              }}
              columns={["sourceCode", "createdAt", "amount", "paidAmount", "outstandingAmount", "status"]}
              getHref={(row) => `/finance/receivables/${row.id}`}
              linkColumn="sourceCode"
              rows={factoryStatement.receivables.map((item) => ({
                id: item.id,
                sourceCode: item.sourceCode ?? item.code,
                createdAt: formatDateTime(item.sourceDate ?? item.createdAt),
                amount: Number(item.amount),
                paidAmount: Number(item.paidAmount),
                outstandingAmount: Number(item.outstandingAmount),
                status: item.status,
              }))}
            />
          </SectionCard>

          <SectionCard
            title="Histori Penerimaan Pabrik"
            description="Penerimaan parsial dan pelunasan yang sudah tercatat untuk pabrik ini."
          >
            <SimpleTable
              columnLabels={{
                code: "Kode Payment",
                paymentDate: "Tanggal",
                receivableCode: "Kode Piutang",
                saleCode: "Kode Penjualan",
                amount: "Nominal",
                ledgerCategory: "Kas/Bank",
              }}
              columns={["code", "paymentDate", "receivableCode", "saleCode", "amount", "ledgerCategory"]}
              getHref={(row) => `/print/payments/${row.id}/receipt`}
              linkColumn="code"
              rows={factoryStatement.payments.map((item) => ({
                id: item.id,
                code: item.code,
                paymentDate: formatDateTime(item.paymentDate),
                receivableCode: item.receivableCode ?? "-",
                saleCode: item.saleCode ?? "-",
                amount: Number(item.amount),
                ledgerCategory: item.ledgerCategory ?? "-",
              }))}
            />
          </SectionCard>
        </>
      ) : null}

      {entity === "products" && productPriceHistories.length ? (
        <SectionCard
          title="Histori Harga Produk"
          description="Setiap perubahan harga beli dan harga jual disimpan sebagai histori dengan tanggal berlaku."
        >
          <SimpleTable
            columnLabels={{
              effectiveFrom: "Berlaku Mulai",
              purchasePrice: "Harga Beli",
              sellingPrice: "Harga Jual",
              notes: "Catatan",
              createdByName: "Diubah Oleh",
            }}
            columns={["effectiveFrom", "purchasePrice", "sellingPrice", "notes", "createdByName"]}
            rows={productPriceHistories.map((item) => ({
              id: item.id,
              effectiveFrom: formatDateTime(item.effectiveFrom),
              purchasePrice: Number(item.purchasePrice),
              sellingPrice: Number(item.sellingPrice),
              notes: item.notes?.trim() || "-",
              createdByName: item.createdByName ?? "Sistem",
            }))}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}

