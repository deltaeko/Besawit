import { notFound } from "next/navigation";

import { PrintDocumentActions } from "@/components/shared/print-document-actions";
import { FarmerPayableStatementDocument } from "@/modules/finance/farmer-payable-statement-document";
import { getFarmerPayableStatement } from "@/services/finance-service";
import { getMasterDetail } from "@/services/master-service";

export default async function FarmerPayableStatementPrintPage({
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PrintDocumentActions
        backHref={`/master/farmers/${id}/statement`}
        documentType="payable_statement"
        fileName={`statement-hutang-${String(farmerView.code ?? id)}.pdf`}
        printLabel="Cetak Statement"
        referenceId={id}
        referenceType="manual"
      />
      <FarmerPayableStatementDocument
        farmer={farmerView}
        mode="print"
        printedAt={new Date()}
        statement={statement}
      />
    </div>
  );
}
