import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, User, Calendar, Building } from 'lucide-react';

interface ApprovalRequestItem {
  id: string;
  quoteId: string;
  requestedById: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  justification: string;
  marginProposed: string | number;
  marginMin: string | number;
  comments?: string | null;
  createdAt: string;
  quote: {
    id: string;
    quoteNumber: number;
    revision: string;
    estimatedPrice: number;
    price: number;
    client: {
      id: string;
      name: string;
    };
    category: {
      id: string;
      name: string;
    };
  };
  requestedBy: {
    name: string;
    email: string;
  };
}

function fmtBRL(val: number | string | null | undefined) {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Approvals() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestItem | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [comments, setComments] = useState('');

  const { data, isLoading } = useQuery<{
    data: ApprovalRequestItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['approvals', page],
    queryFn: async () => {
      const response = await api.get('/approvals', { params: { page, limit: 10 } });
      return response.data;
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      comments,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      comments?: string;
    }) => {
      const response = await api.patch(`/approvals/${id}/decide`, { status, comments });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      // Invalidate sidebar badge query (we should make sure sidebar counts are updated)
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });

      toast.success(
        variables.status === 'APPROVED'
          ? 'Orçamento aprovado e liberado para envio!'
          : 'Orçamento recusado com sucesso.',
      );
      setIsApproveOpen(false);
      setIsRejectOpen(false);
      setSelectedRequest(null);
      setComments('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao registrar decisão.');
    },
  });

  const handleOpenApprove = (req: ApprovalRequestItem) => {
    setSelectedRequest(req);
    setComments('');
    setIsApproveOpen(true);
  };

  const handleOpenReject = (req: ApprovalRequestItem) => {
    setSelectedRequest(req);
    setComments('');
    setIsRejectOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedRequest) return;
    decideMutation.mutate({
      id: selectedRequest.id,
      status: 'APPROVED',
      comments: comments.trim() ? comments : undefined,
    });
  };

  const handleConfirmReject = () => {
    if (!selectedRequest) return;
    if (!comments.trim()) {
      toast.error('Informe uma justificativa para a recusa.');
      return;
    }
    decideMutation.mutate({
      id: selectedRequest.id,
      status: 'REJECTED',
      comments: comments,
    });
  };

  const requests = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Fila de Aprovações</h1>
        <p className="text-muted-foreground mt-1">
          Analise e decida sobre orçamentos submetidos por estimadores com margem de lucro abaixo do
          limite de segurança.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Carregando solicitações pendentes...</span>
        </div>
      ) : requests.length === 0 ? (
        <Card className="border border-dashed py-12 text-center">
          <CardHeader className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">Tudo em dia!</CardTitle>
            <CardDescription className="max-w-sm">
              Não existem solicitações de aprovação pendentes na fila de alçada comercial.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {requests.map((req) => {
              const marginProposed = Number(req.marginProposed);
              const marginMin = Number(req.marginMin);

              // Color settings for margins
              let marginColorClass = '';
              let badgeColor = '';
              let badgeText = '';

              if (marginProposed < 0) {
                marginColorClass =
                  'text-destructive dark:text-red-400 font-bold bg-destructive/5 border-destructive/20';
                badgeColor = 'bg-destructive/10 text-destructive dark:text-red-300 border-0';
                badgeText = 'Prejuízo Crítico';
              } else if (marginProposed < marginMin) {
                marginColorClass =
                  'text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 border-amber-500/20';
                badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0';
                badgeText = 'Margem Rebaixada';
              } else {
                marginColorClass =
                  'text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5 border-emerald-500/20';
                badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0';
                badgeText = 'Margem Regular';
              }

              return (
                <Card
                  key={req.id}
                  className="border shadow-xs hover:border-slate-300/80 dark:hover:border-slate-800 transition-all overflow-hidden flex flex-col md:flex-row md:items-stretch"
                >
                  {/* Left stats bar (margin focused) */}
                  <div
                    className={`p-6 md:w-64 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r ${marginColorClass}`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        Margem Comercial
                      </span>
                      <div className="text-4xl font-extrabold tracking-tight">
                        {marginProposed.toFixed(1)}%
                      </div>
                      <Badge
                        className={`mt-1 font-semibold text-xs px-2 py-0.5 rounded-full ${badgeColor}`}
                      >
                        {badgeText}
                      </Badge>
                    </div>

                    <div className="mt-4 md:mt-0 text-xs opacity-90 space-y-1 w-full pt-4 border-t border-dashed border-current/20">
                      <div className="flex justify-between">
                        <span>Meta Mínima:</span>
                        <span className="font-semibold">{marginMin.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Preço Proposto:</span>
                        <span className="font-semibold">R$ {fmtBRL(req.quote.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo Estimado:</span>
                        <span className="font-semibold">R$ {fmtBRL(req.quote.estimatedPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right content area */}
                  <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <div>
                          <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                            Orçamento #{req.quote.quoteNumber}{' '}
                            <span className="text-xs text-muted-foreground font-normal">
                              (Rev. {req.quote.revision})
                            </span>
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Building className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">
                              {req.quote.client.name}
                            </span>
                            <span>•</span>
                            <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                              {req.quote.category?.name || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Solicitado em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Request source and justification */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            Orçamentista:{' '}
                            <strong className="text-foreground">{req.requestedBy.name}</strong> (
                            {req.requestedBy.email})
                          </span>
                        </div>

                        <div className="bg-secondary/40 border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-3 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Justificativa do Estimador
                          </p>
                          <p className="text-foreground italic leading-relaxed font-serif">
                            "{req.justification}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenReject(req)}
                        className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive gap-1.5"
                        disabled={decideMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        Recusar Orçamento
                      </Button>
                      <Button
                        onClick={() => handleOpenApprove(req)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        disabled={decideMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Aprovar e Liberar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página <strong>{page}</strong> de {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}

      {/* APPROVE CONFIRMATION DIALOG */}
      <CustomDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Aprovar Margem de Orçamento"
        description="Ao aprovar, este orçamento será ativado e colocado no status ENVIADO."
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-4 py-2">
            <div className="bg-secondary/30 rounded-lg p-3 border space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold">{selectedRequest.quote.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orçamento:</span>
                <span className="font-semibold">
                  #{selectedRequest.quote.quoteNumber} (Rev. {selectedRequest.quote.revision})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Proposta:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(selectedRequest.marginProposed).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="approve-comments">Comentários Adicionais (Opcional)</Label>
              <Textarea
                id="approve-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Insira observações que ficarão gravadas no histórico deste orçamento..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t mt-4">
              <CustomButton variant="outline" onClick={() => setIsApproveOpen(false)}>
                Cancelar
              </CustomButton>
              <CustomButton
                onClick={handleConfirmApprove}
                isLoading={decideMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ✅ Confirmar Aprovação
              </CustomButton>
            </div>
          </div>
        )}
      </CustomDialog>

      {/* REJECT DIALOG */}
      <CustomDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Recusar Margem do Orçamento"
        description="Ao recusar, este orçamento será devolvido ao status REJEITADO com o motivo informado abaixo."
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-4 py-2">
            <div className="bg-secondary/30 rounded-lg p-3 border space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold">{selectedRequest.quote.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Proposta:</span>
                <span className="font-bold text-destructive">
                  {Number(selectedRequest.marginProposed).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reject-comments" className="text-destructive font-semibold">
                Motivo da Recusa *
              </Label>
              <Textarea
                id="reject-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Indique o motivo pelo qual a margem não foi aceita (ex: margem negativa inviabiliza produção, ajustar preço de venda para pelo menos 10%...)"
                required
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t mt-4">
              <CustomButton variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancelar
              </CustomButton>
              <CustomButton
                onClick={handleConfirmReject}
                isLoading={decideMutation.isPending}
                semantic="destructive"
              >
                ❌ Confirmar Recusa
              </CustomButton>
            </div>
          </div>
        )}
      </CustomDialog>
    </div>
  );
}
