import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPermissionLabel } from "@/lib/auth/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { MasterEntityConfig } from "@/modules/master/types";

function formatFieldLabel(field: string) {
  const labels: Record<string, string> = {
    farmerName: "Petani Terkait",
    farmerCode: "Kode Petani Terkait",
    roleLabel: "Peran",
    primaryVehicleLabel: "Kendaraan Utama",
    identityNumber: "No Identitas",
    licenseNumber: "No SIM",
    purchasePrice: "Harga Beli",
    sellingPrice: "Harga Jual",
    minStock: "Stok Minimum",
    allowNegativeStock: "Izinkan Stok Minus",
    outstandingAmount: "Sisa Hutang Petani",
    storeReceivableOutstanding: "Hutang Toko",
    createdAt: "Dibuat Pada",
    updatedAt: "Diperbarui Pada",
  };

  if (labels[field]) {
    return labels[field];
  }

  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderDetailValue(key: string, value: unknown) {
  const normalizedKey = key.toLowerCase();

  if (typeof value === "boolean") {
    if (key === "isActive") {
      return <StatusBadge status={value ? "active" : "cancelled"} />;
    }

    return value ? "Ya" : "Tidak";
  }

  if (key === "permissions" && value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, enabled]) => Boolean(enabled));
    if (!entries.length) return "Belum ada akses menu yang dipilih.";

    return entries.map(([permissionKey]) => formatPermissionLabel(permissionKey)).join(", ");
  }

  if (typeof value === "string" && value.includes("T")) {
    return formatDate(value);
  }

  if (normalizedKey.includes("price")) {
    return formatCurrency(Number(value ?? 0));
  }

  if (normalizedKey.includes("outstanding")) {
    return formatCurrency(Number(value ?? 0));
  }

  if (
    typeof value === "string" &&
    !Number.isNaN(Number(value)) &&
    !["code", "phone", "identitynumber", "licensenumber", "platenumber"].includes(normalizedKey)
  ) {
    return formatNumber(value);
  }

  return String(value ?? "-");
}

export function MasterDetailPanel({
  config,
  record,
}: {
  config: MasterEntityConfig;
  record: Record<string, unknown>;
}) {
  return (
    <SectionCard title={config.detailTitle}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {config.detailFields.map((field) => (
          <div className="rounded-2xl border bg-muted/30 p-4" key={field}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {formatFieldLabel(field)}
            </div>
            <div className="mt-2 text-sm font-semibold">
              {renderDetailValue(field, record[field])}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
