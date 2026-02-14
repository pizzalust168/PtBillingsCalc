import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { LINE_ITEMS, computeTotals, saveWeekSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/weeks", async (_req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  app.get("/api/weeks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid week ID" });
      }

      const week = await storage.getWeek(id);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      const items = await storage.getLineItems(id);
      res.json({ week, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch week details" });
    }
  });

  app.post("/api/weeks", async (req, res) => {
    try {
      const parsed = saveWeekSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { weekEnding, counts } = parsed.data;

      const existing = await storage.getWeekByDate(weekEnding);
      if (existing) {
        return res.status(409).json({
          message: "That week ending already exists in the log. Choose a different date or delete the existing entry.",
        });
      }

      const totals = computeTotals(counts);
      const createdAt = new Date().toISOString();

      const week = await storage.createWeek({
        weekEnding,
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
        count: counts[item.key] || 0,
      }));

      await storage.createLineItems(lineItems);

      res.status(201).json(week);
    } catch (error) {
      res.status(500).json({ message: "Failed to save week" });
    }
  });

  app.delete("/api/weeks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid week ID" });
      }

      const deleted = await storage.deleteWeek(id);
      if (!deleted) {
        return res.status(404).json({ message: "Week not found" });
      }

      res.json({ message: "Week deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete week" });
    }
  });

  return httpServer;
}
