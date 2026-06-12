import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { EntityActionMenu } from "@/modules/master/entity-action-menu";
import type { MasterEntityConfig } from "@/modules/master/types";

type MasterRow = Record<string, unknown> & {
  id: string;
  isActive?: boolean;
};

function formatCellValue(key: string, value: unknown) {
  const normalizedKey = key.toLowerCase();
  const isDateTimeField =
    normalizedKey.includes("createdat") ||
    normalizedKey.includes("updatedat") ||
    normalizedKey.includes("date");

  if (key === "location" && typeof value === "object" && value) {
    const location = value as { village?: string | null; districtOrCity?: string | null };
    return [location.village, location.districtOrCity].filter(Boolean).join(" / ") || "-";
  }

  if (typeof value === "boolean") {
    return value ? "Ya" : "Tidak";
  }

  if (
    normalizedKey.includes("price") ||
    normalizedKey.includes("amount") ||
    normalizedKey.includes("outstanding")
  ) {
    return formatCurrency(Number(value ?? 0));
  }

  if (value instanceof Date) {
    return isDateTimeField ? formatDateTime(value) : formatDate(value);
  }

  if (typeof value === "string" && isDateTimeField) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return formatDateTime(parsedDate);
    }
  }

  if (typeof value === "string" && value.includes("T")) {
    return formatDate(value);
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

function renderRoleBadge(value: unknown) {
  const role = String(value ?? "-");
  const variant =
    role === "Sopir" ? "success" : role === "Kernet" ? "warning" : "neutral";

  return <Badge variant={variant}>{role}</Badge>;
}

function renderCustomerLink(value: unknown) {
  const name = String(value ?? "-");
  if (!name || name === "-") {
    return <Badge variant="neutral">Belum Terhubung</Badge>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm font-medium">{name}</div>
      <Badge variant="success">Terhubung ke Petani</Badge>
    </div>
  );
}

function renderPermissionCount(value: unknown) {
  const count = Number(value ?? 0);
  return <Badge variant={count > 0 ? "success" : "neutral"}>{count} menu</Badge>;
}

export function MasterDataTable({
  entity,
  config,
  rows,
}: {
  entity: string;
  config: MasterEntityConfig;
  rows: MasterRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/85 bg-card/95 shadow-[0_18px_50px_-34px_rgba(20,37,24,0.22)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.listColumns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {config.listColumns.map((column) => (
                    <TableCell className="text-[15px]" key={`${row.id}-${column.key}`}>
                      {column.type === "status" ? (
                        <StatusBadge status={row.isActive ? "active" : "cancelled"} />
                      ) : entity === "roles" && column.key === "permissionCount" ? (
                        renderPermissionCount(row[column.key])
                      ) : column.key === "roleLabel" ? (
                        renderRoleBadge(row[column.key])
                      ) : entity === "customers" && column.key === "farmerName" ? (
                        renderCustomerLink(row[column.key])
                      ) : (
                        formatCellValue(column.key, row[column.key])
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="w-[88px]">
                    <EntityActionMenu
                      editHref={`/master/${entity}/${row.id}/edit`}
                      extraHref={entity === "products" ? `/master/products/${row.id}/prices` : undefined}
                      extraLabel={entity === "products" ? "Harga" : undefined}
                      viewHref={`/master/${entity}/${row.id}`}
                      statusApiPath={
                        entity === "farmers"
                          ? `/api/farmers/${row.id}/status`
                          : `/api/master/${entity}/${row.id}/status`
                      }
                      isActive={Boolean(row.isActive)}
                      supportsStatusToggle={config.supportsStatusToggle}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="py-12 text-center text-muted-foreground" colSpan={config.listColumns.length + 1}>
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
