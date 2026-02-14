import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { LINE_ITEMS, computeTotals, saveDaySchema, getMonday, getSunday } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/days", async (_req, res) => {
    try {
      const days = await storage.getDays();
      res.json(days);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch days" });
    }
  });

  app.get("/api/days/export/all", async (_req, res) => {
    try {
      const days = await storage.getDays();

      const rows: string[] = [];
      rows.push("Date,Work Week (Mon-Sun),Item,Minutes per Item,Base Amount,BBI Amount,Count,Subtotal,Total Minutes,Total Hours,Prelim with BBI,Prelim without BBI,Loading (6.25%),Total Billings");

      for (const day of days) {
        const monday = getMonday(day.date);
        const sunday = getSunday(monday);
        const weekLabel = `${monday} to ${sunday}`;
        const items = await storage.getLineItems(day.id);
        for (const item of items) {
          if (item.count > 0) {
            const subtotal = item.count * (item.baseAmount + item.bbiAmount);
            rows.push([
              day.date,
              `"${weekLabel}"`,
              `"${item.itemLabel}"`,
              item.minutesPerItem,
              item.baseAmount.toFixed(2),
              item.bbiAmount.toFixed(2),
              item.count,
              subtotal.toFixed(2),
              day.totalMinutes,
              day.totalHours,
              day.prelimWithBbi.toFixed(2),
              day.prelimWithoutBbi.toFixed(2),
              day.loading625.toFixed(2),
              day.totalBillings.toFixed(2),
            ].join(","));
          }
        }
      }

      const csv = rows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="billings_all_days.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  app.get("/api/days/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid day ID" });
      }

      const day = await storage.getDay(id);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const items = await storage.getLineItems(id);
      res.json({ day, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch day details" });
    }
  });

  app.get("/api/days/:id/csv", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid day ID" });
      }

      const day = await storage.getDay(id);
      if (!day) {
        return res.status(404).json({ message: "Day not found" });
      }

      const items = await storage.getLineItems(id);

      const rows: string[] = [];
      rows.push("Date,Item,Minutes per Item,Base Amount,BBI Amount,Count,Subtotal");
      for (const item of items) {
        if (item.count > 0) {
          const subtotal = item.count * (item.baseAmount + item.bbiAmount);
          rows.push([
            day.date,
            `"${item.itemLabel}"`,
            item.minutesPerItem,
            item.baseAmount.toFixed(2),
            item.bbiAmount.toFixed(2),
            item.count,
            subtotal.toFixed(2),
          ].join(","));
        }
      }
      rows.push("");
      rows.push(`Summary`);
      rows.push(`Total Minutes,${day.totalMinutes}`);
      rows.push(`Total Hours,${day.totalHours}`);
      rows.push(`Prelim with BBI,${day.prelimWithBbi.toFixed(2)}`);
      rows.push(`Prelim without BBI,${day.prelimWithoutBbi.toFixed(2)}`);
      rows.push(`Loading (6.25%),${day.loading625.toFixed(2)}`);
      rows.push(`Total Billings,${day.totalBillings.toFixed(2)}`);

      const csv = rows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="billings_${day.date}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export day" });
    }
  });

  app.post("/api/days", async (req, res) => {
    try {
      const parsed = saveDaySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { date, counts } = parsed.data;

      const existing = await storage.getDayByDate(date);
      if (existing) {
        return res.status(409).json({
          message: "That date already exists in the log. Choose a different date or delete the existing entry.",
        });
      }

      const totals = computeTotals(counts);
      const createdAt = new Date().toISOString();

      const day = await storage.createDay({
        date,
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
        count: counts[item.key] || 0,
      }));

      await storage.createLineItems(lineItems);

      res.status(201).json(day);
    } catch (error) {
      res.status(500).json({ message: "Failed to save day" });
    }
  });

  app.delete("/api/days/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid day ID" });
      }

      const deleted = await storage.deleteDay(id);
      if (!deleted) {
        return res.status(404).json({ message: "Day not found" });
      }

      res.json({ message: "Day deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete day" });
    }
  });

  return httpServer;
}
