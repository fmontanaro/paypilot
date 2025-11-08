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

  app.post("/api/strategy/generate", async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const debts = await storage.getDebts(req.user.id);
      const paymentMethods = await storage.getPaymentMethods(req.user.id);

      if (debts.length === 0) {
        return res.json({
          strategy: "Você não possui dívidas cadastradas no momento. Adicione suas dívidas para receber uma estratégia personalizada de pagamento.",
          recommendations: [],
        });
      }

      const totalDebt = debts.reduce((sum, debt) => sum + (parseFloat(debt.totalAmount) - parseFloat(debt.paidAmount)), 0);
      const totalAvailableLimit = paymentMethods.reduce((sum, pm) => sum + parseFloat(pm.availableLimit), 0);

      const openai = await import("openai");
      const client = new openai.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const debtsList = debts
        .map((d, i) => `${i + 1}. ${d.name}: R$ ${(parseFloat(d.totalAmount) - parseFloat(d.paidAmount)).toFixed(2)} (vencimento: ${d.dueDate})`)
        .join("\n");

      const cardsList = paymentMethods
        .map((pm, i) => `${i + 1}. ${pm.name}: Limite disponível R$ ${parseFloat(pm.availableLimit).toFixed(2)} (vence dia ${pm.dueDay})`)
        .join("\n");

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um assistente financeiro especializado em estratégias de pagamento de dívidas. Seja direto, prático e use linguagem casual e amigável como o Duolingo. Use emojis moderadamente para deixar a mensagem mais leve.",
          },
          {
            role: "user",
            content: `Analise minha situação financeira e crie uma estratégia de pagamento:

DÍVIDAS:
${debtsList}

CARTÕES DISPONÍVEIS:
${cardsList}

Total de dívidas: R$ ${totalDebt.toFixed(2)}
Limite disponível total: R$ ${totalAvailableLimit.toFixed(2)}

Me dê uma estratégia clara e prática de como pagar essas dívidas, priorizando as que vencem primeiro e otimizando o uso dos limites disponíveis. Inclua dicas de economia e motivação.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const strategy = completion.choices[0]?.message?.content || "Não foi possível gerar uma estratégia no momento.";

      res.json({
        strategy,
        totalDebt,
        totalAvailableLimit,
        debtsCount: debts.length,
        cardsCount: paymentMethods.length,
      });
    } catch (error) {
      console.error("Strategy generation error:", error);
      res.status(500).json({ error: "Failed to generate strategy" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
