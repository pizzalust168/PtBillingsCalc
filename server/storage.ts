import {
  weeklyTotals,
  weeklyLineItems,
  type WeeklyTotal,
  type InsertWeeklyTotal,
  type WeeklyLineItem,
  type InsertWeeklyLineItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getWeeks(): Promise<WeeklyTotal[]>;
  getWeek(id: number): Promise<WeeklyTotal | undefined>;
  getWeekByDate(weekEnding: string): Promise<WeeklyTotal | undefined>;
  createWeek(week: InsertWeeklyTotal): Promise<WeeklyTotal>;
  deleteWeek(id: number): Promise<boolean>;
  createLineItems(items: InsertWeeklyLineItem[]): Promise<WeeklyLineItem[]>;
  getLineItems(weeklyTotalId: number): Promise<WeeklyLineItem[]>;
}

export class DatabaseStorage implements IStorage {
  async getWeeks(): Promise<WeeklyTotal[]> {
    return db.select().from(weeklyTotals).orderBy(desc(weeklyTotals.weekEnding));
  }

  async getWeek(id: number): Promise<WeeklyTotal | undefined> {
    const [week] = await db.select().from(weeklyTotals).where(eq(weeklyTotals.id, id));
    return week || undefined;
  }

  async getWeekByDate(weekEnding: string): Promise<WeeklyTotal | undefined> {
    const [week] = await db.select().from(weeklyTotals).where(eq(weeklyTotals.weekEnding, weekEnding));
    return week || undefined;
  }

  async createWeek(week: InsertWeeklyTotal): Promise<WeeklyTotal> {
    const [created] = await db.insert(weeklyTotals).values(week).returning();
    return created;
  }

  async deleteWeek(id: number): Promise<boolean> {
    const result = await db.delete(weeklyTotals).where(eq(weeklyTotals.id, id)).returning();
    return result.length > 0;
  }

  async createLineItems(items: InsertWeeklyLineItem[]): Promise<WeeklyLineItem[]> {
    if (items.length === 0) return [];
    return db.insert(weeklyLineItems).values(items).returning();
  }

  async getLineItems(weeklyTotalId: number): Promise<WeeklyLineItem[]> {
    return db
      .select()
      .from(weeklyLineItems)
      .where(eq(weeklyLineItems.weeklyTotalId, weeklyTotalId))
      .orderBy(weeklyLineItems.itemLabel);
  }
}

export const storage = new DatabaseStorage();
