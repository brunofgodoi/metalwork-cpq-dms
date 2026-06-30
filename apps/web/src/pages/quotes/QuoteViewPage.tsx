import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { QuoteLayout } from './QuoteLayout';
import { RevisionDiff } from './components/RevisionDiff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Copy,
  GitBranch,
  Trash2,
  RotateCcw,
  Send,
  CheckCircle,
  Diff,
  AlertTriangle,
} from 'lucide-react';
import { fmtBRL, toDateInput } from '@/lib/format';
import { toast } from 'sonner';
import { QuotePrintModal } from '@/components/quotes/QuotePrintModal';
import { SendModal, ApproveModal, needsSendModal } from '../QuoteModals';

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELED: 'Cancelado',
  PENDING_APPROVAL: 'Pendente Aprovação',
};

export function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<'send' | 'approve' | null>(null);
  const [diffDialog, setDiffDialog] = useState<{
    open: boolean;
    changes: any[];
    revFrom: string;
    revTo: string;
  }>({
    open: false,
    changes: [],
    revFrom: '',
    revTo: '',
  });

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const decideMutation = useMutation({
    mutationFn: async ({
      reqId,
      status,
      comments,
    }: {
      reqId: string;
      status: 'APPROVED' | 'REJECTED';
      comments?: string;
    }) => {
      const response = await api.patch(`/approvals/${reqId}/decide`, { status, comments });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
      toast.success(
        variables.status === 'APPROVED'
          ? 'Orçamento aprovado e liberado para envio!'
          : 'Orçamento recusado com sucesso.',
      );
      setIsApproveOpen(false);
      setIsRejectOpen(false);
      setRejectComments('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao registrar decisão.');
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/quotes/${id}/revision`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      toast.success('Revisão criada!');
      navigate(`/quotes/${data.id}/edit`);
    },
    onError: () => toast.error('Erro ao criar revisão.'),
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/quotes/${id}/copy`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Orçamento copiado!');
      navigate(`/quotes/${data.id}/edit`);
    },
    onError: () => toast.error('Erro ao copiar orçamento.'),
  });

  const deleteRevisionMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      await api.delete(`/quotes/revisions/${revisionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-history', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Revisão excluída!');
    },
    onError: () => toast.error('Erro ao excluir revisão.'),
  });

  const restoreRevisionMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      const { data } = await api.post(`/quotes/revisions/${revisionId}/restore`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-history', id] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Revisão restaurada!');
    },
    onError: () => toast.error('Erro ao restaurar revisão.'),
  });

  const fetchDiff = async (rev1Id: string, rev2Id: string) => {
    try {
      const { data } = await api.get('/quotes/diff', { params: { rev1: rev1Id, rev2: rev2Id } });
      setDiffDialog({
        open: true,
        changes: data.changes,
        revFrom: data.revisionFrom,
        revTo: data.revisionTo,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao carregar diferenças.');
    }
  };

  const handleExportQuoteItems = async () => {
    try {
      const response = await api.get(`/quotes/${id}/export-items`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_${quote.quoteNumber}_${quote.revision}_itens.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Itens do orçamento #${quote.quoteNumber} exportados com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar itens do orçamento.');
    }
  };

  const { data: history } = useQuery({
    queryKey: ['quote-history', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${id}/history`);
      return data;
    },
    enabled: !!id,
  });

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: minMarginConfig } = useQuery({
    queryKey: ['config', 'minimum_margin'],
    queryFn: async () => {
      const { data } = await api.get('/config/minimum_margin');
      return data;
    },
  });
  const minMargin = minMarginConfig != null ? Number(minMarginConfig.value) : 15;

  const sendMutation = useMutation({
    mutationFn: () => api.patch(`/quotes/${id}/status`, { status: 'SENT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      toast.success('Orçamento enviado!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao enviar.'),
  });

  if (isLoading) {
    return (
      <QuoteLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </QuoteLayout>
    );
  }

  if (!quote) {
    return (
      <QuoteLayout>
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Orçamento não encontrado
        </div>
      </QuoteLayout>
    );
  }

  const items = (quote.items || []).filter((i: any) => i.isActive !== false);
  const subtotal = items.reduce((sum: number, i: any) => {
    const ep = Number(i.unitPrice) * (1 - Number(i.discountPercent || 0) / 100);
    return sum + ep * Number(i.quantity);
  }, 0);
  const globalDisc = quote.discountPercent
    ? subtotal * (Number(quote.discountPercent) / 100)
    : Number(quote.discountFixed || 0);
  const finalPrice = subtotal - globalDisc;

  return (
    <QuoteLayout
      quote={quote}
      onOpenPrint={() => setIsPrintModalOpen(true)}
      onExportCsv={handleExportQuoteItems}
      onSend={
        quote.status === 'DRAFT'
          ? () => {
              if (!needsSendModal(quote, minMargin)) {
                sendMutation.mutate();
              } else {
                setActionModal('send');
              }
            }
          : undefined
      }
      onApprove={quote.status === 'SENT' ? () => setActionModal('approve') : undefined}
    >
      <div className="space-y-6 overflow-auto p-6">
        {quote.status === 'SENT' &&
          quote.validUntil &&
          (() => {
            const validUntilDate = new Date(quote.validUntil);
            const now = new Date();
            const diffTime = validUntilDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 3) {
              return (
                <Alert className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 flex items-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400 font-medium ml-2">
                    Atenção: Este orçamento enviado expirará em{' '}
                    {diffDays === 0 ? 'hoje' : `${diffDays} dia(s)`} (em{' '}
                    {validUntilDate.toLocaleDateString('pt-BR')}).
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

        {quote.status === 'PENDING_APPROVAL' &&
          (() => {
            const pendingRequest = quote.approvalRequests?.find((r: any) => r.status === 'PENDING');
            if (!pendingRequest) return null;
            return (
              <Alert className="border-amber-400 dark:border-amber-800 bg-amber-500/5 flex flex-col gap-4 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-400 text-sm">
                      Orçamento com Margem Rebaixada (
                      {Number(pendingRequest.marginProposed).toFixed(1)}%)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Solicitado por{' '}
                      <strong>{pendingRequest.requestedBy?.name || 'Estimador'}</strong> em{' '}
                      {new Date(pendingRequest.createdAt).toLocaleDateString('pt-BR')}.
                    </p>
                    <div className="bg-background/80 border border-amber-200/50 dark:border-amber-900/50 rounded p-2.5 text-xs italic font-serif mt-2 text-foreground">
                      Justificativa: "{pendingRequest.justification}"
                    </div>
                  </div>
                </div>
                {user?.role === 'ADMIN' && (
                  <div className="flex gap-2 self-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive h-8 text-xs"
                      onClick={() => setIsRejectOpen(true)}
                      disabled={decideMutation.isPending}
                    >
                      Recusar Envio
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-medium"
                      onClick={() => setIsApproveOpen(true)}
                      disabled={decideMutation.isPending}
                    >
                      Aprovar e Liberar
                    </Button>
                  </div>
                )}
              </Alert>
            );
          })()}

        <div className="flex items-center gap-4 flex-wrap">
          <Badge
            variant={
              quote.status === 'APPROVED'
                ? 'default'
                : quote.status === 'REJECTED' || quote.status === 'CANCELED'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {STATUS_MAP[quote.status] || quote.status}
          </Badge>
          <span className="text-sm text-muted-foreground">Rev. {quote.revision}</span>
          {quote.createdBy && (
            <span className="text-sm text-muted-foreground">
              Criado por: {quote.createdBy.name}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            {quote.status === 'DRAFT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!needsSendModal(quote, minMargin)) {
                    sendMutation.mutate();
                  } else {
                    setActionModal('send');
                  }
                }}
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            )}
            {quote.status === 'SENT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('approve')}
                className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={revisionMutation.isPending}
              onClick={() => revisionMutation.mutate()}
            >
              {revisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <GitBranch className="h-4 w-4 mr-1" />
              )}
              Revisar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={copyMutation.isPending}
              onClick={() => copyMutation.mutate()}
            >
              {copyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Copiar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{quote.client?.name}</p>
              {quote.contact && (
                <p className="text-sm text-muted-foreground">{quote.contact.name}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {quote.deliveryDate ? toDateInput(quote.deliveryDate) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Validade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {quote.validUntil ? toDateInput(quote.validUntil) : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Unitário</TableHead>
                  <TableHead className="text-right">Desc. %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  const ep = Number(item.unitPrice) * (1 - Number(item.discountPercent || 0) / 100);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.project || `Item ${idx + 1}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmtBRL(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtBRL(ep * item.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (base)</span>
                <span>{fmtBRL(subtotal)}</span>
              </div>
              {globalDisc > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {quote.discountPercent
                      ? `Desconto Global (${quote.discountPercent}%)`
                      : `Desconto Global`}
                  </span>
                  <span>-{fmtBRL(globalDisc)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-lg font-bold">
                <span>Preço Final</span>
                <span>{fmtBRL(finalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {quote.descriptiveText && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {quote.descriptiveText}
              </p>
            </CardContent>
          </Card>
        )}

        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {history && history.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Revisões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((rev: any, idx: number) => (
                  <div
                    key={rev.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${rev.isLatest ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Rev. {rev.revision}
                        {rev.isLatest && (
                          <Badge variant="default" className="ml-2 text-[10px] h-4 px-1">
                            Atual
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rev.createdAt).toLocaleString('pt-BR')} —{' '}
                        {rev.createdBy?.name || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status:{' '}
                        <Badge
                          variant={
                            rev.status === 'APPROVED'
                              ? 'default'
                              : rev.status === 'REJECTED' || rev.status === 'CANCELED'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-[10px] h-4 px-1"
                        >
                          {STATUS_MAP[rev.status] || rev.status}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {idx > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => fetchDiff(history[idx - 1].id, history[idx].id)}
                        >
                          <Diff className="h-3 w-3 mr-1" />
                          Diferenças
                        </Button>
                      )}
                      {!rev.isLatest && (
                        <>
                          {rev.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              disabled={deleteRevisionMutation.isPending}
                              onClick={() => deleteRevisionMutation.mutate(rev.id)}
                            >
                              {deleteRevisionMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3 mr-1" />
                              )}
                              Excluir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={restoreRevisionMutation.isPending}
                            onClick={() => restoreRevisionMutation.mutate(rev.id)}
                          >
                            {restoreRevisionMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            Restaurar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate(`/quotes/${rev.id}`)}
                          >
                            Visualizar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {actionModal === 'send' && <SendModal quote={quote} onClose={() => setActionModal(null)} />}
      {actionModal === 'approve' && (
        <ApproveModal quote={quote} onClose={() => setActionModal(null)} />
      )}
      {isApproveOpen && (
        <CustomDialog
          isOpen={true}
          onClose={() => setIsApproveOpen(false)}
          title="Aprovar e Liberar Orçamento"
          description="Deseja realmente aprovar este orçamento com margem rebaixada e liberá-lo para envio ao cliente?"
          footerActions={
            <>
              <CustomButton variant="outline" onClick={() => setIsApproveOpen(false)}>
                Cancelar
              </CustomButton>
              <CustomButton
                semantic="success"
                onClick={() => {
                  const pendingRequest = quote.approvalRequests?.find(
                    (r: any) => r.status === 'PENDING',
                  );
                  if (pendingRequest) {
                    decideMutation.mutate({
                      reqId: pendingRequest.id,
                      status: 'APPROVED',
                    });
                  } else {
                    toast.error('Solicitação de aprovação não encontrada.');
                  }
                }}
                isLoading={decideMutation.isPending}
              >
                Confirmar Aprovação
              </CustomButton>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div className="bg-secondary/30 border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{quote.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Proposta</span>
                <span className="font-medium">
                  {(() => {
                    const pendingRequest = quote.approvalRequests?.find(
                      (r: any) => r.status === 'PENDING',
                    );
                    return pendingRequest
                      ? `${Number(pendingRequest.marginProposed).toFixed(1)}%`
                      : '—';
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="font-medium">R$ {fmtBRL(finalPrice)}</span>
              </div>
            </div>
          </div>
        </CustomDialog>
      )}
      {isRejectOpen && (
        <CustomDialog
          isOpen={true}
          onClose={() => setIsRejectOpen(false)}
          title="Recusar Solicitação de Envio"
          description="Informe a justificativa ou motivo para a recusa deste orçamento."
          footerActions={
            <>
              <CustomButton variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancelar
              </CustomButton>
              <CustomButton
                semantic="destructive"
                onClick={() => {
                  if (!rejectComments.trim()) {
                    toast.error('Por favor, informe a justificativa da recusa.');
                    return;
                  }
                  const pendingRequest = quote.approvalRequests?.find(
                    (r: any) => r.status === 'PENDING',
                  );
                  if (pendingRequest) {
                    decideMutation.mutate({
                      reqId: pendingRequest.id,
                      status: 'REJECTED',
                      comments: rejectComments,
                    });
                  } else {
                    toast.error('Solicitação de aprovação não encontrada.');
                  }
                }}
                isLoading={decideMutation.isPending}
              >
                Confirmar Recusa
              </CustomButton>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Justificativa da Recusa *</label>
              <textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Ex: Margem muito baixa para este cliente, favor revisar preços dos itens..."
                className="w-full min-h-[90px] p-2.5 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>
        </CustomDialog>
      )}
      {diffDialog.open && (
        <CustomDialog
          isOpen={true}
          onClose={() => setDiffDialog({ ...diffDialog, open: false })}
          title="Diferenças entre Revisões"
          size="lg"
          footerActions={
            <CustomButton
              variant="outline"
              onClick={() => setDiffDialog({ ...diffDialog, open: false })}
            >
              Fechar
            </CustomButton>
          }
        >
          <div className="py-2">
            <RevisionDiff
              changes={diffDialog.changes}
              revFrom={diffDialog.revFrom}
              revTo={diffDialog.revTo}
            />
          </div>
        </CustomDialog>
      )}
      <QuotePrintModal
        quoteId={id || ''}
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
      />
    </QuoteLayout>
  );
}
