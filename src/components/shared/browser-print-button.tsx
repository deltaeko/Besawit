"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BrowserPrintButton({
  label = "Cetak",
}: {
  label?: string;
}) {
  return (
    <Button onClick={() => window.print()} type="button" variant="outline">
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
