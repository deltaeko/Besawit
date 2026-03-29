import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FactoryReceivableStatementDocument } from "@/modules/finance/factory-receivable-statement-document";
import { getFactoryReceivableStatement } from "@/services/finance-service";
import { getMasterDetail } from "@/services/master-service";

export default async function FactoryStatementPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [factory, statement] = await Promise.all([
    getMasterDetail("factories", id).catch(() => null),
    getFactoryReceivableStatement(id).catch(() => null),
  ]);

  if (!factory || !statement) notFound();

  const factoryView = factory as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Preview Statement Piutang Pabrik"
        description="Tinjau data piutang, penerimaan, dan saldo akhir sebelum dicetak. Angka di halaman ini harus sinkron dengan modul keuangan."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/master/factories/${id}`}>Kembali</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/print/factories/${id}/receivable-statement`} target="_blank">
                <Printer className="size-4" />
                Print
              </Link>
            </Button>
          </div>
        }
      />

      <FactoryReceivableStatementDocument
        factory={factoryView}
        mode="preview"
        printedAt={new Date()}
        statement={statement}
      />
    </div>
  );
}
