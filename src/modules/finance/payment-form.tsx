"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { paymentSchema } from "@/lib/validation/finance";
import type { ReactNode } from "react";

type PaymentFormInput = z.input<typeof paymentSchema>;
type PaymentValues = z.output<typeof paymentSchema>;

type PaymentReferenceOption = {
  id: string;
  code: string;
  amount: number;
  outstandingAmount: number;
  status: string;
  partyName?: string;
  sourceCode?: string;
  dueDate?: string | null;
  partyType?: string;
};

type PaymentContext = "payable" | "receivable";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function FieldHint({ children }: { children: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

function ContextButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-border/70 bg-card/70 text-foreground hover:bg-accent",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryField({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-4",
        emphasis && "border-primary/20 bg-primary/10",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-2 font-semibold tracking-tight", emphasis ? "text-2xl" : "text-lg")}>
        {value}
      </div>
    </div>
  );
}

function getMethodLabel(method: PaymentValues["method"]) {
  const labels: Record<PaymentValues["method"], string> = {
    cash: "Tunai",
    bank_transfer: "Transfer Bank",
    giro: "Giro",
    other: "Lainnya",
  };

  return labels[method];
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: "Belum Dibayar",
    partial: "Sebagian",
    paid: "Lunas",
    overdue: "Jatuh Tempo",
    cancelled: "Dibatalkan",
  };

  return labels[status] ?? status;
}

function getPartyTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    farmer: "Petani",
    supplier: "Supplier",
    factory: "Pabrik",
    customer: "Pelanggan",
    other: "Lainnya",
  };

  return type ? labels[type] ?? type : "-";
}

function getLedgerLabel(method: PaymentValues["method"]) {
  return method === "cash" ? "Kas" : "Bank";
}

