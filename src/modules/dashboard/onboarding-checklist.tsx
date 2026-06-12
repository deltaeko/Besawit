import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardOnboardingItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  helper: string;
};

export function DashboardOnboardingChecklist({
  items,
}: {
  items: DashboardOnboardingItem[];
}) {
  if (!items.length) {
    return null;
  }

  const completedCount = items.filter((item) => item.completed).length;
  const remainingCount = items.length - completedCount;
  const progressPercentage = Math.round((completedCount / items.length) * 100);
  const allCompleted = remainingCount === 0;

  return (
    <Card className="overflow-hidden border-[#d9e8d3] bg-[linear-gradient(180deg,rgba(248,252,246,0.96)_0%,rgba(241,247,239,0.98)_100%)]">
      <CardHeader className="border-b border-[#dbe7d6]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary/75">
              User Onboarding
            </div>
            <CardTitle className="mt-2 text-xl tracking-tight">
              {allCompleted ? "Setup awal sudah lengkap" : "Checklist setup awal tenant"}
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl leading-6">
              {allCompleted
                ? "Tenant ini sudah punya data inti dan setidaknya satu transaksi awal. User baru bisa langsung lanjut ke operasional."
                : "Bantu user baru cepat paham Besawit dengan menuntaskan data inti dan satu alur transaksi pertama."}
            </CardDescription>
          </div>
          <Badge className="border border-primary/15 bg-white/80 text-primary" variant="neutral">
            {completedCount}/{items.length} selesai
          </Badge>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-[#dfe9db]">
            <div
              className="h-full rounded-full bg-[#2f5c39] transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {allCompleted
              ? "Semua langkah onboarding awal sudah terpenuhi."
              : `${remainingCount} langkah lagi supaya user trial atau tenant baru langsung siap pakai.`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            className={cn(
              "flex h-full flex-col rounded-[1.35rem] border p-4 shadow-sm transition-colors",
              item.completed
                ? "border-emerald-200 bg-emerald-50/75"
                : "border-white/80 bg-white/90",
            )}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
              {item.completed ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <CircleDashed className="mt-0.5 size-5 shrink-0 text-primary/70" />
              )}
            </div>
            <div className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {item.completed ? "Selesai" : "Prioritas berikutnya"}
            </div>
            <div className="mt-1 text-sm text-foreground/85">{item.helper}</div>
            <div className="mt-auto pt-4">
              <Button asChild className="w-full justify-between" variant={item.completed ? "outline" : "default"}>
                <Link href={item.href}>
                  {item.completed ? "Lihat Data" : "Buka dan Lanjutkan"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
