import registryJson from "@/data/market-registry.json";

import type { MarketRecord } from "@/lib/types";

export const marketRegistry = registryJson as MarketRecord[];

export function getMarketRecord(registryId: string) {
  return marketRegistry.find((record) => record.registry_id === registryId);
}

export function getRegistryStats() {
  return {
    routes: marketRegistry.length,
    direct: marketRegistry.filter((record) =>
      ["direct", "exclusive_agent", "affinity"].includes(
        record.distribution_type,
      ),
    ).length,
    brokerOrAggregator: marketRegistry.filter((record) =>
      ["broker", "aggregator"].includes(record.distribution_type),
    ).length,
    humanRequired: marketRegistry.filter(
      (record) => record.requirements.requires_human === true,
    ).length,
  };
}
