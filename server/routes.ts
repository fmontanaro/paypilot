import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDebtSchema, insertPaymentMethodSchema, insertIncomeSchema, users } from "@shared/schema";
import { isAuthenticated, authStorage } from "./replit_integrations/auth";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function getUserId(req: any): string {
  const userId = req.user?.claims?.sub;
  if (!userId) throw new Error("User ID not found in claims");
  return userId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/email-signup", async (req: any, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(409).json({ error: "Este email já está cadastrado. Faça login." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `email_${nanoid(12)}`;

      const [user] = await db.insert(users).values({
        id: userId,
        email,
        firstName: name || null,
        lastName: null,
        profileImageUrl: null,
        passwordHash,
      }).returning();

      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.login(sessionUser, (err: any) => {
        if (err) {
          return res.status(500).json({ error: "Erro ao criar conta" });
        }
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch (error) {
      console.error("Email signup error:", error);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  });

  app.post("/api/auth/email-login", async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));

      if (!user) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ error: "Esta conta usa login social. Use o botão 'Continuar com Google / Replit'." });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };

      req.login(sessionUser, (err: any) => {
        if (err) {
          return res.status(500).json({ error: "Erro ao fazer login" });
        }
        res.json({ success: true, user: { id: user.id, email: user.email, firstName: user.firstName } });
      });
    } catch (error) {
      console.error("Email login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/email-logout", (req: any, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });
  });


  app.get("/api/debts", isAuthenticated, async (req, res) => {
    try {
      const debts = await storage.getDebts(getUserId(req));
      res.json(debts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debts" });
    }
  });

  app.get("/api/debts/:id", isAuthenticated, async (req, res) => {
    try {
      const debt = await storage.getDebt(req.params.id, getUserId(req));
      if (!debt) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json(debt);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debt" });
    }
  });

  app.post("/api/debts", isAuthenticated, async (req, res) => {
    try {
      const debtData = insertDebtSchema.parse({
        ...req.body,
        userId: getUserId(req),
      });
      const debt = await storage.createDebt(debtData);
      res.status(201).json(debt);
    } catch (error) {
      res.status(400).json({ error: "Invalid debt data" });
    }
  });

  app.patch("/api/debts/:id", isAuthenticated, async (req, res) => {
    try {
      const debt = await storage.updateDebt(req.params.id, getUserId(req), req.body);
      if (!debt) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json(debt);
    } catch (error) {
      res.status(400).json({ error: "Failed to update debt" });
    }
  });

  app.delete("/api/debts/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteDebt(req.params.id, getUserId(req));
      if (!success) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete debt" });
    }
  });

  app.get("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethods(getUserId(req));
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.get("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      const paymentMethod = await storage.getPaymentMethod(req.params.id, getUserId(req));
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment method" });
    }
  });

  app.post("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const paymentMethodData = insertPaymentMethodSchema.parse({
        ...req.body,
        userId: getUserId(req),
      });
      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.status(201).json(paymentMethod);
    } catch (error) {
      res.status(400).json({ error: "Invalid payment method data" });
    }
  });

  app.patch("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, getUserId(req), req.body);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      res.status(400).json({ error: "Failed to update payment method" });
    }
  });

  app.delete("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deletePaymentMethod(req.params.id, getUserId(req));
      if (!success) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  app.get("/api/incomes", isAuthenticated, async (req, res) => {
    try {
      const incomes = await storage.getIncomes(getUserId(req));
      res.json(incomes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incomes" });
    }
  });

  app.post("/api/incomes", isAuthenticated, async (req, res) => {
    try {
      const incomeData = insertIncomeSchema.parse({
        ...req.body,
        userId: getUserId(req),
      });
      const income = await storage.createIncome(incomeData);
      res.status(201).json(income);
    } catch (error) {
      res.status(400).json({ error: "Invalid income data" });
    }
  });

  app.patch("/api/incomes/:id", isAuthenticated, async (req, res) => {
    try {
      const income = await storage.updateIncome(req.params.id, getUserId(req), req.body);
      if (!income) {
        return res.status(404).json({ error: "Income not found" });
      }
      res.json(income);
    } catch (error) {
      res.status(400).json({ error: "Failed to update income" });
    }
  });

  app.delete("/api/incomes/:id", isAuthenticated, async (req, res) => {
    try {
      const success = await storage.deleteIncome(req.params.id, getUserId(req));
      if (!success) {
        return res.status(404).json({ error: "Income not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete income" });
    }
  });

  app.post("/api/strategy/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const debts = await storage.getDebts(userId);
      const paymentMethods = await storage.getPaymentMethods(userId);

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
