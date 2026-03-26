import type { PalmEntityKey } from "@/types/domain";

const palmEntities = ["purchases", "sales"] satisfies PalmEntityKey[];

export function isPalmEntity(value: string): value is PalmEntityKey {
  return palmEntities.includes(value as PalmEntityKey);
}
