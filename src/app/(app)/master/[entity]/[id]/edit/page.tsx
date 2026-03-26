import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { masterEntityConfig } from "@/modules/master/config";
import { isMasterEntity } from "@/modules/master/helpers";
import { MasterForm } from "@/modules/master/master-form";
import { getMasterDetail, getMasterOptions } from "@/services/master-service";

export default async function EditMasterEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isMasterEntity(entity)) notFound();

  const config = masterEntityConfig[entity];
  const [record, options] = await Promise.all([
    getMasterDetail(entity, id),
    getMasterOptions().catch(() => ({
      roles: [],
      categories: [],
    })),
  ]);

  if (!record) notFound();

  const defaultValues =
    entity === "products"
      ? {
          ...(record as Record<string, unknown>),
          priceEffectiveFrom: "",
          priceChangeNote: "",
        }
      : (record as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data"
        title={`Edit ${config.singular}`}
        description={config.description}
      />
      <MasterForm
        config={config}
        defaultValues={defaultValues}
        entity={entity}
        mode="edit"
        options={options}
        recordId={id}
      />
    </div>
  );
}
