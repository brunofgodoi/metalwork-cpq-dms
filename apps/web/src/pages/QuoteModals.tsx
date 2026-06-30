import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED'
  | 'SUPERSEDED'
  | 'PENDING_APPROVAL';

export interface QuoteItem {
  id: string;
  quoteId: string;
  project?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discountPercent?: number;
  totalPrice?: number | null;
  process?: string | null;
  material?: string | null;
  estimatedHours?: number | null;
  cadFilePath?: string | null;
  thumbnailUrl?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: number;
  revision: string;
  isLatest: boolean;
  client: {
    id: string;
    name: string;
    cnpj?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  contact?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  category: { id: string; name: string } | null;
  status: QuoteStatus;
  descriptiveText: string;
  networkFilePath: string;
  cadFilePath?: string | null;
  thumbnailUrl?: string | null;
  estimatedPrice?: number | null;
  totalCost?: number | null;
  price?: number | null;
  contractedPrice?: number | null;
  deliveryDate?: string | null;
  validUntil?: string | null;
  rejectionReason?: string | null;
  wasProduced?: boolean | null;
  discountPercent?: number | null;
  discountFixed?: number | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: { name: string; email: string } | null;
  items?: QuoteItem[];
}

function fmtBRL(val: number | string | null | undefined) {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

function useStatusMutation(quoteId: string, onDone: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => api.patch(`/quotes/${quoteId}/status`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quote', quoteId] });
      qc.invalidateQueries({ queryKey: ['quotes', quoteId] });
      qc.invalidateQueries({ queryKey: ['quote-history', quoteId] });
      onDone();
    },
  });
}

