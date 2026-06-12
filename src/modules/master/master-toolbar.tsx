import { Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function MasterToolbar({
  searchPlaceholder,
  q,
  status,
  sort,
  showStatusFilter = true,
}: {
  searchPlaceholder: string;
  q: string;
  status: string;
  sort: string;
  showStatusFilter?: boolean;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-[1.35rem] border border-white/85 bg-card/94 p-4 shadow-[0_16px_38px_-30px_rgba(20,37,24,0.22)] lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          defaultValue={q}
          name="q"
          placeholder={searchPlaceholder}
        />
      </div>
      {showStatusFilter ? (
        <Select className="w-full lg:w-44" defaultValue={status} name="status">
          <option value="all">Semua</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </Select>
      ) : null}
      <Select className="w-full lg:w-44" defaultValue={sort} name="sort">
        <option value="latest">Terbaru</option>
        <option value="oldest">Terlama</option>
        <option value="code_asc">Kode A-Z</option>
        <option value="name_asc">Nama A-Z</option>
      </Select>
      <Button type="submit">Terapkan</Button>
      <Button disabled type="button" variant="outline">
        <Download className="size-4" />
        Export
      </Button>
    </form>
  );
}
