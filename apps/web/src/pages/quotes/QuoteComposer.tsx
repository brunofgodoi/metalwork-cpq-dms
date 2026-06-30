import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteDraft, getChangedFields } from './hooks/useQuoteDraft';
import { QuoteLayout } from './QuoteLayout';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { QuoteItemRow } from './components/QuoteItemRow';
import { RevisionDiff } from './components/RevisionDiff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { CustomButton } from '@/components/ui/custom-button';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SendModal, needsSendModal } from '../QuoteModals';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Save,
  Library,
  UserPlus,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { fmtBRL, pct } from '@/lib/format';
import { toast } from 'sonner';
import { QuickCreateClientModal, QuickCreateContactModal } from '@/components/QuickCreateModals';

interface QuoteComposerProps {
  quoteId?: string;
}

export function QuoteComposer({ quoteId }: QuoteComposerProps) {
  const {
    state,
    dispatch,
    saveMutation,
    computed,
    addItem,
    isLoading,
    minimumMargin,
    query: quoteQuery,
  } = useQuoteDraft(quoteId);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [showAutoRevision, setShowAutoRevision] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{ field: string; from: any; to: any }[]>([]);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!quoteId || !state.isDirty || saveMutation.isPending) return;
    if (quoteQuery.data?.status !== 'DRAFT') return;

    const timer = setTimeout(async () => {
      try {
        await saveMutation.mutateAsync();
      } catch (e) {
        console.error('Auto-save error:', e);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [state, quoteId, quoteQuery.data?.status, saveMutation]);

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'select'],
    queryFn: async () => {
      const { data } = await api.get('/clients?limit=500&isActive=true');
      return data.data || [];
    },
  });

  const clients = clientsData ?? [];

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', state.clientId],
    queryFn: async () => {
      if (!state.clientId) return [];
      const { data } = await api.get(`/clients/${state.clientId}?showInactiveContacts=true`);
      return data.contacts || [];
    },
    enabled: !!state.clientId,
  });
  const contacts = contactsData ?? [];

  const contactOptions = contacts
    .filter((c: any) => c.isActive !== false)
    .map((c: any) => ({ value: c.id, label: c.name }));

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'select'],
    queryFn: async () => {
      const { data } = await api.get('/categories?limit=500&isActive=true');
      return data.data || [];
    },
  });

  const categories = categoriesData ?? [];

  const { data: drawingsData, isLoading: isLoadingDrawings } = useQuery({
    queryKey: ['standard-drawings', 'limit100'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/standard-drawings?limit=100');
      return data.data || [];
    },
  });

  const drawings = drawingsData ?? [];
  const filteredDrawings =
    typeFilter === 'ALL' ? drawings : drawings.filter((d: any) => d.type === typeFilter);

  const clientOptions = clients.map((c: any) => ({
    value: c.id,
    label: c.name,
  }));

  const parents = categories.filter((c: any) => !c.parentId);
  const subs = categories.filter((c: any) => c.parentId);

  const categoryOptions: { value: string; label: string }[] = [];
  parents.forEach((parent: any) => {
    categoryOptions.push({
      value: parent.id,
      label: parent.name,
    });
    subs
      .filter((sub: any) => sub.parentId === parent.id)
      .forEach((child: any) => {
        categoryOptions.push({
          value: child.id,
          label: `${parent.name} ➔ ${child.name}`,
        });
      });
  });

  subs.forEach((child: any) => {
    if (!categoryOptions.some((c) => c.value === child.id)) {
      const parentName = parents.find((p: any) => p.id === child.parentId)?.name || '';
      categoryOptions.push({
        value: child.id,
        label: parentName ? `${parentName} ➔ ${child.name}` : child.name,
      });
    }
  });

  const selectedItem = selectedItemId ? state.items.find((i) => i.id === selectedItemId) : null;

  const handleSelectDrawing = async (drawing: any) => {
    try {
      const { data: fullDrawing } = await api.get(`/catalog/standard-drawings/${drawing.id}`);
      const latestVersion = fullDrawing.versions?.[0];

      const specs = fullDrawing.specs || {};
      const id = addItem({
        project: drawing.name,
        description: drawing.name + (drawing.description ? ` - ${drawing.description}` : ''),
        quantity: 1,
        unitPrice: 0,
        unitCost: Number(drawing.basePrice || 0),
        process: specs.process || fullDrawing.category?.name || null,
        material: specs.material || null,
        drawingId: drawing.id,
        drawingVersion: latestVersion?.version || null,
        drawingRef: latestVersion?.filePath || null,
        thumbnailUrl: drawing.thumbnail || null,
      });
      setSelectedItemId(id);
      toast.success(`Desenho ${drawing.code} adicionado!`);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do desenho padrão.');
    }
  };

  const handleSave = async () => {
    if (!state.clientId) {
      toast.error('Selecione um cliente antes de salvar.');
      return;
    }
    const original = quoteQuery.data;
    if (original && quoteId && (original.status === 'SENT' || original.status === 'APPROVED')) {
      const changedFields = getChangedFields(original, state);
      if (changedFields.length > 0) {
        setPendingChanges(changedFields);
        setShowAutoRevision(true);
        return;
      }
    }
    await saveMutation.mutateAsync();
  };

  const handleConfirmRevision = async () => {
    if (!quoteId) return;
    setIsCreatingRevision(true);
    try {
      const { data: newRev } = await api.post(`/quotes/${quoteId}/revision`);
      const deliveryDateIso = state.deliveryDate
        ? new Date(state.deliveryDate + 'T12:00:00').toISOString()
        : null;
      const validUntilIso = state.validUntil
        ? new Date(state.validUntil + 'T12:00:00').toISOString()
        : null;

      const oldItems = await api.get(`/quotes/${newRev.id}`);
      for (const oldItem of oldItems.data.items || []) {
        await api.delete(`/quotes/${newRev.id}/items/${oldItem.id}`);
      }

      for (const item of state.items) {
        const itemPayload = {
          project: item.project || item.description,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          unitCost: item.unitCost,
          process: item.process,
          material: item.material,
          estimatedHours: item.estimatedHours,
          drawingId: item.drawingId || null,
          drawingVersion: item.drawingVersion || null,
          drawingRef: item.drawingRef || null,
          thumbnailUrl: item.thumbnailUrl || null,
          notes: item.notes,
        };

        await api.post(`/quotes/${newRev.id}/items`, itemPayload);
      }

      const snapshot = {
        price: computed.finalPrice,
        estimatedPrice:
          newRev.estimatedPrice != null
            ? Number(newRev.estimatedPrice)
            : quoteQuery.data?.estimatedPrice != null
              ? Number(quoteQuery.data.estimatedPrice)
              : computed.subtotal,
        discountPercent: state.discountPercent,
        discountFixed: state.discountFixed,
        deliveryDate: deliveryDateIso,
        validUntil: validUntilIso,
        totalCost: computed.totalCost,
        items: state.items.map((i) => ({
          unitPrice: i.unitPrice,
          unitCost: i.unitCost,
          discountPercent: i.discountPercent,
          quantity: i.quantity,
        })),
      };

      await api.patch(`/quotes/${newRev.id}`, {
        clientId: state.clientId,
        contactId: state.contactId || null,
        categoryId: state.categoryId,
        descriptiveText: state.descriptiveText,
        notes: state.notes,
        deliveryDate: deliveryDateIso,
        validUntil: validUntilIso,
        discountPercent: state.discountPercent,
        discountFixed: state.discountFixed,
        snapshot,
      });

      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast.success('Nova revisão criada com as alterações!');
      navigate(`/quotes/${newRev.id}/edit`);
    } catch (err) {
      const errMsg = (err as any)?.response?.data?.message || 'Erro ao criar revisão.';
      toast.error(errMsg);
    } finally {
      setIsCreatingRevision(false);
      setShowAutoRevision(false);
    }
  };

  const sendMutation = useMutation({
    mutationFn: () => api.patch(`/quotes/${quoteId}/status`, { status: 'SENT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast.success('Orçamento enviado!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao enviar.'),
  });

  const handleSendClick = async () => {
    await saveMutation.mutateAsync();
    const q = quoteQuery.data;
    if (q && !needsSendModal(q, minimumMargin)) {
      sendMutation.mutate();
    } else if (q) {
      setSendModalOpen(true);
    }
  };

  useKeyboardShortcuts({
    'Ctrl+S': handleSave,
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

  return (
    <QuoteLayout>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4 border-b px-6 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const id = addItem({
                project: 'Novo Item',
                description: '',
                quantity: 1,
                unitPrice: 0,
              });
              setSelectedItemId(id);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Custom
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(!isLibraryOpen)}>
            <Library className="mr-2 h-4 w-4" />
            Catálogo
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Base: <strong className="text-foreground">{fmtBRL(computed.subtotal)}</strong>
            </span>
            <span className="text-muted-foreground">
              Desc.: <strong className="text-foreground">{fmtBRL(computed.globalDiscount)}</strong>
            </span>
            <span className="text-lg font-bold text-primary">
              Final: {fmtBRL(computed.finalPrice)}
            </span>
            <span
              className={`font-medium ${computed.totalMargin < 15 ? 'text-destructive' : 'text-green-600'}`}
            >
              {pct(computed.totalMargin)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs mr-2">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-blue-500">Salvando...</span>
              </>
            ) : state.isDirty ? (
              <>
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500 font-medium">Alterações pendentes (Ctrl+S)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Salvo no banco</span>
              </>
            )}
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {isLibraryOpen && (
            <aside className="w-72 shrink-0 border-r p-4 overflow-y-auto max-h-[calc(100vh-290px)]">
              <h3 className="mb-3 font-medium">Desenhos Padrão</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Clique em um desenho para adicionar ao orçamento.
              </p>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full mb-3 h-8 text-xs">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  <SelectItem value="PRODUCT">Produto</SelectItem>
                  <SelectItem value="HELPER">Auxiliar (CAD)</SelectItem>
                </SelectContent>
              </Select>
              {isLoadingDrawings ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
              ) : drawings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum desenho cadastrado.
                </p>
              ) : filteredDrawings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum item encontrado para este tipo.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDrawings.map((drawing: any) => (
                    <div
                      key={drawing.id}
                      onClick={() => handleSelectDrawing(drawing)}
                      className="group flex items-start gap-2.5 rounded-lg border p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      {drawing.thumbnail ? (
                        <img
                          src={
                            drawing.thumbnail.startsWith('http')
                              ? drawing.thumbnail
                              : `${api.defaults.baseURL?.replace('/api', '') || ''}${drawing.thumbnail}`
                          }
                          alt={drawing.name}
                          className="h-12 w-12 rounded object-cover border shrink-0 bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="55" font-size="10" text-anchor="middle" fill="%239ca3af">Sem Foto</text></svg>';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs text-muted-foreground">CAD</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {drawing.code}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {drawing.name}
                        </p>
                        <Badge
                          variant={drawing.type === 'PRODUCT' ? 'default' : 'secondary'}
                          className="mt-1 text-[10px] px-1.5 py-0"
                        >
                          {drawing.type === 'PRODUCT' ? 'Produto' : 'Auxiliar (CAD)'}
                        </Badge>
                        {drawing.basePrice && (
                          <p className="text-xs font-bold text-primary mt-1">
                            {fmtBRL(Number(drawing.basePrice))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="grid gap-4 border-b p-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <Label className="text-xs">Cliente *</Label>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <Combobox
                      value={clientOptions.find((o: any) => o.value === state.clientId) || null}
                      onValueChange={(val: any) => {
                        if (val) {
                          dispatch({ type: 'SET_FIELD', field: 'clientId', value: val.value });
                          dispatch({ type: 'SET_FIELD', field: 'clientName', value: val.label });
                          dispatch({ type: 'SET_FIELD', field: 'contactId', value: null });
                        } else {
                          dispatch({ type: 'SET_FIELD', field: 'clientId', value: '' });
                          dispatch({ type: 'SET_FIELD', field: 'clientName', value: '' });
                          dispatch({ type: 'SET_FIELD', field: 'contactId', value: null });
                        }
                      }}
                      items={clientOptions}
                    >
                      <ComboboxInput placeholder="Buscar cliente..." className="w-full" />
                      <ComboboxContent>
                        <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                        <ComboboxList>
                          {clientOptions.map((opt: any) => (
                            <ComboboxItem key={opt.value} value={opt}>
                              {opt.label}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setIsQuickClientOpen(true)}
                    title="Novo cliente rápido"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contato</Label>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <Combobox
                      value={contactOptions.find((o: any) => o.value === state.contactId) || null}
                      onValueChange={(val: any) =>
                        dispatch({
                          type: 'SET_FIELD',
                          field: 'contactId',
                          value: val ? val.value : null,
                        })
                      }
                      items={contactOptions}
                    >
                      <ComboboxInput placeholder="Selecione..." className="w-full" />
                      <ComboboxContent>
                        <ComboboxEmpty>Nenhum contato.</ComboboxEmpty>
                        <ComboboxList>
                          {contactOptions.map((opt: any) => (
                            <ComboboxItem key={opt.value} value={opt}>
                              {opt.label}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!state.clientId}
                    onClick={() => setIsQuickContactOpen(true)}
                    title="Novo contato rápido"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input
                  placeholder="Opcional"
                  value={state.descriptiveText}
                  onChange={(e) =>
                    dispatch({ type: 'SET_FIELD', field: 'descriptiveText', value: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data Entrega</Label>
                <Input
                  type="date"
                  value={state.deliveryDate}
                  onChange={(e) =>
                    dispatch({ type: 'SET_FIELD', field: 'deliveryDate', value: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Validade</Label>
                <Input
                  type="date"
                  value={state.validUntil}
                  onChange={(e) =>
                    dispatch({ type: 'SET_FIELD', field: 'validUntil', value: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Desc. Final %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={state.discountPercent ?? ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'discountPercent',
                      value: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="overflow-x-auto w-full">
                <table className="w-full table-fixed min-w-[800px]">
                  <colgroup>
                    <col style={{ width: '40px' }} />
                    <col />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '50px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-2 py-2 font-medium text-center">#</th>
                      <th className="px-2 py-2 font-medium">Projeto</th>
                      <th className="px-2 py-2 font-medium text-right">Qtd</th>
                      <th className="px-2 py-2 font-medium text-right">Unitário</th>
                      <th className="px-2 py-2 font-medium text-right">Desc. %</th>
                      <th className="px-2 py-2 font-medium text-right">Total</th>
                      <th className="px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.items.map((item, idx) => (
                      <QuoteItemRow
                        key={item.id}
                        item={item}
                        index={idx}
                        isSelected={selectedItemId === item.id}
                        onSelect={() => setSelectedItemId(item.id)}
                        onUpdate={(data) => dispatch({ type: 'UPDATE_ITEM', id: item.id, data })}
                        onRemove={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
                      />
                    ))}
                    {state.items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          Nenhum item adicionado. Clique em "Add Custom" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedItem && (
            <aside className="w-80 flex-shrink-0 border-l overflow-hidden">
              <div className="h-full">
                <ItemDetailPanel
                  item={selectedItem}
                  onUpdate={(data) => dispatch({ type: 'UPDATE_ITEM', id: selectedItem.id, data })}
                  onClose={() => setSelectedItemId(null)}
                />
              </div>
            </aside>
          )}
        </div>

        {quoteQuery.data?.status === 'DRAFT' && computed.totalMargin < minimumMargin && (
          <div className="px-6 py-2">
            <Alert className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 py-2 text-sm">
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Margem abaixo do mínimo — o envio exigirá aprovação gerencial
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
          <span className="text-muted-foreground">
            {state.items.length} item(ns) | Custo total: {fmtBRL(computed.totalCost)}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">{fmtBRL(computed.finalPrice)}</span>
            <span
              className={`text-xs font-medium ${computed.totalMargin < 15 ? 'text-destructive' : 'text-green-600'}`}
            >
              margem {pct(computed.totalMargin)}
            </span>
            {quoteQuery.data?.status === 'DRAFT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendClick}
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            )}
          </div>
        </div>
      </div>
      <QuickCreateClientModal
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          const newClient = clientsData?.find((c: any) => c.id === id);
          if (newClient) {
            dispatch({ type: 'SET_FIELD', field: 'clientId', value: newClient.id });
            dispatch({ type: 'SET_FIELD', field: 'clientName', value: newClient.name });
          }
        }}
      />

      <QuickCreateContactModal
        isOpen={isQuickContactOpen}
        clientId={state.clientId}
        onClose={() => setIsQuickContactOpen(false)}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ['contacts', state.clientId] });
          dispatch({ type: 'SET_FIELD', field: 'contactId', value: id });
        }}
      />
      {sendModalOpen && quoteQuery.data && (
        <SendModal quote={quoteQuery.data} onClose={() => setSendModalOpen(false)} />
      )}
      {showAutoRevision && (
        <CustomDialog
          isOpen={true}
          onClose={() => setShowAutoRevision(false)}
          title="Nova Revisão Necessária"
          description={`O orçamento está ${quoteQuery.data?.status === 'SENT' ? 'Enviado' : 'Aprovado'}. As alterações detectadas gerarão uma nova revisão.`}
          size="lg"
          footerActions={
            <>
              <CustomButton variant="outline" onClick={() => setShowAutoRevision(false)}>
                Cancelar
              </CustomButton>
              <CustomButton
                semantic="info"
                onClick={handleConfirmRevision}
                isLoading={isCreatingRevision}
              >
                Criar Revisão
              </CustomButton>
            </>
          }
        >
          <div className="py-2">
            <RevisionDiff
              changes={pendingChanges}
              revFrom={quoteQuery.data?.revision || ''}
              revTo=""
            />
          </div>
        </CustomDialog>
      )}
    </QuoteLayout>
  );
}
