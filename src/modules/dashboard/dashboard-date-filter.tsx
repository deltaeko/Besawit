import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardDateFilter({ selectedDate }: { selectedDate: string }) {
  return (
    <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="h-10 min-w-[180px] bg-background"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" type="submit">
            Terapkan
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Hari Ini</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
