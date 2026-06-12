import { connection } from "next/server";
import { redirect } from "next/navigation";

import { TrialAdminActions } from "@/components/platform/trial-admin-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth/session";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  listPlatformAdminEvents,
  listPlatformSupportClicks,
  listPlatformTrials,
} from "@/services/platform-service";

function resolveStatusVariant(status: string | null) {
  switch (status) {
    case "ready":
    case "sent":
    case "converted":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    case "queued":
    case "provisioning":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function formatBillingCycleLabel(value: string | null) {
  switch (value) {
    case "monthly":
      return "Bulanan";
    case "quarterly":
      return "Kuartalan";
    case "semiannual":
      return "Semesteran";
    case "annual":
      return "Tahunan";
    case "custom":
      return "Custom";
    default:
      return "-";
  }
}

function formatAdminActionLabel(value: string) {
  switch (value) {
    case "convert_to_paid":
      return "Convert ke Paid";
    case "resend_trial_ready_notification":
      return "Resend Trial Ready";
    default:
      return value;
  }
}

function formatSupportSourceLabel(value: string) {
  switch (value) {
    case "landing-inline":
      return "Landing Inline";
    case "landing-float":
      return "Landing Float";
    case "tenant-login":
      return "Login Tenant";
    case "app-shell":
      return "Floating In-App";
    case "dashboard-help-card":
      return "Dashboard Help";
    case "trial-result":
      return "Trial Result";
    default:
      return value;
  }
}

export default async function PlatformTrialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "owner") {
    redirect("/dashboard");
  }

  const tenantContext = await resolveTenantContextFromRequest();
  if (tenantContext.kind === "tenant") {
    return (
      <EmptyState
        title="Panel platform hanya tersedia di console utama"
        description="Buka halaman ini dari base domain utama Besawit untuk melihat trial, provisioning, dan conversion customer."
      />
    );
  }

  const filters = await searchParams;
  const q = typeof filters.q === "string" ? filters.q : "";
  const status = typeof filters.status === "string" ? filters.status : "all";
  const instanceType = typeof filters.instanceType === "string" ? filters.instanceType : "all";

  const [{ items, summary }, adminEvents, supportClicks] = await Promise.all([
    listPlatformTrials({
      q,
      status,
      instanceType,
    }),
    listPlatformAdminEvents(),
    listPlatformSupportClicks(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Trial & Provisioning"
        description="Pantau trial yang masuk, status provisioning database, hasil notifikasi otomatis, dan ubah instance trial menjadi paid tanpa memindahkan data."
      />
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href="/platform/smtp">Buka SMTP Platform</a>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Instance</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.ready}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.trial}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.paid}</CardContent>
        </Card>
      </section>

      <FilterBar
        left={
          <form className="grid w-full gap-3 md:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
            <Input defaultValue={q} name="q" placeholder="Cari company, subdomain, email, atau nomor WhatsApp..." />
            <Select defaultValue={status} name="status">
              <option value="all">Semua Status</option>
              <option value="queued">Queued</option>
              <option value="provisioning">Provisioning</option>
              <option value="ready">Ready</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </Select>
            <Select defaultValue={instanceType} name="instanceType">
              <option value="all">Semua Tipe</option>
              <option value="trial">Trial</option>
              <option value="paid">Paid</option>
            </Select>
            <Button type="submit">Filter</Button>
          </form>
        }
      />

      {items.length ? (
        <Card className="overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Instance</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notifikasi</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.instanceId}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{item.companyName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        PIC: {item.fullName ?? "-"}{item.city ? ` • ${item.city}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{item.subdomain}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        DB: {item.databaseName ?? "-"}
                      </div>
                      <div className="mt-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={item.loginUrl} rel="noreferrer" target="_blank">
                            Buka Instance
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{item.adminEmail ?? item.email ?? "-"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.phone ?? "-"}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Setup: {item.trialSetupStatus ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={resolveStatusVariant(item.instanceStatus)}>
                          {item.instanceStatus}
                        </Badge>
                        <Badge variant="neutral">{item.instanceType}</Badge>
                        {item.requestStatus ? (
                          <Badge variant={resolveStatusVariant(item.requestStatus)}>
                            request {item.requestStatus}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.latestNotificationStatus ? (
                        <>
                          <Badge variant={resolveStatusVariant(item.latestNotificationStatus)}>
                            {item.latestNotificationStatus}
                          </Badge>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {item.latestNotificationSentAt
                              ? `Sent ${formatDateTime(item.latestNotificationSentAt)}`
                              : item.latestNotificationError ?? "Belum ada pengiriman sukses."}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">Belum ada log notifikasi.</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(item.trialStartsAt)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Berakhir {formatDate(item.trialEndsAt)}
                      </div>
                      {item.activatedAt ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Aktivasi {formatDateTime(item.activatedAt)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {item.instanceType === "paid" ? (
                        <>
                          <div className="font-medium text-foreground">
                            {item.billingPlanName ?? "Paid plan belum diberi nama"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatBillingCycleLabel(item.billingCycle)}
                            {item.billingAmount
                              ? ` | ${formatCurrency(item.billingAmount, item.billingCurrency)}`
                              : ""}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Aktif sampai {formatDate(item.billingPaidUntil)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Converted {formatDateTime(item.billingConvertedAt)}
                            {item.billingConvertedByName
                              ? ` by ${item.billingConvertedByName}`
                              : ""}
                          </div>
                          {item.billingSalesNotes ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {item.billingSalesNotes}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Belum dikonversi ke plan berbayar.
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <TrialAdminActions
                          canConvert={item.instanceType !== "paid"}
                          companyName={item.companyName}
                          instanceId={item.instanceId}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Belum ada trial yang cocok dengan filter"
          description="Coba ubah filter atau tunggu request trial baru masuk dari landing page publik."
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Admin Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {adminEvents.length ? (
            adminEvents.map((event) => {
              const payload =
                event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
                  ? (event.payload as Record<string, unknown>)
                  : null;
              const payloadEntries = payload
                ? Object.entries(payload).filter(([, value]) => value !== null && value !== "")
                : [];

              return (
                <div
                  key={event.id}
                  className="rounded-xl border bg-card/60 p-4 text-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {formatAdminActionLabel(event.action)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {event.companyName ?? "Instance tidak ditemukan"}
                        {event.subdomain ? ` | ${event.subdomain}` : ""}
                      </div>
                    </div>
                    <Badge variant="neutral">{formatDateTime(event.createdAt)}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Oleh {event.actorName} ({event.actorEmail})
                  </div>
                  {payloadEntries.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {payloadEntries.map(([key, value]) => (
                        <Badge key={`${event.id}-${key}`} variant="neutral">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              Belum ada aksi admin yang tercatat.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Klik WhatsApp Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card/60 p-4">
              <div className="text-sm text-muted-foreground">Total Klik Tercatat</div>
              <div className="mt-2 text-3xl font-semibold">{supportClicks.summary.total}</div>
            </div>
            <div className="rounded-xl border bg-card/60 p-4">
              <div className="text-sm text-muted-foreground">Dari Tenant</div>
              <div className="mt-2 text-3xl font-semibold">{supportClicks.summary.tenant}</div>
            </div>
            <div className="rounded-xl border bg-card/60 p-4">
              <div className="text-sm text-muted-foreground">Dari Base Domain</div>
              <div className="mt-2 text-3xl font-semibold">{supportClicks.summary.baseDomain}</div>
            </div>
          </div>

          {supportClicks.summary.topSources.length ? (
            <div className="flex flex-wrap gap-2">
              {supportClicks.summary.topSources.map((item) => (
                <Badge key={item.source} variant="neutral">
                  {formatSupportSourceLabel(item.source)}: {item.count}
                </Badge>
              ))}
            </div>
          ) : null}

          {supportClicks.items.length ? (
            <div className="space-y-3">
              {supportClicks.items.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border bg-card/60 p-4 text-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {event.companyName ?? "Base Domain"}{" "}
                        {event.subdomain ? `| ${event.subdomain}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatSupportSourceLabel(event.source)}
                        {event.pathname ? ` | ${event.pathname}` : ""}
                        {event.host ? ` | ${event.host}` : ""}
                      </div>
                    </div>
                    <Badge variant="neutral">{formatDateTime(event.createdAt)}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Oleh {event.actorName} ({event.actorEmail})
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.label ? <Badge variant="neutral">Label: {event.label}</Badge> : null}
                    {event.phone ? <Badge variant="neutral">WA: {event.phone}</Badge> : null}
                    {event.instanceType ? (
                      <Badge variant="neutral">Type: {event.instanceType}</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Belum ada klik WhatsApp support yang tercatat.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Panel ini idealnya dibuka dari console utama pada base domain, bukan dari subdomain customer.
        Jika Anda butuh integrasi notifikasi eksternal, arahkan webhook `TRIAL_READY_WEBHOOK_URL`
        ke n8n, Make, atau provider internal Anda.
      </div>
    </div>
  );
}
