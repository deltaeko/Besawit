import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FarmerImportForm } from "@/modules/master/farmer-import-form";

export default function FarmerImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data Petani"
        title="Import Petani"
        description="Unduh template Excel, isi data petani sesuai kolom yang diminta, lalu lakukan preview sebelum data baru dibuat atau data existing diperbarui berdasarkan kode."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/api/farmers/import/template">Unduh Template Excel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/master/farmers">Kembali ke Petani</Link>
            </Button>
          </div>
        }
      />

      <FarmerImportForm />
    </div>
  );
}
