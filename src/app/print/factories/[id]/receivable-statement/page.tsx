import { notFound } from "next/navigation";

import { PrintDocumentActions } from "@/components/shared/print-document-actions";
import { FactoryReceivableStatementDocument } from "@/modules/finance/factory-receivable-statement-document";
import { getFactoryReceivableStatement } from "@/services/finance-service";
import { getMasterDetail } from "@/services/master-service";

export default async function FactoryReceivableStatementPrintPage({
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintDocumentActions
        backHref={`/master/factories/${id}/statement`}
        documentType="receivable_statement"
        fileName={`statement-piutang-${String(factoryView.code ?? id)}.pdf`}
        printLabel="Cetak Statement"
        referenceId={id}
        referenceType="manual"
      />
      <FactoryReceivableStatementDocument
        factory={factoryView}
        mode="print"
        printedAt={new Date()}
        statement={statement}
      />
    </div>
  );
}
