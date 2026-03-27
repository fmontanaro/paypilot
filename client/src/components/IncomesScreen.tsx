import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Trash2, ArrowLeft, Pencil, RefreshCw, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Income } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingDown, BarChart2, Sparkles, List } from "lucide-react";

const INCOME_CATEGORIES = [
  { value: "salario", label: "Salário" },
  { value: "freelance", label: "Freelance" },
  { value: "investimentos", label: "Investimentos" },
  { value: "aluguel", label: "Aluguel" },
  { value: "bonus", label: "Bônus" },
  { value: "outros", label: "Outros" },
];

function getCategoryLabel(value: string | null): string {
  if (!value) return "Outros";
  const cat = INCOME_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

function getCategoryIcon(value: string | null) {
  switch (value) {
    case "salario": return DollarSign;
    case "freelance": return Wallet;
    case "investimentos": return TrendingDown;
    case "aluguel": return Wallet;
    case "bonus": return DollarSign;
    default: return DollarSign;
  }
}

function IncomeForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isPending,
  isEditing,
}: {
  formData: { name: string; amount: string; category: string; isRecurring: boolean };
  setFormData: (data: typeof formData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  isEditing: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="income-name">Descrição</Label>
        <Input
          id="income-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Salário, Freelance, Aluguel"
          required
          data-testid="input-income-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="income-amount">Valor Mensal (R$)</Label>
        <Input
          id="income-amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
          required
          data-testid="input-income-amount"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="income-category">Categoria</Label>
        <Select
          value={formData.category}
          onValueChange={(val) => setFormData({ ...formData, category: val })}
        >
          <SelectTrigger data-testid="select-income-category">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {INCOME_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={formData.isRecurring}
          onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.isRecurring ? "bg-green-500" : "bg-gray-300"
          }`}
          data-testid="toggle-recurring"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.isRecurring ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <Label className="cursor-pointer" onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}>
          Receita recorrente (todo mês)
        </Label>
      </div>
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          data-testid="button-cancel"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1"
          data-testid="button-save-income"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export default function IncomesScreen() {
  const { data: incomes = [], isLoading } = useQuery<Income[]>({
    queryKey: ["/api/incomes"],
  });
  const [open, setOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "salario",
    isRecurring: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Receita adicionada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar a receita", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest(`/api/incomes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Receita atualizada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a receita", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/incomes/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      toast({ title: "Sucesso!", description: "Receita removida" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover a receita", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", amount: "", category: "salario", isRecurring: true });
    setEditingIncome(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIncome) {
      updateMutation.mutate({ id: editingIncome.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      name: income.name,
      amount: income.amount,
      category: income.category || "outros",
      isRecurring: income.isRecurring,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover esta receita?")) {
      deleteMutation.mutate(id);
    }
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const recurringCount = incomes.filter((inc) => inc.isRecurring).length;

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

  const dialogContent = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editingIncome ? "Editar Receita" : "Adicionar Receita"}</DialogTitle>
      </DialogHeader>
      <IncomeForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={() => { setOpen(false); resetForm(); }}
        isPending={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingIncome}
      />
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-green-600 text-white p-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold flex-1" data-testid="text-title">
            Receitas
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        <Card className="bg-green-600 border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-white/80" />
              <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Receita Mensal Total</p>
            </div>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <span className="text-4xl font-heading font-extrabold text-white" data-testid="text-total-income">
                {formatCurrency(totalIncome)}
              </span>
              <span className="text-sm text-white/80 font-medium">
                {incomes.length} {incomes.length === 1 ? "fonte" : "fontes"}
                {recurringCount > 0 && ` (${recurringCount} recorrente${recurringCount > 1 ? "s" : ""})`}
              </span>
            </div>
          </CardContent>
        </Card>

        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Nenhuma receita cadastrada</p>
            <p className="text-sm text-muted-foreground mb-6">
              Adicione suas fontes de renda para consolidar sua posição financeira
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-add-first-income">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Primeira Receita
                </Button>
              </DialogTrigger>
              {dialogContent}
            </Dialog>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {incomes.map((income) => {
                const IconComp = getCategoryIcon(income.category);
                return (
                  <Card
                    key={income.id}
                    className="rounded-3xl border-2 border-green-200 dark:border-green-800"
                    data-testid={`card-income-${income.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                            <IconComp className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading font-bold text-lg truncate" data-testid={`text-income-name-${income.id}`}>
                              {income.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">{getCategoryLabel(income.category)}</span>
                              {income.isRecurring && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                  <RefreshCw className="w-3 h-3" />
                                  Recorrente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xl font-heading font-extrabold text-green-600 dark:text-green-400" data-testid={`text-income-amount-${income.id}`}>
                            {formatCurrency(parseFloat(income.amount))}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(income)}
                            data-testid={`button-edit-income-${income.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(income.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-income-${income.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="w-full h-14 rounded-3xl text-lg font-bold shadow-xl bg-green-600"
                  data-testid="button-add-income"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Nova Receita
                </Button>
              </DialogTrigger>
              {dialogContent}
            </Dialog>
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-dashboard">
              <TrendingDown className="w-5 h-5" />
              <span className="text-xs">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-debts">
              <List className="w-5 h-5" />
              <span className="text-xs">Dívidas</span>
            </Button>
          </Link>
          <Link href="/incomes">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-green-600" data-testid="nav-incomes">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-bold">Receitas</span>
            </Button>
          </Link>
          <Link href="/investments">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-investments">
              <BarChart2 className="w-5 h-5" />
              <span className="text-xs">Investimentos</span>
            </Button>
          </Link>
          <Link href="/strategy">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-strategy">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
