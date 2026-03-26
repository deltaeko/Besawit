"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancelAction,
  AlertDialogConfirmAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function StatusToggleButton({
  apiPath,
  isActive,
}: {
  apiPath: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onConfirm() {
    setSaving(true);

    const response = await fetch(apiPath, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive: !isActive }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal mengubah status.");
      setSaving(false);
      return;
    }

    toast.success(isActive ? "Data dinonaktifkan." : "Data diaktifkan.");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? "Nonaktifkan data?" : "Aktifkan data?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Perubahan ini tidak menghapus data. Status hanya diubah menjadi{" "}
            {isActive ? "nonaktif" : "aktif"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancelAction>Batal</AlertDialogCancelAction>
          <AlertDialogConfirmAction disabled={saving} onClick={onConfirm}>
            {saving ? "Menyimpan..." : "Konfirmasi"}
          </AlertDialogConfirmAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
