import { type Debt, type InsertDebt, type PaymentMethod, type InsertPaymentMethod, type Income, type InsertIncome, type Investment, type InsertInvestment } from "@shared/schema";
import { db } from "./db";
import { debts, paymentMethods, incomes, investments } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getDebts(userId: string): Promise<Debt[]>;
  getDebt(id: string, userId: string): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: string, userId: string, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: string, userId: string): Promise<boolean>;

  getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string, userId: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, userId: string, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string, userId: string): Promise<boolean>;

  getIncomes(userId: string): Promise<Income[]>;
  getIncome(id: string, userId: string): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: string, userId: string, income: Partial<InsertIncome>): Promise<Income | undefined>;
  deleteIncome(id: string, userId: string): Promise<boolean>;

  getInvestments(userId: string): Promise<Investment[]>;
  getInvestment(id: string, userId: string): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, userId: string, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: string, userId: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getDebts(userId: string): Promise<Debt[]> {
    return await db.select().from(debts).where(eq(debts.userId, userId)).orderBy(desc(debts.dueDate));
  }

  async getDebt(id: string, userId: string): Promise<Debt | undefined> {
    const result = await db.select().from(debts).where(and(eq(debts.id, id), eq(debts.userId, userId))).limit(1);
    return result[0];
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const result = await db.insert(debts).values(debt).returning();
    return result[0];
  }

  async updateDebt(id: string, userId: string, debt: Partial<InsertDebt>): Promise<Debt | undefined> {
    const result = await db.update(debts).set(debt).where(and(eq(debts.id, id), eq(debts.userId, userId))).returning();
    return result[0];
  }

  async deleteDebt(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId))).returning();
    return result.length > 0;
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.userId, userId)).orderBy(desc(paymentMethods.createdAt));
  }

  async getPaymentMethod(id: string, userId: string): Promise<PaymentMethod | undefined> {
    const result = await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId))).limit(1);
    return result[0];
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const result = await db.insert(paymentMethods).values(paymentMethod).returning();
    return result[0];
  }

  async updatePaymentMethod(id: string, userId: string, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const result = await db.update(paymentMethods).set(paymentMethod).where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId))).returning();
    return result[0];
  }

  async deletePaymentMethod(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId))).returning();
    return result.length > 0;
  }

  async getIncomes(userId: string): Promise<Income[]> {
    return await db.select().from(incomes).where(eq(incomes.userId, userId)).orderBy(desc(incomes.createdAt));
  }

  async getIncome(id: string, userId: string): Promise<Income | undefined> {
    const result = await db.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).limit(1);
    return result[0];
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    const result = await db.insert(incomes).values(income).returning();
    return result[0];
  }

  async updateIncome(id: string, userId: string, income: Partial<InsertIncome>): Promise<Income | undefined> {
    const result = await db.update(incomes).set(income).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).returning();
    return result[0];
  }

  async deleteIncome(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).returning();
    return result.length > 0;
  }

  async getInvestments(userId: string): Promise<Investment[]> {
    return await db.select().from(investments).where(eq(investments.userId, userId)).orderBy(desc(investments.createdAt));
  }

  async getInvestment(id: string, userId: string): Promise<Investment | undefined> {
    const result = await db.select().from(investments).where(and(eq(investments.id, id), eq(investments.userId, userId))).limit(1);
    return result[0];
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const result = await db.insert(investments).values(investment).returning();
    return result[0];
  }

  async updateInvestment(id: string, userId: string, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const result = await db.update(investments).set(investment).where(and(eq(investments.id, id), eq(investments.userId, userId))).returning();
    return result[0];
  }

  async deleteInvestment(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(investments).where(and(eq(investments.id, id), eq(investments.userId, userId))).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
