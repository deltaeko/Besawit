import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/shared/section-card";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

function InfoField({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          emphasis ? "mt-2 text-lg font-semibold tracking-tight" : "mt-2 text-sm font-semibold"
        }
      >
        {value}
      </div>
    </div>
  );
}

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
      ? "border-primary/20 bg-primary/10"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : "border-border bg-card/90";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
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
      <div className="rounded-2xl border border-border/70 bg-muted/10">
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
      <div className="rounded-2xl border border-border/80 bg-card/85 p-4">
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
            <div className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Status Transaksi
              </div>
              <div className="mt-1.5">
                <Badge variant={resolvePalmStatusBadgeVariant(view.transactionStatus)}>
                  {formatPalmStatusLabel(view.transactionStatus)}
                </Badge>
              </div>
            </div>
            <div className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5">
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
              <div className="rounded-2xl border border-border/70 bg-muted/10">
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
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3">
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
        <div className="rounded-2xl border border-border/70 bg-muted/10">
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
