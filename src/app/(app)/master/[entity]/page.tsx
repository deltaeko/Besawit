import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { masterEntityConfig } from "@/modules/master/config";
import { MasterDataTable } from "@/modules/master/master-data-table";
import { isMasterEntity } from "@/modules/master/helpers";
import { MasterPagination } from "@/modules/master/master-pagination";
import { MasterToolbar } from "@/modules/master/master-toolbar";
import { getMasterList } from "@/services/master-service";

export default async function MasterEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity } = await params;
  if (!isMasterEntity(entity)) notFound();

  const filters = await searchParams;
  const config = masterEntityConfig[entity];
  const result = await getMasterList(entity, {
    q: typeof filters.q === "string" ? filters.q : "",
    status: typeof filters.status === "string" ? (filters.status as never) : "all",
    sort: typeof filters.sort === "string" ? (filters.sort as never) : "latest",
    page: typeof filters.page === "string" ? Number(filters.page) : 1,
    pageSize: typeof filters.pageSize === "string" ? Number(filters.pageSize) : 10,
  }).catch(() => ({
    items: [],
    meta: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
      q: "",
      status: "all",
      sort: "latest",
    },
  }));

  const rows = result.items.map((item) => {
    const row = item as Record<string, unknown>;

    if (entity === "farmers") {
      return {
        ...row,
        location: {
          village: row.village as string | null | undefined,
          districtOrCity: row.districtOrCity as string | null | undefined,
        },
      };
    }

    if (entity === "transport-personnel") {
      const role = String(row.role ?? "");
      const roleLabel =
        role === "driver" ? "Sopir" : role === "co_driver" ? "Kernet" : role === "helper" ? "Helper" : "-";
      const primaryVehicleLabel =
        [row.primaryVehiclePlateNumber, row.primaryVehicleCode].filter(Boolean).join(" • ") || "-";

      return {
        ...row,
        roleLabel,
        primaryVehicleLabel,
      };
    }

    return row;
  });

  const query = new URLSearchParams();
  query.set("q", result.meta.q);
  query.set("status", result.meta.status);
  query.set("sort", result.meta.sort);
  query.set("pageSize", String(result.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data"
        title={config.title}
        description={config.description}
        action={
          entity === "products" ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/master/products/import">Import Produk</Link>
              </Button>
              <Button asChild>
                <Link href={`/master/${entity}/new`}>{config.createLabel}</Link>
              </Button>
            </div>
          ) : entity === "farmers" ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/master/farmers/import">Import Petani</Link>
              </Button>
              <Button asChild>
                <Link href={`/master/${entity}/new`}>{config.createLabel}</Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href={`/master/${entity}/new`}>{config.createLabel}</Link>
            </Button>
          )
        }
      />

      {entity === "transport-personnel" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Master Tunggal</div>
            <div className="mt-2 text-sm font-semibold">Menggantikan master sopir terpisah</div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dipakai Transaksi</div>
            <div className="mt-2 text-sm font-semibold">Peran Sopir otomatis muncul di pembelian TBS</div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Siap Operasional</div>
            <div className="mt-2 text-sm font-semibold">Sopir, kernet, dan helper dalam satu master</div>
          </div>
        </div>
      ) : null}

      <MasterToolbar
        q={result.meta.q}
        searchPlaceholder={config.searchablePlaceholder}
        showStatusFilter={config.supportsStatusToggle}
        sort={result.meta.sort}
        status={result.meta.status}
      />

      {rows.length ? (
        <>
          <MasterDataTable config={config} entity={entity} rows={rows as never[]} />
          <MasterPagination
            basePath={`/master/${entity}`}
            page={result.meta.page}
            query={query}
            totalPages={result.meta.totalPages}
          />
        </>
      ) : (
        <EmptyState
          title={`Belum ada data ${config.title.toLowerCase()}`}
          description="Gunakan tombol tambah untuk membuat data master baru."
        />
      )}
    </div>
  );
}
