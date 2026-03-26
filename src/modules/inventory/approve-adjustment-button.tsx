"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ApproveAdjustmentButton({ adjustmentId }: { adjustmentId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setSubmitting(true);

    const response = await fetch(`/api/inventory/adjustments/${adjustmentId}/approve`, {
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal approve adjustment.");
      setSubmitting(false);
      return;
    }

    toast.success("Adjustment berhasil di-approve.");
    router.refresh();
    setSubmitting(false);
  }

  return (
    <Button disabled={submitting} onClick={handleApprove} size="sm" type="button" variant="outline">
      <CheckCircle2 className="size-4" />
      {submitting ? "Approving..." : "Approve"}
    </Button>
  );
}
