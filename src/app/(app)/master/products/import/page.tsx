import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProductImportForm } from "@/modules/master/product-import-form";

export default function ProductImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data Produk"
        title="Import Produk"
        description="Unduh template Excel, isi data produk sesuai kolom yang diminta, lalu lakukan preview sebelum produk baru dibuat atau produk existing diperbarui berdasarkan kode."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/api/products/import/template">Unduh Template Excel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/master/products">Kembali ke Produk</Link>
            </Button>
          </div>
        }
      />

      <ProductImportForm />
    </div>
  );
}
