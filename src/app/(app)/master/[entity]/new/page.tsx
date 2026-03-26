import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { masterEntityConfig } from "@/modules/master/config";
import { isMasterEntity } from "@/modules/master/helpers";
import { MasterForm } from "@/modules/master/master-form";
import { getMasterOptions } from "@/services/master-service";

export default async function NewMasterEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!isMasterEntity(entity)) notFound();

  const config = masterEntityConfig[entity];
  const defaultValues =
    entity === "products"
      ? {
          ...config.defaultValues,
          priceEffectiveFrom: new Date().toISOString().slice(0, 10),
        }
      : config.defaultValues;
  const options = await getMasterOptions().catch(() => ({
    roles: [],
    categories: [],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master Data"
        title={config.createLabel}
        description={config.description}
      />
      <MasterForm
        config={config}
        defaultValues={defaultValues}
        entity={entity}
        mode="create"
        options={options}
      />
    </div>
  );
}