export function PaymentForm({
  payables,
  receivables,
  initialValues,
}: {
  payables: PaymentReferenceOption[];
  receivables: PaymentReferenceOption[];
  initialValues?: Partial<PaymentFormInput>;
}) {
  const initialContext: PaymentContext = initialValues?.receivableId ? "receivable" : "payable";
  const [context, setContext] = useState<PaymentContext>(initialContext);
  const [submitting, setSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<"save" | "print">("save");
  const router = useRouter();

  const form = useForm<PaymentFormInput, unknown, PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: initialValues?.paymentDate ?? new Date().toISOString().slice(0, 10),
      direction: initialContext === "receivable" ? "in" : "out",
      method: initialValues?.method ?? "cash",
      payableId: initialValues?.payableId ?? "",
      receivableId: initialValues?.receivableId ?? "",
      amount: initialValues?.amount ?? 0,
      notes: initialValues?.notes ?? "",
    },
  });

  const [selectedPayableId = "", selectedReceivableId = "", amount = 0, method = "cash"] =
    useWatch({
      control: form.control,
      name: ["payableId", "receivableId", "amount", "method"],
    });

  const activeOptions = context === "payable" ? payables : receivables;
  const amountNumber = typeof amount === "number" ? amount : Number(amount || 0);
  const methodValue =
    method === "cash" ||
    method === "bank_transfer" ||
    method === "giro" ||
    method === "other"
      ? method
      : "cash";
  const selectedReference = useMemo(() => {
    const activeId = context === "payable" ? selectedPayableId : selectedReceivableId;
    return activeOptions.find((item) => item.id === activeId) ?? null;
  }, [activeOptions, context, selectedPayableId, selectedReceivableId]);

  const remainingAfterPost = Math.max(
    Number(selectedReference?.outstandingAmount ?? 0) - amountNumber,
    0,
  );
  const previousReferenceId = useRef<string>("");

  useEffect(() => {
    const activeId = context === "payable" ? selectedPayableId : selectedReceivableId;
    if (!activeId) {
      previousReferenceId.current = "";
      return;
    }

    if (previousReferenceId.current !== activeId) {
      form.setValue(
        "amount",
        Number(selectedReference?.outstandingAmount ?? 0),
        { shouldDirty: true },
      );
      previousReferenceId.current = activeId;
    }
  }, [context, form, selectedPayableId, selectedReceivableId, selectedReference?.outstandingAmount]);

  function switchContext(nextContext: PaymentContext) {
    setContext(nextContext);
    form.setValue("direction", nextContext === "receivable" ? "in" : "out");

    if (nextContext === "payable") {
      form.setValue("receivableId", "");
    } else {
      form.setValue("payableId", "");
    }
  }

  async function onSubmit(payload: PaymentValues) {
    setSubmitting(true);

    const normalizedPayload: PaymentValues = {
      ...payload,
      direction: context === "receivable" ? "in" : "out",
      payableId: context === "payable" ? payload.payableId : "",
      receivableId: context === "receivable" ? payload.receivableId : "",
    };

    const response = await fetch("/api/finance/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedPayload),
    });
    const result = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal mencatat pembayaran.");
      setSubmitting(false);
      return;
    }

    toast.success(
      context === "payable"
        ? "Pembayaran hutang berhasil dicatat."
        : "Penerimaan piutang berhasil dicatat.",
    );

    if (submitIntent === "print" && result.id) {
      router.push(`/print/payments/${result.id}/receipt`);
      return;
    }

    form.reset({
      paymentDate: new Date().toISOString().slice(0, 10),
      direction: context === "receivable" ? "in" : "out",
      method: "cash",
      payableId: initialContext === "payable" ? initialValues?.payableId ?? "" : "",
      receivableId: initialContext === "receivable" ? initialValues?.receivableId ?? "" : "",
      amount: 0,
      notes: "",
    });
    setSubmitting(false);
  }

  const errors = form.formState.errors as Partial<
    Record<keyof PaymentValues, { message?: string }>
  >;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle>
            {context === "payable" ? "Catat Pembayaran Hutang" : "Catat Penerimaan Piutang"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {context === "payable"
              ? "Gunakan form ini untuk mencatat pembayaran ke petani atau supplier terhadap hutang yang masih berjalan."
              : "Gunakan form ini untuk mencatat penerimaan dari pabrik atau customer terhadap piutang yang masih berjalan."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ContextButton
            active={context === "payable"}
            icon={<ArrowUpRight className="size-4" />}
            label="Pembayaran Hutang"
            onClick={() => switchContext("payable")}
          />
          <ContextButton
            active={context === "receivable"}
            icon={<ArrowDownLeft className="size-4" />}
            label="Penerimaan Piutang"
            onClick={() => switchContext("receivable")}
          />
        </div>
      </CardHeader>

      <CardContent>
        <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Tanggal</Label>
              <Input id="paymentDate" type="date" {...form.register("paymentDate")} />
              <FieldError message={errors.paymentDate?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Metode</Label>
              <Select id="method" {...form.register("method")}>
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="giro">Giro</option>
                <option value="other">Lainnya</option>
              </Select>
            </div>

            {context === "payable" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payableId">Hutang</Label>
                <Select
                  id="payableId"
                  placeholder="Pilih hutang"
                  {...form.register("payableId")}
                >
                  {payables.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} • {item.partyName ?? "Tanpa pihak"} • Sisa {formatCurrency(item.outstandingAmount)}
                    </option>
                  ))}
                </Select>
                <FieldHint>Pilih referensi hutang yang akan dibayar.</FieldHint>
                <FieldError message={errors.payableId?.message} />
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="receivableId">Piutang</Label>
                <Select
                  id="receivableId"
                  placeholder="Pilih piutang"
                  {...form.register("receivableId")}
                >
                  {receivables.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} • {item.partyName ?? "Tanpa pihak"} • Sisa {formatCurrency(item.outstandingAmount)}
                    </option>
                  ))}
                </Select>
                <FieldHint>Pilih referensi piutang yang akan ditagih atau diterima.</FieldHint>
                <FieldError message={errors.receivableId?.message} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Nominal</Label>
              <Input id="amount" min="0" step="0.01" type="number" {...form.register("amount")} />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    form.setValue("amount", Number(selectedReference?.outstandingAmount ?? 0), {
                      shouldDirty: true,
                    })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Isi Sisa Penuh
                </Button>
                <Button
                  onClick={() => form.setValue("amount", 0, { shouldDirty: true })}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Kosongkan
                </Button>
              </div>
              <FieldError message={errors.amount?.message} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder={
                  context === "payable"
                    ? "Tambahkan catatan pembayaran, referensi transfer, atau keterangan administrasi lainnya."
                    : "Tambahkan catatan penerimaan, referensi transfer masuk, atau keterangan administrasi lainnya."
                }
                {...form.register("notes")}
              />
              <FieldError message={errors.notes?.message} />
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={submitting}
                  onClick={() => setSubmitIntent("save")}
                  type="submit"
                >
                  {submitting
                    ? "Menyimpan..."
                    : context === "payable"
                      ? "Simpan Pembayaran Hutang"
                      : "Simpan Penerimaan Piutang"}
                </Button>
                <Button
                  disabled={submitting}
                  onClick={() => setSubmitIntent("print")}
                  type="submit"
                  variant="outline"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Cetak Bukti"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 self-start rounded-3xl border border-border/80 bg-muted/20 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="size-4 text-primary" />
              Ringkasan Referensi
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Periksa referensi, outstanding, dan nominal yang akan dicatat sebelum menyimpan.
            </p>
            <SummaryField
              label={context === "payable" ? "Tipe Transaksi" : "Tipe Pencatatan"}
              value={context === "payable" ? "Pembayaran Hutang" : "Penerimaan Piutang"}
            />
            <SummaryField
              label="Referensi"
              value={selectedReference?.code ?? "-"}
            />
            <SummaryField
              label={context === "payable" ? "Pihak Hutang" : "Pihak Piutang"}
              value={selectedReference?.partyName ?? "-"}
            />
            <SummaryField
              label="Tipe Pihak"
              value={getPartyTypeLabel(selectedReference?.partyType)}
            />
            <SummaryField
              label="Referensi Transaksi"
              value={selectedReference?.sourceCode ?? "-"}
            />
            <SummaryField
              label="Outstanding Saat Ini"
              value={formatCurrency(selectedReference?.outstandingAmount ?? 0)}
              emphasis
            />
            <SummaryField
              label="Nominal Dicatat"
              value={formatCurrency(amountNumber)}
            />
            <SummaryField
              label="Sisa Setelah Pencatatan"
              value={formatCurrency(remainingAfterPost)}
            />
            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Landmark className="size-4 text-primary" />
                Detail Administrasi
              </div>
              <p className="mt-2 leading-6">
                Metode: {getMethodLabel(methodValue)}
              </p>
              <p className="mt-1 leading-6">
                Dicatat ke: {getLedgerLabel(methodValue)}
              </p>
              <p className="mt-1 leading-6">
                Status referensi: {selectedReference ? getStatusLabel(selectedReference.status) : "-"}
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