export function needsSendModal(quote: Quote, minMargin: number) {
  if (!quote.deliveryDate) return true;
  const totalCost = quote.totalCost != null ? Number(quote.totalCost) : 0;
  const priceValue = quote.price != null ? Number(quote.price) : Number(quote.estimatedPrice || 0);
  const margin =
    priceValue > 0 && totalCost > 0 ? ((priceValue - totalCost) / priceValue) * 100 : 100;
  return margin < minMargin;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ---- Send Modal (DRAFT → SENT) ----
export function SendModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const { user } = useAuth();

  const { data: configMinMargin } = useQuery<{ key: string; value: number }>({
    queryKey: ['config', 'minimum_margin'],
    queryFn: async () => {
      const response = await api.get('/config/minimum_margin');
      return response.data;
    },
  });

  const minMargin = configMinMargin != null ? Number(configMinMargin.value) : 15;

  const [deliveryDate, setDeliveryDate] = useState(toDateInput(quote.deliveryDate));
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useStatusMutation(quote.id, onClose);

  const priceValue =
    quote.price != null
      ? Number(quote.price)
      : quote.estimatedPrice != null
        ? Number(quote.estimatedPrice)
        : 0;
  const totalCost = quote.totalCost != null ? Number(quote.totalCost) : 0;
  const proposedMargin =
    priceValue > 0 && totalCost > 0 ? ((priceValue - totalCost) / priceValue) * 100 : 0;

  const isBelowMinMargin = proposedMargin < minMargin;
  const requiresApproval = isBelowMinMargin && user?.role !== 'ADMIN';

  const handleSend = () => {
    if (!deliveryDate) {
      setError('Data de entrega é obrigatória.');
      return;
    }
    if (requiresApproval && !justification.trim()) {
      setError('A justificativa é obrigatória para margens abaixo do mínimo.');
      return;
    }
    mutation.mutate(
      {
        status: 'SENT',
        deliveryDate: new Date(deliveryDate + 'T12:00:00').toISOString(),
        justification: requiresApproval ? justification : undefined,
      },
      {
        onSuccess: () => {
          if (requiresApproval) {
            toast.success('Solicitação de aprovação enviada para a gerência!');
          } else {
            toast.success('Orçamento enviado!');
          }
        },
        onError: (e: unknown) =>
          setError(
            (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
              'Erro ao enviar.',
          ),
      },
    );
  };

  return (
    <CustomDialog
      isOpen={true}
      onClose={onClose}
      title="Enviar Orçamento"
      description={`Cliente: ${quote.client.name}${quote.category?.name ? ` · ${quote.category.name}` : ''}`}
      footerActions={
        <>
          <CustomButton variant="outline" onClick={onClose}>
            Cancelar
          </CustomButton>
          <CustomButton semantic="info" onClick={handleSend} isLoading={mutation.isPending}>
            📤{' '}
            {requiresApproval
              ? 'Solicitar Aprovação'
              : isBelowMinMargin && user?.role === 'ADMIN'
                ? 'Confirmar Envio (Auto-Aprovação)'
                : 'Confirmar Envio'}
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isBelowMinMargin && user?.role === 'ADMIN' && (
          <Alert className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <AlertDescription className="text-amber-800 dark:text-amber-300 font-medium text-xs">
              Como administrador, este envio com margem reduzida ({proposedMargin.toFixed(1)}%) será
              auto-aprovado automaticamente.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Prazo de Entrega *</Label>
          <Input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>

        {requiresApproval && (
          <div className="space-y-2 pt-4 border-t border-dashed">
            <Label className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
              ⚠️ Justificativa de Alçada Obrigatória *
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva o motivo comercial ou operacional para aplicar essa margem abaixo do mínimo de segurança (ex: cliente estratégico para volume, negociação de lote fechado)..."
              className="min-h-[90px] bg-background"
            />
          </div>
        )}
      </div>
    </CustomDialog>
  );
}

// ---- Approve Modal (SENT → APPROVED) ----
export function ApproveModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useStatusMutation(quote.id, onClose);

  const isExpired = quote.validUntil ? new Date(quote.validUntil) < new Date() : false;

  const handleApprove = () => {
    if (isExpired) return;
    mutation.mutate(
      { status: 'APPROVED' },
      {
        onSuccess: () => toast.success('Orçamento aprovado!'),
        onError: (e: unknown) =>
          setError(
            (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
              'Erro ao aprovar.',
          ),
      },
    );
  };

  return (
    <CustomDialog
      isOpen={true}
      onClose={onClose}
      title="Aprovar Orçamento"
      description="Confirme os dados antes de registrar a aprovação."
      footerActions={
        <>
          <CustomButton variant="outline" onClick={onClose}>
            Cancelar
          </CustomButton>
          <CustomButton
            semantic="success"
            onClick={handleApprove}
            isLoading={mutation.isPending}
            disabled={isExpired}
          >
            ✅ Confirmar Aprovação
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {isExpired && (
          <Alert variant="destructive">
            <AlertDescription>
              Este orçamento expirou em{' '}
              <strong>{new Date(quote.validUntil!).toLocaleDateString('pt-BR')}</strong> e não pode
              ser aprovado diretamente. Crie uma nova revisão para atualizar a validade.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="bg-secondary/30 border rounded-lg p-4 space-y-2">
          <InfoRow label="Cliente" value={quote.client.name} />
          <InfoRow label="Categoria" value={quote.category?.name || '—'} />
          <InfoRow
            label="Preço Enviado"
            value={quote.price != null ? `R$ ${fmtBRL(quote.price)}` : '—'}
          />
          <InfoRow
            label="Prazo"
            value={
              quote.deliveryDate ? new Date(quote.deliveryDate).toLocaleDateString('pt-BR') : '—'
            }
          />
        </div>
      </div>
    </CustomDialog>
  );
}

// ---- Reject Modal (SENT → REJECTED) ----
export function RejectModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useStatusMutation(quote.id, onClose);

  return (
    <CustomDialog
      isOpen={true}
      onClose={onClose}
      title="Rejeitar Orçamento"
      description={quote.client.name}
      footerActions={
        <>
          <CustomButton variant="outline" onClick={onClose}>
            Cancelar
          </CustomButton>
          <CustomButton
            semantic="destructive"
            onClick={() => {
              if (!reason.trim()) {
                setError('Informe o motivo.');
                return;
              }
              mutation.mutate(
                { status: 'REJECTED', rejectionReason: reason },
                {
                  onSuccess: () => toast.success('Orçamento rejeitado.'),
                  onError: (e: unknown) =>
                    setError(
                      (e as { response?: { data?: { message?: string } } }).response?.data
                        ?.message || 'Erro.',
                    ),
                },
              );
            }}
            isLoading={mutation.isPending}
          >
            ❌ Confirmar Rejeição
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label>Motivo da Rejeição *</Label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Prazo não atende, valor acima do esperado..."
            autoFocus
          />
        </div>
      </div>
    </CustomDialog>
  );
}

// ---- Cancel Modal (APPROVED/SENT/DRAFT → CANCELED) ----
export function CancelModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [wasProduced, setWasProduced] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useStatusMutation(quote.id, onClose);

  const handleCancel = () => {
    if (wasProduced === null) {
      setError('Por favor, informe se a peça foi produzida ou não.');
      return;
    }
    mutation.mutate(
      { status: 'CANCELED', wasProduced },
      {
        onSuccess: () => toast.success('Orçamento cancelado com sucesso!'),
        onError: (e: unknown) =>
          setError(
            (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
              'Erro ao cancelar.',
          ),
      },
    );
  };

  return (
    <CustomDialog
      isOpen={true}
      onClose={onClose}
      title="Cancelar Orçamento"
      description={`Cliente: ${quote.client.name}${quote.category?.name ? ` · ${quote.category.name}` : ''}`}
      footerActions={
        <>
          <CustomButton variant="outline" onClick={onClose}>
            Voltar
          </CustomButton>
          <CustomButton
            semantic="destructive"
            onClick={handleCancel}
            isLoading={mutation.isPending}
          >
            Confirmar Cancelamento
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">A peça foi produzida?</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setWasProduced(true);
                setError(null);
              }}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-lg border-2 text-sm font-medium transition-all',
                wasProduced === true
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-muted bg-transparent hover:bg-muted/10 text-muted-foreground',
              )}
            >
              <span className="text-lg mb-1">🛠️ Sim</span>
              <span className="text-xs text-muted-foreground font-normal">
                A peça foi fabricada
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWasProduced(false);
                setError(null);
              }}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-lg border-2 text-sm font-medium transition-all',
                wasProduced === false
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-muted bg-transparent hover:bg-muted/10 text-muted-foreground',
              )}
            >
              <span className="text-lg mb-1">❌ Não</span>
              <span className="text-xs text-muted-foreground font-normal">
                Nenhuma fabricação iniciada
              </span>
            </button>
          </div>
        </div>
      </div>
    </CustomDialog>
  );
}
