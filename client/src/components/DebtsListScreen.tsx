import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, TrendingDown, Trash2, Pencil, Calendar, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Debt } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, List, Sparkles, BarChart2 } from "lucide-react";

const DEBT_CATEGORIES = [
  { value: "cartao", label: "Cartão de Crédito" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "cheque_especial", label: "Cheque Especial" },
  { value: "outros", label: "Outros" },
];

function getCategoryLabel(value: string | null): string {
  if (!value) return "Outros";
  const cat = DEBT_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

export default function DebtsListScreen() {
  const { data: debts = [], isLoading } = useQuery<Debt[]>({ queryKey: ["/api/debts"] });
  const [open, setOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const { toast } = useToast();

  const emptyForm = {
    name: "",
    totalAmount: "",
    paidAmount: "0",
    dueDate: "",
    category: "cartao",
    notes: "",
    isPaid: false,
  };
  const [formData, setFormData] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Dívida adicionada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar a dívida", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Dívida atualizada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a dívida", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/debts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      toast({ title: "Sucesso!", description: "Dívida removida" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover a dívida", variant: "destructive" });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      return await apiRequest(`/api/debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingDebt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      name: debt.name,
      totalAmount: debt.totalAmount,
      paidAmount: debt.paidAmount,
      dueDate: debt.dueDate,
      category: debt.category || "cartao",
      notes: debt.notes || "",
      isPaid: debt.isPaid,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta dívida?")) {
      deleteMutation.mutate(id);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + (parseFloat(d.totalAmount) - parseFloat(d.paidAmount)), 0);
  const activeDebts = debts.filter((d) => !d.isPaid);
  const paidDebts = debts.filter((d) => d.isPaid);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const dialogForm = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingDebt ? "Editar Dívida" : "Nova Dívida"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Cartão Nubank, Empréstimo"
            required
            data-testid="input-debt-name"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="0.00"
              required
              data-testid="input-total-amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Já paguei (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
              placeholder="0.00"
              data-testid="input-paid-amount"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Data de Vencimento</Label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            data-testid="input-due-date"
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger data-testid="select-debt-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEBT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ex: Parcelado em 12x"
            data-testid="input-notes"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="flex-1" data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1" data-testid="button-save-debt">
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-red-500 text-white p-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold flex-1" data-testid="text-page-title">
            Minhas Dívidas
          </h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-white" onClick={resetForm} data-testid="button-add-debt">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            {dialogForm}
          </Dialog>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        <Card className="bg-red-500 border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-white/80" />
              <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Total em Aberto</p>
            </div>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <span className="text-4xl font-heading font-extrabold text-white" data-testid="text-total-debt">
                {formatCurrency(totalDebt)}
              </span>
              <span className="text-sm text-white/80">{activeDebts.length} {activeDebts.length === 1 ? "dívida" : "dívidas"} ativas</span>
            </div>
          </CardContent>
        </Card>

        {debts.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Nenhuma dívida cadastrada</p>
            <p className="text-sm text-muted-foreground mb-6">Adicione suas dívidas para acompanhar o progresso</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-add-first-debt">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Primeira Dívida
                </Button>
              </DialogTrigger>
              {dialogForm}
            </Dialog>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDebts.length > 0 && (
              <>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Em aberto</p>
                {activeDebts.map((debt) => {
                  const remaining = parseFloat(debt.totalAmount) - parseFloat(debt.paidAmount);
                  const progress = parseFloat(debt.totalAmount) > 0 ? (parseFloat(debt.paidAmount) / parseFloat(debt.totalAmount)) * 100 : 0;
                  const dueDate = new Date(debt.dueDate + "T00:00:00");
                  const isOverdue = dueDate < new Date() && !debt.isPaid;
                  return (
                    <Card key={debt.id} className={`rounded-3xl border-2 ${isOverdue ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-700"}`} data-testid={`card-debt-${debt.id}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-lg truncate" data-testid={`text-debt-name-${debt.id}`}>{debt.name}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">{getCategoryLabel(debt.category)}</span>
                              {isOverdue && <span className="text-xs text-red-500 font-bold">Atrasada</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => togglePaidMutation.mutate({ id: debt.id, isPaid: true })} title="Marcar como paga" data-testid={`button-toggle-paid-${debt.id}`}>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(debt)} data-testid={`button-edit-debt-${debt.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(debt.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-debt-${debt.id}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-2xl font-heading font-extrabold text-red-500" data-testid={`text-remaining-${debt.id}`}>
                            {formatCurrency(remaining)}
                          </span>
                          <span className="text-sm text-muted-foreground">de {formatCurrency(parseFloat(debt.totalAmount))}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                          <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span data-testid={`text-duedate-${debt.id}`}>Vence em {formatDate(debt.dueDate)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}

            {paidDebts.length > 0 && (
              <>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mt-2">Pagas</p>
                {paidDebts.map((debt) => (
                  <Card key={debt.id} className="rounded-3xl border-2 border-green-200 dark:border-green-900 opacity-70" data-testid={`card-debt-${debt.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold truncate line-through text-muted-foreground">{debt.name}</h3>
                          <span className="text-xs text-green-600 font-bold">Paga</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => togglePaidMutation.mutate({ id: debt.id, isPaid: false })} title="Marcar como não paga" data-testid={`button-toggle-paid-${debt.id}`}>
                            <CheckCircle className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(debt.id)} data-testid={`button-delete-debt-${debt.id}`}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full h-14 rounded-3xl text-lg font-bold bg-red-500" data-testid="button-add-debt-bottom">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Nova Dívida
                </Button>
              </DialogTrigger>
              {dialogForm}
            </Dialog>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-dashboard">
              <TrendingDown className="w-5 h-5" />
              <span className="text-xs">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-red-500" data-testid="nav-debts">
              <List className="w-5 h-5" />
              <span className="text-xs font-bold">Dívidas</span>
            </Button>
          </Link>
          <Link href="/incomes">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-incomes">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">Receitas</span>
            </Button>
          </Link>
          <Link href="/investments">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-investments">
              <BarChart2 className="w-5 h-5" />
              <span className="text-xs">Investimentos</span>
            </Button>
          </Link>
          <Link href="/strategy">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-strategy">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
