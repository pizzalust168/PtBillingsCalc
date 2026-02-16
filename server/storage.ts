import {
  dailyTotals,
  dailyLineItems,
  monthlyBudgets,
  type DailyTotal,
  type InsertDailyTotal,
  type DailyLineItem,
  type InsertDailyLineItem,
  type MonthlyBudget,
  type InsertMonthlyBudget,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getDays(): Promise<DailyTotal[]>;
  getDay(id: number): Promise<DailyTotal | undefined>;
  getDayByDate(date: string): Promise<DailyTotal | undefined>;
  createDay(day: InsertDailyTotal): Promise<DailyTotal>;
  deleteDay(id: number): Promise<boolean>;
  createLineItems(items: InsertDailyLineItem[]): Promise<DailyLineItem[]>;
  getLineItems(dailyTotalId: number): Promise<DailyLineItem[]>;
  getBudgets(): Promise<MonthlyBudget[]>;
  getBudget(month: string): Promise<MonthlyBudget | undefined>;
  setBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget>;
}

export class DatabaseStorage implements IStorage {
  async getDays(): Promise<DailyTotal[]> {
    return db.select().from(dailyTotals).orderBy(desc(dailyTotals.date));
  }

  async getDay(id: number): Promise<DailyTotal | undefined> {
    const [day] = await db.select().from(dailyTotals).where(eq(dailyTotals.id, id));
    return day || undefined;
  }

  async getDayByDate(date: string): Promise<DailyTotal | undefined> {
    const [day] = await db.select().from(dailyTotals).where(eq(dailyTotals.date, date));
    return day || undefined;
  }

  async createDay(day: InsertDailyTotal): Promise<DailyTotal> {
    const [created] = await db.insert(dailyTotals).values(day).returning();
    return created;
  }

  async deleteDay(id: number): Promise<boolean> {
    const result = await db.delete(dailyTotals).where(eq(dailyTotals.id, id)).returning();
    return result.length > 0;
  }

  async createLineItems(items: InsertDailyLineItem[]): Promise<DailyLineItem[]> {
    if (items.length === 0) return [];
    return db.insert(dailyLineItems).values(items).returning();
  }

  async getLineItems(dailyTotalId: number): Promise<DailyLineItem[]> {
    return db
      .select()
      .from(dailyLineItems)
      .where(eq(dailyLineItems.dailyTotalId, dailyTotalId))
      .orderBy(dailyLineItems.itemLabel);
  }

  async getBudgets(): Promise<MonthlyBudget[]> {
    return db.select().from(monthlyBudgets).orderBy(desc(monthlyBudgets.month));
  }

  async getBudget(month: string): Promise<MonthlyBudget | undefined> {
    const [budget] = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.month, month));
    return budget || undefined;
  }

  async setBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget> {
    const existing = await this.getBudget(budget.month);
    if (existing) {
      const [updated] = await db
        .update(monthlyBudgets)
        .set({ budget: budget.budget })
        .where(eq(monthlyBudgets.month, budget.month))
        .returning();
      return updated;
    }
    const [created] = await db.insert(monthlyBudgets).values(budget).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
