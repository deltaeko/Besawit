import { getMasterList } from "@/services/master-service";
import { getFarmerStoreReceivableSummaryMap } from "@/services/finance-service";

export async function getPalmPurchaseFormOptions() {
  const [farmers, personnel, vehicles, warehouses] = await Promise.all([
    getMasterList("farmers", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
    getMasterList("transport-personnel", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
    getMasterList("vehicles", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
    getMasterList("warehouses", { status: "active", pageSize: 50 })
      .then((result) => result.items)
      .catch(() => []),
  ]);

  const farmerStoreDebtMap = await getFarmerStoreReceivableSummaryMap(
    farmers.map((item) => (item as { id: string }).id),
  ).catch(() => ({}));

  return {
    farmers: farmers.map((item) => ({
      id: (item as { id: string }).id,
      name: (item as { name: string }).name,
    })),
    driverOptions: personnel
      .filter((item) => (item as { role?: string | null }).role === "driver")
      .map((item) => ({
        id: (item as { id: string }).id,
        name: (item as { name: string }).name,
      })),
    vehicles: vehicles.map((item) => ({
      id: (item as { id: string }).id,
      plateNumber: (item as { plateNumber: string }).plateNumber,
      type: (item as { type?: string | null }).type ?? null,
    })),
    warehouses: warehouses.map((item) => ({
      id: (item as { id: string }).id,
      name: (item as { name: string }).name,
    })),
    farmerStoreDebtMap,
  };
}
