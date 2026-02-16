import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, serial, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const dailyTotals = pgTable("daily_totals", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  totalBillings: real("total_billings").notNull(),
  prelimWithBbi: real("prelim_with_bbi").notNull(),
  prelimWithoutBbi: real("prelim_without_bbi").notNull(),
  loading625: real("loading_625").notNull(),
  totalMinutes: integer("total_minutes").notNull(),
  totalHours: integer("total_hours").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyLineItems = pgTable("daily_line_items", {
  id: serial("id").primaryKey(),
  dailyTotalId: integer("daily_total_id").notNull().references(() => dailyTotals.id, { onDelete: "cascade" }),
  itemKey: text("item_key").notNull(),
  itemLabel: text("item_label").notNull(),
  minutesPerItem: integer("minutes_per_item").notNull(),
  baseAmount: real("base_amount").notNull(),
  bbiAmount: real("bbi_amount").notNull(),
  count: integer("count").notNull(),
}, (table) => [
  unique().on(table.dailyTotalId, table.itemKey),
]);

export const dailyTotalsRelations = relations(dailyTotals, ({ many }) => ({
  lineItems: many(dailyLineItems),
}));

export const dailyLineItemsRelations = relations(dailyLineItems, ({ one }) => ({
  dailyTotal: one(dailyTotals, {
    fields: [dailyLineItems.dailyTotalId],
    references: [dailyTotals.id],
  }),
}));

export const insertDailyTotalSchema = createInsertSchema(dailyTotals).omit({
  id: true,
});

export const insertDailyLineItemSchema = createInsertSchema(dailyLineItems).omit({
  id: true,
});

export type DailyTotal = typeof dailyTotals.$inferSelect;
export type InsertDailyTotal = z.infer<typeof insertDailyTotalSchema>;
export type DailyLineItem = typeof dailyLineItems.$inferSelect;
export type InsertDailyLineItem = z.infer<typeof insertDailyLineItemSchema>;

export const saveDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  counts: z.record(z.string(), z.number().int().min(0)),
});

export type SaveDayInput = z.infer<typeof saveDaySchema>;

export interface LineItemDef {
  key: string;
  label: string;
  minutes: number;
  baseAmount: number;
  bbiAmount: number;
}

export const LINE_ITEMS: LineItemDef[] = [
  { key: "facilities_visited", label: "Facilities Visited", minutes: 0, baseAmount: 64.15, bbiAmount: 0.0 },
  { key: "consult_a_90020", label: "Consult - A (90020)", minutes: 2, baseAmount: 20.05, bbiAmount: 8.6 },
  { key: "consult_b_90035", label: "Consult - B (90035)", minutes: 6, baseAmount: 43.9, bbiAmount: 25.7 },
  { key: "consult_c_90043", label: "Consult - C (90043)", minutes: 20, baseAmount: 84.9, bbiAmount: 25.7 },
  { key: "consult_d_90051", label: "Consult - D (90051)", minutes: 40, baseAmount: 125.1, bbiAmount: 25.7 },
  { key: "consult_e_90054", label: "Consult - E (90054)", minutes: 60, baseAmount: 202.65, bbiAmount: 25.7 },
  { key: "consult_a_ah_5010", label: "Consult - A AH (5010)", minutes: 2, baseAmount: 37.7, bbiAmount: 8.6 },
  { key: "consult_b_ah_5028", label: "Consult - B AH (5028)", minutes: 6, baseAmount: 61.05, bbiAmount: 25.7 },
  { key: "consult_c_5049", label: "Consult - C (5049)", minutes: 20, baseAmount: 101.9, bbiAmount: 25.7 },
  { key: "consult_d_5067", label: "Consult - D (5067)", minutes: 40, baseAmount: 141.3, bbiAmount: 25.7 },
  { key: "consult_e_5077", label: "Consult - E (5077)", minutes: 60, baseAmount: 237.3, bbiAmount: 25.7 },
  { key: "urgent_unsociable_599", label: "Urgent Unsociable (599)", minutes: 15, baseAmount: 178.5, bbiAmount: 8.6 },
  { key: "health_ax", label: "Health Ax", minutes: 60, baseAmount: 313.6, bbiAmount: 8.6 },
  { key: "rmmr_standalone", label: "RMMR - Standalone", minutes: 10, baseAmount: 123.7, bbiAmount: 8.6 },
  { key: "rmmr_cobilled", label: "RMMR - Co-billed", minutes: 10, baseAmount: 123.7, bbiAmount: 8.6 },
  { key: "mdcp_731_standalone", label: "MDCP (731) - Standalone", minutes: 10, baseAmount: 82.1, bbiAmount: 8.6 },
  { key: "mdcp_731_cobilled", label: "MDCP (731) - Co-billed", minutes: 10, baseAmount: 82.1, bbiAmount: 8.6 },
  { key: "mdt_739", label: "MDT (739)", minutes: 20, baseAmount: 141.05, bbiAmount: 8.6 },
];

export function computeTotals(counts: Record<string, number>) {
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

  return {
    totalMinutes,
    totalHours,
    prelimWithBbi,
    prelimWithoutBbi,
    loading625,
    totalBillings,
  };
}

export const monthlyBudgets = pgTable("monthly_budgets", {
  id: serial("id").primaryKey(),
  month: text("month").notNull().unique(),
  budget: real("budget").notNull(),
});

export const insertMonthlyBudgetSchema = createInsertSchema(monthlyBudgets).omit({
  id: true,
});

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type InsertMonthlyBudget = z.infer<typeof insertMonthlyBudgetSchema>;

export const setBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
  budget: z.number().min(0, "Budget must be a positive number"),
});

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

function parseIsoDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonday(dateStr: string): string {
  const d = parseIsoDate(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return formatIsoDate(monday);
}

export function getSunday(mondayStr: string): string {
  const d = parseIsoDate(mondayStr);
  d.setUTCDate(d.getUTCDate() + 6);
  return formatIsoDate(d);
}
