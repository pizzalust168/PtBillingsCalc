import { storage } from "./storage";
import { LINE_ITEMS, computeTotals } from "@shared/schema";

export async function seedDatabase() {
  const existingDays = await storage.getDays();
  if (existingDays.length > 0) return;

  const seedDays = [
    {
      date: "2026-02-09",
      counts: { facilities_visited: 1, consult_a_90020: 4, consult_b_90035: 6, consult_c_90043: 2, rmmr_standalone: 1 } as Record<string, number>,
    },
    {
      date: "2026-02-10",
      counts: { facilities_visited: 1, consult_a_90020: 3, consult_b_90035: 5, consult_d_90051: 1, mdcp_731_standalone: 2 } as Record<string, number>,
    },
    {
      date: "2026-02-11",
      counts: { facilities_visited: 1, consult_b_90035: 4, consult_c_90043: 3, consult_e_90054: 1, mdt_739: 1 } as Record<string, number>,
    },
    {
      date: "2026-02-12",
      counts: { facilities_visited: 1, consult_a_90020: 5, consult_b_90035: 3, consult_c_90043: 1, health_ax: 1 } as Record<string, number>,
    },
    {
      date: "2026-02-13",
      counts: { consult_a_90020: 2, consult_b_90035: 7, consult_d_90051: 2, rmmr_cobilled: 2 } as Record<string, number>,
    },
    {
      date: "2026-02-03",
      counts: { facilities_visited: 2, consult_a_90020: 6, consult_b_90035: 4, consult_c_90043: 3, urgent_unsociable_599: 1 } as Record<string, number>,
    },
    {
      date: "2026-02-04",
      counts: { facilities_visited: 1, consult_b_90035: 8, consult_c_90043: 2, consult_a_ah_5010: 2, rmmr_standalone: 3 } as Record<string, number>,
    },
    {
      date: "2026-02-05",
      counts: { consult_a_90020: 3, consult_b_90035: 5, consult_d_90051: 1, mdcp_731_cobilled: 2, mdt_739: 1 } as Record<string, number>,
    },
  ];

  for (const seedDay of seedDays) {
    const fullCounts: Record<string, number> = {};
    for (const item of LINE_ITEMS) {
      fullCounts[item.key] = seedDay.counts[item.key] || 0;
    }

    const totals = computeTotals(fullCounts);
    const createdAt = new Date().toISOString();

    const day = await storage.createDay({
      date: seedDay.date,
      totalBillings: totals.totalBillings,
      prelimWithBbi: totals.prelimWithBbi,
      prelimWithoutBbi: totals.prelimWithoutBbi,
      loading625: totals.loading625,
      totalMinutes: totals.totalMinutes,
      totalHours: totals.totalHours,
      createdAt,
    });

    const lineItems = LINE_ITEMS.map(item => ({
      dailyTotalId: day.id,
      itemKey: item.key,
      itemLabel: item.label,
      minutesPerItem: item.minutes,
      baseAmount: item.baseAmount,
      bbiAmount: item.bbiAmount,
      count: fullCounts[item.key],
    }));

    await storage.createLineItems(lineItems);
  }

  console.log("Seeded 8 sample days across 2 work weeks.");
}
