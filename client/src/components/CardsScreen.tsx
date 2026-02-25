import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Trash2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { PaymentMethod } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CardsScreen() {
  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({ 
    queryKey: ["/api/payment-methods"] 
  });
  const [open, setOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    type: "credit",
    limit: "",
    availableLimit: "",
    closingDay: "",
    dueDay: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Cartão adicionado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o cartão",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest(`/api/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Cartão atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cartão",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/payment-methods/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({
        title: "Sucesso!",
        description: "Cartão removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o cartão",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "credit",
      limit: "",
      availableLimit: "",
      closingDay: "",
      dueDay: "",
    });
    setEditingCard(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (card: PaymentMethod) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      type: card.type,
      limit: card.limit,
      availableLimit: card.availableLimit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este cartão?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-white p-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold flex-1" data-testid="text-title">
            Meus Cartões
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-add-first">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Primeiro Cartão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCard ? "Editar Cartão" : "Adicionar Cartão"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Cartão</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Nubank, Itaú, etc"
                      required
                      data-testid="input-card-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="limit">Limite Total</Label>
                      <Input
                        id="limit"
                        type="number"
                        step="0.01"
                        value={formData.limit}
                        onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                        placeholder="0.00"
                        required
                        data-testid="input-limit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="availableLimit">Limite Disponível</Label>
                      <Input
                        id="availableLimit"
                        type="number"
                        step="0.01"
                        value={formData.availableLimit}
                        onChange={(e) => setFormData({ ...formData, availableLimit: e.target.value })}
                        placeholder="0.00"
                        required
                        data-testid="input-available-limit"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="closingDay">Dia de Fechamento</Label>
                      <Input
                        id="closingDay"
                        value={formData.closingDay}
                        onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                        placeholder="Ex: 10"
                        required
                        data-testid="input-closing-day"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDay">Dia de Vencimento</Label>
                      <Input
                        id="dueDay"
                        value={formData.dueDay}
                        onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                        placeholder="Ex: 20"
                        required
                        data-testid="input-due-day"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        resetForm();
                      }}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <>
            {paymentMethods.map((card) => (
              <Card key={card.id} className="rounded-3xl border-4 border-accent" data-testid={`card-payment-method-${card.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-xl" data-testid={`text-card-name-${card.id}`}>
                          {card.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">{card.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(card)}
                        data-testid={`button-edit-${card.id}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(card.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${card.id}`}
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Limite Disponível</p>
                      <p className="text-2xl font-heading font-extrabold text-accent" data-testid={`text-available-${card.id}`}>
                        {formatCurrency(parseFloat(card.availableLimit))}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">Limite Total</p>
                        <p className="font-bold" data-testid={`text-limit-${card.id}`}>
                          {formatCurrency(parseFloat(card.limit))}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fechamento</p>
                        <p className="font-bold">Dia {card.closingDay}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vencimento</p>
                        <p className="font-bold">Dia {card.dueDay}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full h-14 rounded-3xl text-lg font-bold shadow-xl" data-testid="button-add">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Novo Cartão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCard ? "Editar Cartão" : "Adicionar Cartão"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Cartão</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Nubank, Itaú, etc"
                      required
                      data-testid="input-card-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="limit">Limite Total</Label>
                      <Input
                        id="limit"
                        type="number"
                        step="0.01"
                        value={formData.limit}
                        onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                        placeholder="0.00"
                        required
                        data-testid="input-limit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="availableLimit">Limite Disponível</Label>
                      <Input
                        id="availableLimit"
                        type="number"
                        step="0.01"
                        value={formData.availableLimit}
                        onChange={(e) => setFormData({ ...formData, availableLimit: e.target.value })}
                        placeholder="0.00"
                        required
                        data-testid="input-available-limit"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="closingDay">Dia de Fechamento</Label>
                      <Input
                        id="closingDay"
                        value={formData.closingDay}
                        onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                        placeholder="Ex: 10"
                        required
                        data-testid="input-closing-day"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDay">Dia de Vencimento</Label>
                      <Input
                        id="dueDay"
                        value={formData.dueDay}
                        onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                        placeholder="Ex: 20"
                        required
                        data-testid="input-due-day"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        resetForm();
                      }}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="text-xs">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-debts">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-xs">Dívidas</span>
            </Button>
          </Link>
          <Link href="/incomes">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-incomes">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-xs">Receitas</span>
            </Button>
          </Link>
          <Link href="/cards">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-accent" data-testid="nav-cards">
              <CreditCard className="w-6 h-6" />
              <span className="text-xs font-bold">Cartões</span>
            </Button>
          </Link>
          <Link href="/strategy">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-strategy">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10"/>
                <path d="M12 20V4"/>
                <path d="M6 20v-6"/>
              </svg>
              <span className="text-xs">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
