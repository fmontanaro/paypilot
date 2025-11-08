import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDebtSchema, insertPaymentMethodSchema } from "@shared/schema";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/debts", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const debts = await storage.getDebts(req.user.id);
      res.json(debts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debts" });
    }
  });

  app.get("/api/debts/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const debt = await storage.getDebt(req.params.id, req.user.id);
      if (!debt) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json(debt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debt" });
    }
  });

  app.post("/api/debts", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const debtData = insertDebtSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const debt = await storage.createDebt(debtData);
      res.status(201).json(debt);
    } catch (error) {
      res.status(400).json({ error: "Invalid debt data" });
    }
  });

  app.patch("/api/debts/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const debt = await storage.updateDebt(req.params.id, req.user.id, req.body);
      if (!debt) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json(debt);
    } catch (error) {
      res.status(400).json({ error: "Failed to update debt" });
    }
  });

  app.delete("/api/debts/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const success = await storage.deleteDebt(req.params.id, req.user.id);
      if (!success) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete debt" });
    }
  });

  app.get("/api/payment-methods", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const paymentMethods = await storage.getPaymentMethods(req.user.id);
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.get("/api/payment-methods/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const paymentMethod = await storage.getPaymentMethod(req.params.id, req.user.id);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment method" });
    }
  });

  app.post("/api/payment-methods", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const paymentMethodData = insertPaymentMethodSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.status(201).json(paymentMethod);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment method data" });
    }
  });

  app.patch("/api/payment-methods/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, req.user.id, req.body);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      res.status(400).json({ error: "Failed to update payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const success = await storage.deletePaymentMethod(req.params.id, req.user.id);
      if (!success) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  app.get("/api/user", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json(req.user);
  });

  const httpServer = createServer(app);

  return httpServer;
}
