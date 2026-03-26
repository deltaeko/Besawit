import type { StoreEntityKey } from "@/types/domain";

const storeEntities = ["purchases", "sales"] satisfies StoreEntityKey[];

export function isStoreEntity(value: string): value is StoreEntityKey {
  return storeEntities.includes(value as StoreEntityKey);
}
