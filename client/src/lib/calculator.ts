import { LINE_ITEMS, type LineItemDef } from "@shared/schema";

export interface CalculatedTotals {
  totalMinutes: number;
  totalHours: number;
  prelimWithBbi: number;
  prelimWithoutBbi: number;
  loading625: number;
  totalBillings: number;
}

export function calculateTotals(counts: Record<string, number>): CalculatedTotals {
  let totalMinutes = 0;
  let prelimWithBbi = 0;
  let prelimWithoutBbi = 0;

  for (const item of LINE_ITEMS) {
    const c = counts[item.key] || 0;
    totalMinutes += c * item.minutes;
    prelimWithBbi += c * (item.baseAmount + item.bbiAmount);
    prelimWithoutBbi += c * item.baseAmount;
  }

  const loading625 = 0.0625 * prelimWithoutBbi;
  const totalBillings = prelimWithBbi + loading625;
  const totalHours = totalMinutes > 0 ? Math.ceil(totalMinutes / 60) : 0;

  return { totalMinutes, totalHours, prelimWithBbi, prelimWithoutBbi, loading625, totalBillings };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getLineItemCategories(): { category: string; items: LineItemDef[] }[] {
  return [
    {
      category: "Facilities",
      items: LINE_ITEMS.filter(i => i.key === "facilities_visited"),
    },
    {
      category: "Standard Consults",
      items: LINE_ITEMS.filter(i => i.key.startsWith("consult_") && !i.key.includes("ah_") && !i.key.includes("5049") && !i.key.includes("5067") && !i.key.includes("5077")),
    },
    {
      category: "After Hours Consults",
      items: LINE_ITEMS.filter(i => i.key.includes("ah_") || i.key.includes("5049") || i.key.includes("5067") || i.key.includes("5077")),
    },
    {
      category: "Other Services",
      items: LINE_ITEMS.filter(i =>
        ["urgent_unsociable_599", "health_ax", "rmmr_standalone", "rmmr_cobilled", "mdcp_731_standalone", "mdcp_731_cobilled", "mdt_739"].includes(i.key)
      ),
    },
  ];
}
