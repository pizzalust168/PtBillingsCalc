import { storage } from "./storage";
import { LINE_ITEMS, computeTotals } from "@shared/schema";

export async function seedDatabase() {
  const existingWeeks = await storage.getWeeks();
  if (existingWeeks.length > 0) return;

  const seedWeeks = [
    {
      weekEnding: "2026-02-08",
      counts: {
        facilities_visited: 3,
        consult_a_90020: 8,
        consult_b_90035: 12,
        consult_c_90043: 5,
        consult_d_90051: 2,
        consult_e_90054: 1,
        rmmr_standalone: 3,
        mdcp_731_standalone: 2,
        mdt_739: 1,
      } as Record<string, number>,
    },
    {
      weekEnding: "2026-02-01",
      counts: {
        facilities_visited: 4,
        consult_a_90020: 6,
        consult_b_90035: 15,
        consult_c_90043: 7,
        consult_d_90051: 3,
        consult_a_ah_5010: 2,
        consult_b_ah_5028: 1,
        health_ax: 1,
        rmmr_cobilled: 4,
        mdcp_731_cobilled: 3,
      } as Record<string, number>,
    },
    {
      weekEnding: "2026-01-25",
      counts: {
        facilities_visited: 2,
        consult_a_90020: 10,
        consult_b_90035: 8,
        consult_c_90043: 4,
        consult_e_90054: 2,
        urgent_unsociable_599: 1,
        rmmr_standalone: 2,
        mdt_739: 2,
      } as Record<string, number>,
    },
  ];

  for (const seedWeek of seedWeeks) {
    const fullCounts: Record<string, number> = {};
    for (const item of LINE_ITEMS) {
      fullCounts[item.key] = seedWeek.counts[item.key] || 0;
    }

    const totals = computeTotals(fullCounts);
    const createdAt = new Date().toISOString();

    const week = await storage.createWeek({
      weekEnding: seedWeek.weekEnding,
      totalBillings: totals.totalBillings,
      prelimWithBbi: totals.prelimWithBbi,
      prelimWithoutBbi: totals.prelimWithoutBbi,
      loading625: totals.loading625,
      totalMinutes: totals.totalMinutes,
      totalHours: totals.totalHours,
      createdAt,
    });

    const lineItems = LINE_ITEMS.map(item => ({
      weeklyTotalId: week.id,
      itemKey: item.key,
      itemLabel: item.label,
      minutesPerItem: item.minutes,
      baseAmount: item.baseAmount,
      bbiAmount: item.bbiAmount,
      count: fullCounts[item.key],
    }));

    await storage.createLineItems(lineItems);
  }

  console.log("Seeded 3 sample weeks.");
}
