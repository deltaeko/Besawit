import Link from "next/link";

import { Button } from "@/components/ui/button";

export function MasterPagination({
  basePath,
  page,
  totalPages,
  query,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  query: URLSearchParams;
}) {
  const previousParams = new URLSearchParams(query);
  previousParams.set("page", String(Math.max(page - 1, 1)));

  const nextParams = new URLSearchParams(query);
  nextParams.set("page", String(Math.min(page + 1, totalPages)));

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card/90 px-4 py-3 text-sm">
      <div className="text-muted-foreground">
        Halaman {page} dari {totalPages}
      </div>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button disabled variant="outline">
            Sebelumnya
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`${basePath}?${previousParams.toString()}`}>Sebelumnya</Link>
          </Button>
        )}
        {page >= totalPages ? (
          <Button disabled variant="outline">
            Berikutnya
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`${basePath}?${nextParams.toString()}`}>Berikutnya</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
