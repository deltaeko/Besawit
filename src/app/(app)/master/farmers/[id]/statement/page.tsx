import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FarmerPayableStatementDocument } from "@/modules/finance/farmer-payable-statement-document";
import { getFarmerPayableStatement } from "@/services/finance-service";
import { getMasterDetail } from "@/services/master-service";

export default async function FarmerStatementPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [farmer, statement] = await Promise.all([
    getMasterDetail("farmers", id).catch(() => null),
    getFarmerPayableStatement(id).catch(() => null),
  ]);

  if (!farmer || !statement) notFound();

  const farmerView = farmer as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Preview Statement Hutang Petani"
        description="Tinjau data hutang, pembayaran, dan saldo akhir sebelum dicetak. Angka di halaman ini harus sinkron dengan modul keuangan."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/master/farmers/${id}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/farmers/${id}/payable-statement`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
            <Button disabled type="button" variant="outline">
              <FileDown className="size-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
        Export PDF belum diaktifkan karena infrastruktur generator PDF belum tersedia di aplikasi saat ini. Preview ini tetap siap dicetak melalui browser.
      </div>

      <FarmerPayableStatementDocument
        farmer={farmerView}
        mode="preview"
        printedAt={new Date()}
        statement={statement}
      />
    </div>
  );
}
