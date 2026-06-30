import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { ClientForm } from './forms/ClientForm';
import { ContactForm } from './forms/ContactForm';
import { CategoryForm } from './forms/CategoryForm';

// ---- Quick Create Client Modal ----
interface QuickCreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function QuickCreateClientModal({
  isOpen,
  onClose,
  onCreated,
}: QuickCreateClientModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/clients', data);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente cadastrado com sucesso!');
      onCreated(res.data.id);
      onClose();
    } catch (e: unknown) {
      const apiError = e as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Erro ao cadastrar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[55vw] sm:h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente Rápido</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <ClientForm
            onSubmit={handleSave}
            isPending={loading}
            onCancel={onClose}
            contactHeight="210px"
            submitLabel="Salvar"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Create Contact Modal ----
interface QuickCreateContactModalProps {
  isOpen: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function QuickCreateContactModal({
  isOpen,
  clientId,
  onClose,
  onCreated,
}: QuickCreateContactModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/clients/${clientId}/contacts`, data);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Contato cadastrado com sucesso!');
      onCreated(res.data.id);
      onClose();
    } catch (e: unknown) {
      const apiError = e as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Erro ao cadastrar contato.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Contato Rápido</DialogTitle>
          <DialogDescription>Cadastre as informações básicas do novo contato.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <ContactForm
            onSubmit={handleSave}
            isPending={loading}
            onCancel={onClose}
            submitLabel="Salvar"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Quick Create Category Modal ----
interface QuickCreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function QuickCreateCategoryModal({
  isOpen,
  onClose,
  onCreated,
}: QuickCreateCategoryModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/categories', data);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria cadastrada com sucesso!');
      onCreated(res.data.id);
      onClose();
    } catch (e: unknown) {
      const apiError = e as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Erro ao cadastrar categoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria Rápida</DialogTitle>
          <DialogDescription>Cadastre as informações básicas da nova categoria.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <CategoryForm
            onSubmit={handleSave}
            isPending={loading}
            onCancel={onClose}
            submitLabel="Salvar"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
