import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/shared/section-card";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

function HighlightMetric({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "primary";
  emphasis?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/20 bg-[linear-gradient(180deg,rgba(72,115,74,0.12),rgba(72,115,74,0.06))]"
      : tone === "warning"
        ? "border-amber-200 bg-[linear-gradient(180deg,rgba(254,243,199,0.7),rgba(255,251,235,0.86))]"
        : "border-border bg-card/90";

  return (
    <div className={`rounded-[1.45rem] border p-4 shadow-[0_18px_46px_-34px_rgba(20,37,24,0.18)] ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          emphasis
            ? "mt-3 text-2xl font-semibold tracking-tight"
            : tone === "primary"
              ? "mt-3 text-xl font-semibold tracking-tight"
              : "mt-3 text-lg font-semibold tracking-tight"
        }
      >
        {value}
      </div>
    </div>
  );
}

function InfoList({
  title,
  fields,
  description,
}: {
  title: string;
  fields: DetailFieldItem[];
  description?: string;
}) {
  return (
    <SectionCard description={description} title={title}>
      <div className="rounded-[1.35rem] border border-border/70 bg-muted/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
        {fields.map((field, index) => (
          <div
            className={`grid gap-2 px-4 py-3 text-sm md:grid-cols-[200px_minmax(0,1fr)] ${
              index === 0 ? "" : "border-t border-border/60"
            }`}
            key={`${title}-${field.label}`}
          >
            <div className="font-medium text-muted-foreground">{field.label}</div>
            <div className={field.emphasis ? "font-semibold text-foreground" : "text-foreground"}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export type DetailFieldItem = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type PalmTransactionDetailViewModel = {
  code: string;
  transactionStatus: string;
  paymentStatus: string;
  stockNotice?: {
    title: string;
    description: string;
    tone?: "default" | "success" | "warning";
  };
  summaryMetrics: Array<{
    label: string;
    value: string;
    tone?: "default" | "warning" | "primary";
    emphasis?: boolean;
  }>;
  sections: Array<{
    title: string;
    description?: string;
    fields: DetailFieldItem[];
    columns?: string;
  }>;
  notes: string;
  auditFields: DetailFieldItem[];
};

export function PalmTransactionDetailView({
  view,
}: {
  view: PalmTransactionDetailViewModel;
}) {
  const informasiUmum =
    view.sections.find((section) => section.title === "Informasi Umum") ?? null;
  const dataTimbangan =
    view.sections.find((section) => section.title === "Data Timbangan") ?? null;
  const nilaiTransaksi =
    view.sections.find((section) => section.title === "Nilai Transaksi") ?? null;
  const statusDanCatatan =
    view.sections.find((section) => section.title === "Status & Catatan") ?? null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[1.8rem] border border-white/90 bg-[radial-gradient(circle_at_top_left,rgba(97,143,96,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,244,0.94))] p-4 shadow-[0_26px_72px_-42px_rgba(20,37,24,0.28)] ring-1 ring-black/[0.02]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Kode Transaksi
            </div>
            <div className="text-base font-semibold tracking-tight text-foreground">
              {view.code}
            </div>
          </div>
            <div className="flex flex-wrap gap-2">
            <div className="rounded-[1.15rem] border border-border/70 bg-card/80 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Status Transaksi
              </div>
              <div className="mt-1.5">
                <Badge variant={resolvePalmStatusBadgeVariant(view.transactionStatus)}>
                  {formatPalmStatusLabel(view.transactionStatus)}
                </Badge>
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-border/70 bg-card/80 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Status Pembayaran
              </div>
              <div className="mt-1.5">
                <Badge variant={resolvePalmStatusBadgeVariant(view.paymentStatus)}>
                  {formatPalmStatusLabel(view.paymentStatus)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {view.stockNotice ? (
        <div
          className={`rounded-[1.35rem] border px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${
            view.stockNotice.tone === "success"
              ? "border-green-200 bg-green-50/70"
              : view.stockNotice.tone === "warning"
                ? "border-amber-200 bg-amber-50/70"
                : "border-border/70 bg-muted/10"
          }`}
        >
          <div className="font-semibold text-foreground">{view.stockNotice.title}</div>
          <div className="mt-1 text-muted-foreground">{view.stockNotice.description}</div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-12">
        {view.summaryMetrics.map((metric) => (
          <div
            className={
              metric.emphasis
                ? "lg:col-span-4"
                : metric.tone === "primary"
                  ? "lg:col-span-4"
                  : "lg:col-span-4"
            }
            key={metric.label}
          >
            <HighlightMetric
              emphasis={metric.emphasis}
              label={metric.label}
              tone={metric.tone}
              value={metric.value}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {informasiUmum ? (
          <InfoList
            title={informasiUmum.title}
            description={informasiUmum.description}
            fields={informasiUmum.fields}
          />
        ) : null}
        {dataTimbangan ? (
          <InfoList
            title={dataTimbangan.title}
            description={dataTimbangan.description}
            fields={dataTimbangan.fields}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          {nilaiTransaksi ? (
            <InfoList
              title={nilaiTransaksi.title}
              description={nilaiTransaksi.description}
              fields={nilaiTransaksi.fields}
            />
          ) : null}
        </div>

        <div className="space-y-6">
          {statusDanCatatan ? (
            <SectionCard
              description={statusDanCatatan.description}
              title={statusDanCatatan.title}
            >
              <div className="rounded-[1.35rem] border border-border/70 bg-muted/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                {statusDanCatatan.fields.map((field, index) => (
                  <div
                    className={`grid gap-2 px-4 py-3 text-sm md:grid-cols-[200px_minmax(0,1fr)] ${
                      index === 0 ? "" : "border-t border-border/60"
                    }`}
                    key={`${statusDanCatatan.title}-${field.label}`}
                  >
                    <div className="font-medium text-muted-foreground">{field.label}</div>
                    <div className="font-semibold text-foreground">{field.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-muted/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Catatan
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {view.notes}
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <SectionCard
        title="Jejak Audit & Metadata"
        description="Informasi pencatatan transaksi, referensi keuangan, dan penelusuran administrasi."
      >
        <div className="rounded-[1.35rem] border border-border/70 bg-muted/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
          {view.auditFields.map((field, index) => (
            <div
              className={`grid gap-2 px-4 py-3 text-sm md:grid-cols-[200px_minmax(0,1fr)] ${
                index === 0 ? "" : "border-t border-border/60"
              }`}
              key={field.label}
            >
              <div className="font-medium text-muted-foreground">{field.label}</div>
              <div className="text-foreground">{field.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
