import type { MasterEntityKey } from "@/types/domain";

const masterEntities = [
  "farmers",
  "factories",
  "customers",
  "suppliers",
  "transport-personnel",
  "vehicles",
  "warehouses",
  "products",
  "categories",
  "users",
  "roles",
] satisfies MasterEntityKey[];

export function isMasterEntity(value: string): value is MasterEntityKey {
  return masterEntities.includes(value as MasterEntityKey);
}
