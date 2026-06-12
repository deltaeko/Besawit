"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function TrialAdminActions({
  instanceId,
  canConvert,
  companyName,
}: {
  instanceId: string;
  canConvert: boolean;
  companyName: string;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<"notify" | "convert" | null>(null);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [form, setForm] = useState({
    planName: "Besawit Pro",
    billingCycle: "annual",
    contractAmount: "",
    currency: "IDR",
    paidUntil: "",
    salesNotes: "",
  });

  async function postAction(action: "notify") {
    setBusyAction(action);

    try {
      const response = await fetch(`/api/platform/trials/${instanceId}/resend-ready-notification`, {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Aksi belum berhasil diproses.");
        return;
      }

      toast.success("Notifikasi trial-ready sudah diproses.");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Terjadi gangguan saat menjalankan aksi.");
    } finally {
      setBusyAction(null);
    }
  }

  async function submitConvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("convert");

    try {
      const response = await fetch(`/api/platform/trials/${instanceId}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planName: form.planName,
          billingCycle: form.billingCycle,
          contractAmount: form.contractAmount ? Number(form.contractAmount) : undefined,
          currency: form.currency,
          paidUntil: form.paidUntil || undefined,
          salesNotes: form.salesNotes || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "Convert ke paid belum berhasil.");
        return;
      }

      toast.success("Instance berhasil diubah menjadi paid.");
      setShowConvertForm(false);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Terjadi gangguan saat memproses conversion.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => postAction("notify")}
          size="sm"
          type="button"
          variant="outline"
        >
          {busyAction === "notify" ? "Memproses..." : "Resend Notify"}
        </Button>
        <Button
          disabled={!canConvert}
          onClick={() => setShowConvertForm(true)}
          size="sm"
          type="button"
        >
          {busyAction === "convert" ? "Mengubah..." : "Convert to Paid"}
        </Button>
      </div>

      {showConvertForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Convert Trial ke Paid</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Simpan metadata billing untuk <span className="font-medium text-foreground">{companyName}</span> sebelum
                  trial dikunci menjadi customer aktif.
                </p>
              </div>
              <Button
                onClick={() => setShowConvertForm(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Tutup
              </Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submitConvert}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`planName-${instanceId}`}>Plan</Label>
                  <Input
                    id={`planName-${instanceId}`}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, planName: event.target.value }))
                    }
                    placeholder="Besawit Pro"
                    required
                    value={form.planName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`billingCycle-${instanceId}`}>Billing Cycle</Label>
                  <Select
                    id={`billingCycle-${instanceId}`}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, billingCycle: event.target.value }))
                    }
                    value={form.billingCycle}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannual">Semiannual</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.7fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor={`contractAmount-${instanceId}`}>Nilai Kontrak</Label>
                  <Input
                    id={`contractAmount-${instanceId}`}
                    inputMode="decimal"
                    min="0"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        contractAmount: event.target.value,
                      }))
                    }
                    placeholder="15000000"
                    type="number"
                    value={form.contractAmount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`currency-${instanceId}`}>Currency</Label>
                  <Input
                    id={`currency-${instanceId}`}
                    maxLength={3}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="IDR"
                    required
                    value={form.currency}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`paidUntil-${instanceId}`}>Aktif Sampai</Label>
                  <Input
                    id={`paidUntil-${instanceId}`}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, paidUntil: event.target.value }))
                    }
                    type="date"
                    value={form.paidUntil}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`salesNotes-${instanceId}`}>Catatan Sales / Pembayaran</Label>
                <Textarea
                  id={`salesNotes-${instanceId}`}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, salesNotes: event.target.value }))
                  }
                  placeholder="Contoh: deal via WhatsApp, invoice termin 1 sudah dibayar, setup onboarding minggu depan."
                  value={form.salesNotes}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  onClick={() => setShowConvertForm(false)}
                  type="button"
                  variant="outline"
                >
                  Batal
                </Button>
                <Button disabled={busyAction === "convert"} type="submit">
                  {busyAction === "convert" ? "Menyimpan..." : "Simpan dan Aktivasi Paid"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
