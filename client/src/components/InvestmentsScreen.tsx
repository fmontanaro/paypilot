import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Pencil, BarChart2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Investment } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingDown, DollarSign, List, Sparkles } from "lucide-react";

const INVESTMENT_CATEGORIES = [
  { value: "renda_fixa", label: "Renda Fixa" },
  { value: "renda_variavel", label: "Renda Variável" },
  { value: "fundo", label: "Fundo de Investimento" },
  { value: "poupanca", label: "Poupança" },
  { value: "tesouro", label: "Tesouro Direto" },
  { value: "criptomoeda", label: "Criptomoeda" },
  { value: "imovel", label: "Imóvel" },
  { value: "outros", label: "Outros" },
];

function getCategoryLabel(value: string | null): string {
  if (!value) return "Outros";
  const cat = INVESTMENT_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

export default function InvestmentsScreen() {
  const { data: investments = [], isLoading } = useQuery<Investment[]>({ queryKey: ["/api/investments"] });
  const [open, setOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const { toast } = useToast();

  const emptyForm = { name: "", amount: "", category: "renda_fixa", notes: "" };
  const [formData, setFormData] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Investimento adicionado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar o investimento", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest(`/api/investments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setOpen(false);
      resetForm();
      toast({ title: "Sucesso!", description: "Investimento atualizado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o investimento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/investments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({ title: "Sucesso!", description: "Investimento removido" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover o investimento", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingInv(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInv) {
      updateMutation.mutate({ id: editingInv.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (inv: Investment) => {
    setEditingInv(inv);
    setFormData({
      name: inv.name,
      amount: inv.amount,
      category: inv.category || "outros",
      notes: inv.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este investimento?")) {
      deleteMutation.mutate(id);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

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
        <DialogTitle>{editingInv ? "Editar Investimento" : "Novo Investimento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Tesouro Selic, CDB Banco X"
            required
            data-testid="input-investment-name"
          />
        </div>
        <div className="space-y-2">
          <Label>Valor Investido (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
            data-testid="input-investment-amount"
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger data-testid="select-investment-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVESTMENT_CATEGORIES.map((c) => (
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
            placeholder="Ex: Vence em 2026, rendimento 12% a.a."
            data-testid="input-investment-notes"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="flex-1" data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1" data-testid="button-save-investment">
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-blue-600 text-white p-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold flex-1" data-testid="text-title">
            Investimentos
          </h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-white" onClick={resetForm} data-testid="button-add-investment">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            {dialogForm}
          </Dialog>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        <Card className="bg-blue-600 border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-white/80" />
              <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">Total Investido</p>
            </div>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <span className="text-4xl font-heading font-extrabold text-white" data-testid="text-total-invested">
                {formatCurrency(totalInvested)}
              </span>
              <span className="text-sm text-white/80">{investments.length} {investments.length === 1 ? "investimento" : "investimentos"}</span>
            </div>
          </CardContent>
        </Card>

        {investments.length === 0 ? (
          <div className="text-center py-12">
            <BarChart2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Nenhum investimento cadastrado</p>
            <p className="text-sm text-muted-foreground mb-6">Adicione seus investimentos para visualizar seu patrimônio</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-add-first-investment">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Primeiro Investimento
                </Button>
              </DialogTrigger>
              {dialogForm}
            </Dialog>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {investments.map((inv) => (
                <Card key={inv.id} className="rounded-3xl border-2 border-blue-200 dark:border-blue-800" data-testid={`card-investment-${inv.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading font-bold text-lg truncate" data-testid={`text-investment-name-${inv.id}`}>{inv.name}</h3>
                          <p className="text-xs text-muted-foreground">{getCategoryLabel(inv.category)}</p>
                          {inv.notes && <p className="text-xs text-muted-foreground truncate">{inv.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xl font-heading font-extrabold text-blue-600 dark:text-blue-400" data-testid={`text-investment-amount-${inv.id}`}>
                          {formatCurrency(parseFloat(inv.amount))}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(inv)} data-testid={`button-edit-investment-${inv.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(inv.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-investment-${inv.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full h-14 rounded-3xl text-lg font-bold bg-blue-600" data-testid="button-add-investment-bottom">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Investimento
                </Button>
              </DialogTrigger>
              {dialogForm}
            </Dialog>
          </>
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
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-debts">
              <List className="w-5 h-5" />
              <span className="text-xs">Dívidas</span>
            </Button>
          </Link>
          <Link href="/incomes">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1" data-testid="nav-incomes">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">Receitas</span>
            </Button>
          </Link>
          <Link href="/investments">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-1 text-blue-600" data-testid="nav-investments">
              <BarChart2 className="w-5 h-5" />
              <span className="text-xs font-bold">Investimentos</span>
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
