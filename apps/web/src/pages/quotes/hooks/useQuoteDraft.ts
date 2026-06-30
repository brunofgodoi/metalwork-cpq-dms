import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface DraftItem {
  id: string;
  project: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discountPercent: number;
  process: string | null;
  material: string | null;
  estimatedHours: number | null;
  drawingId?: string | null;
  drawingVersion?: number | null;
  drawingRef: string | null;
  thumbnailUrl: string | null;
  notes: string | null;
  sortOrder: number;
  isNew?: boolean;
  isDirty?: boolean;
  cadFile?: File | null;
}

interface DraftState {
  clientId: string;
  clientName: string;
  contactId: string | null;
  categoryId: string | null;
  descriptiveText: string;
  notes: string;
  deliveryDate: string;
  validUntil: string;
  discountPercent: number | null;
  discountFixed: number | null;
  items: DraftItem[];
  deletedItemIds: string[];
  isDirty: boolean;
}

type DraftAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'ADD_ITEM'; item: DraftItem }
  | { type: 'UPDATE_ITEM'; id: string; data: Partial<DraftItem> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'REORDER_ITEMS'; items: DraftItem[] }
  | { type: 'LOAD_QUOTE'; data: any }
  | { type: 'RESET' };

const emptyState: DraftState = {
  clientId: '',
  clientName: '',
  contactId: null,
  categoryId: null,
  descriptiveText: '',
  notes: '',
  deliveryDate: '',
  validUntil: '',
  discountPercent: null,
  discountFixed: null,
  items: [],
  deletedItemIds: [],
  isDirty: false,
};

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, isDirty: true };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item], isDirty: true };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, ...action.data, isDirty: i.isNew || true } : i,
        ),
        isDirty: true,
      };
    case 'REMOVE_ITEM': {
      const isTemp = action.id.startsWith('temp-');
      const deletedItemIds = isTemp ? state.deletedItemIds : [...state.deletedItemIds, action.id];
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        deletedItemIds,
        isDirty: true,
      };
    }
    case 'REORDER_ITEMS':
      return { ...state, items: action.items, isDirty: true };
    case 'LOAD_QUOTE':
      return {
        ...normalizeQuote(action.data, (action as any).marginPercent, (action as any).roundingRule),
        isDirty: false,
      };
    case 'RESET':
      return emptyState;
    default:
      return state;
  }
}

function normalizeQuote(
  quote: any,
  marginPercent: number = DEFAULT_MARGIN,
  roundingRule: string = 'NONE',
): DraftState {
  return {
    clientId: quote.client?.id || '',
    clientName: quote.client?.name || '',
    contactId: quote.contact?.id || null,
    categoryId: quote.category?.id || null,
    descriptiveText: quote.descriptiveText || '',
    notes: quote.notes || '',
    deliveryDate: quote.deliveryDate ? quote.deliveryDate.substring(0, 10) : '',
    validUntil: quote.validUntil ? quote.validUntil.substring(0, 10) : '',
    discountPercent: quote.discountPercent ? Number(quote.discountPercent) : null,
    discountFixed: quote.discountFixed ? Number(quote.discountFixed) : null,
    items: (quote.items || [])
      .filter((i: any) => i.isActive !== false)
      .map((i: any, idx: number) => ({
        id: i.id,
        project: i.project || '',
        description: i.description || '',
        quantity: i.quantity || 1,
        unitCost: Number(i.unitCost || 0),
        unitPrice: Number(
          i.unitPrice ||
            (i.unitCost > 0 ? calcUnitPrice(Number(i.unitCost), marginPercent, roundingRule) : 0),
        ),
        discountPercent: Number(i.discountPercent || 0),
        process: i.process || null,
        material: i.material || null,
        estimatedHours: i.estimatedHours ? Number(i.estimatedHours) : null,
        drawingId: i.drawingId || null,
        drawingVersion: i.drawingVersion ? Number(i.drawingVersion) : null,
        drawingRef: i.drawingRef || null,
        thumbnailUrl: i.thumbnailUrl || null,
        notes: i.notes || null,
        sortOrder: i.sortOrder ?? idx,
        isNew: false,
        isDirty: false,
        cadFile: null,
      })),
    deletedItemIds: [],
    isDirty: false,
  };
}

const DEFAULT_MARGIN = 30;

function applyRoundingRule(price: number, rule: string): number {
  if (price <= 0) return 0;
  switch (rule) {
    case 'UP_50_CENTS':
      return Math.ceil(price * 2) / 2;
    case 'UP_1_REAL':
      return Math.ceil(price);
    case 'UP_10_REAIS':
      return Math.ceil(price / 10) * 10;
    case 'NEAREST_50_CENTS':
      return Math.round(price * 2) / 2;
    case 'NEAREST_1_REAL':
      return Math.round(price);
    case 'NEAREST_10_REAIS':
      return Math.round(price / 10) * 10;
    default:
      return Number(price.toFixed(2));
  }
}

function calcUnitPrice(
  unitCost: number,
  marginPercent: number,
  roundingRule: string = 'NONE',
): number {
  if (unitCost <= 0 || marginPercent <= 0) return unitCost;
  if (marginPercent >= 100) return unitCost;
  const rawPrice = unitCost / (1 - marginPercent / 100);
  return applyRoundingRule(rawPrice, roundingRule);
}

export function getChangedFields(originalQuote: any, currentState: DraftState) {
  const changes: { field: string; from: any; to: any }[] = [];

  const origDiscountPercent = originalQuote.discountPercent
    ? Number(originalQuote.discountPercent)
    : null;
  if (origDiscountPercent !== currentState.discountPercent) {
    changes.push({
      field: 'discountPercent',
      from: origDiscountPercent,
      to: currentState.discountPercent,
    });
  }

  const origDiscountFixed = originalQuote.discountFixed
    ? Number(originalQuote.discountFixed)
    : null;
  if (origDiscountFixed !== currentState.discountFixed) {
    changes.push({
      field: 'discountFixed',
      from: origDiscountFixed,
      to: currentState.discountFixed,
    });
  }

  if (originalQuote.deliveryDate) {
    const origDate = originalQuote.deliveryDate.substring(0, 10);
    if (origDate !== currentState.deliveryDate) {
      changes.push({ field: 'deliveryDate', from: origDate, to: currentState.deliveryDate });
    }
  }

  if (originalQuote.validUntil) {
    const origDate = originalQuote.validUntil.substring(0, 10);
    if (origDate !== currentState.validUntil) {
      changes.push({ field: 'validUntil', from: origDate, to: currentState.validUntil });
    }
  }

  const originalItems = (originalQuote.items || []).filter((i: any) => i.isActive !== false);

  for (const item of currentState.items) {
    const origItem = originalItems.find((i: any) => i.id === item.id);
    if (!origItem) continue;

    if (Number(origItem.unitPrice) !== item.unitPrice) {
      changes.push({
        field: `Preço unit. - ${item.project || item.description}`,
        from: Number(origItem.unitPrice),
        to: item.unitPrice,
      });
    }
    if (Number(origItem.discountPercent || 0) !== item.discountPercent) {
      changes.push({
        field: `Desconto (%) - ${item.project || item.description}`,
        from: Number(origItem.discountPercent || 0),
        to: item.discountPercent,
      });
    }
    if (Number(origItem.quantity) !== item.quantity) {
      changes.push({
        field: `Quantidade - ${item.project || item.description}`,
        from: Number(origItem.quantity),
        to: item.quantity,
      });
    }
  }

  return changes;
}

export function useQuoteDraft(quoteId?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(draftReducer, emptyState);

  const { data: marginConfig } = useQuery({
    queryKey: ['config', 'default_markup_margin'],
    queryFn: async () => {
      const { data } = await api.get('/config/default_markup_margin');
      return data;
    },
  });
  const marginPercent = marginConfig?.value != null ? Number(marginConfig.value) : DEFAULT_MARGIN;

  const { data: minMarginConfig } = useQuery({
    queryKey: ['config', 'minimum_margin'],
    queryFn: async () => {
      const { data } = await api.get('/config/minimum_margin');
      return data;
    },
    enabled: !!quoteId,
  });
  const minimumMargin = minMarginConfig?.value != null ? Number(minMarginConfig.value) : 15;

  const { data: roundingConfig } = useQuery({
    queryKey: ['config', 'price_rounding_rule'],
    queryFn: async () => {
      const { data } = await api.get('/config/price_rounding_rule');
      return data;
    },
  });
  const roundingRule = roundingConfig?.value != null ? String(roundingConfig.value) : 'NONE';

  const quoteQuery = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${quoteId}`);
      return data;
    },
    enabled: !!quoteId,
  });

  const itemsQuery = useQuery({
    queryKey: ['quote-items', quoteId],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${quoteId}/items`);
      return data;
    },
    enabled: !!quoteId,
  });

  useEffect(() => {
    if (quoteQuery.data) {
      dispatch({
        type: 'LOAD_QUOTE',
        data: quoteQuery.data,
        marginPercent,
        roundingRule,
      } as any);
    }
  }, [quoteQuery.data, marginPercent, roundingRule]);

  const isLoading = (!!quoteId && quoteQuery.isLoading) || (!!quoteId && itemsQuery.isLoading);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentQuoteId = quoteId;
      const deliveryDateIso = state.deliveryDate
        ? new Date(state.deliveryDate + 'T12:00:00').toISOString()
        : null;
      const validUntilIso = state.validUntil
        ? new Date(state.validUntil + 'T12:00:00').toISOString()
        : null;

      const payload = {
        clientId: state.clientId,
        contactId: state.contactId || null,
        categoryId: state.categoryId,
        descriptiveText: state.descriptiveText,
        notes: state.notes,
        deliveryDate: deliveryDateIso,
        validUntil: validUntilIso,
        discountPercent: state.discountPercent,
        discountFixed: state.discountFixed,
      };

      if (currentQuoteId) {
        await api.patch(`/quotes/${currentQuoteId}`, payload);
      } else {
        const { data } = await api.post('/quotes', payload);
        currentQuoteId = data.id;
      }

      if (!currentQuoteId) {
        throw new Error('Falha ao salvar orçamento');
      }

      // Delete items
      for (const itemId of state.deletedItemIds) {
        await api.delete(`/quotes/${currentQuoteId}/items/${itemId}`);
      }

      // Create or update items
      for (const item of state.items) {
        let itemId = item.id;
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

        if (item.id.startsWith('temp-')) {
          const { data: createdItem } = await api.post(
            `/quotes/${currentQuoteId}/items`,
            itemPayload,
          );
          itemId = createdItem.id;
        } else if (item.isDirty) {
          await api.put(`/quotes/${currentQuoteId}/items/${item.id}`, itemPayload);
        }

        // Upload CAD file if present in memory
        if (item.cadFile) {
          const formData = new FormData();
          formData.append('cadFile', item.cadFile);
          await api.post(`/quotes/${currentQuoteId}/items/${itemId}/cad`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }
      }

      return currentQuoteId;
    },
    onSuccess: (newQuoteId) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (quoteId) {
        queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      }
      toast.success(quoteId ? 'Orçamento atualizado' : 'Orçamento criado');

      if (!quoteId && newQuoteId) {
        navigate(`/quotes/${newQuoteId}/edit`);
      } else {
        dispatch({ type: 'RESET' });
        if (quoteQuery.data) {
          dispatch({ type: 'LOAD_QUOTE', data: quoteQuery.data });
        }
      }
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Erro ao salvar orçamento';
      toast.error(errMsg);
    },
  });

  const subtotal = useMemo(() => {
    return state.items.reduce((sum, item) => {
      const effectivePrice = item.unitPrice * (1 - item.discountPercent / 100);
      return sum + effectivePrice * item.quantity;
    }, 0);
  }, [state.items]);

  const totalCost = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  }, [state.items]);

  const globalDiscount = useMemo(() => {
    if (state.discountPercent) return subtotal * (state.discountPercent / 100);
    if (state.discountFixed) return state.discountFixed;
    return 0;
  }, [subtotal, state.discountPercent, state.discountFixed]);

  const finalPrice = subtotal - globalDiscount;
  const totalMargin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;

  return {
    state,
    dispatch,
    isLoading,
    query: quoteQuery,
    saveMutation,
    minimumMargin,
    computed: { subtotal, totalCost, globalDiscount, finalPrice, totalMargin },
    addItem: useCallback(
      (item: Partial<DraftItem>) => {
        const unitCost = item.unitCost || 0;
        const unitPrice =
          item.unitPrice ||
          (unitCost > 0 ? calcUnitPrice(unitCost, marginPercent, roundingRule) : 0);
        const newItem: DraftItem = {
          id: `temp-${Date.now()}`,
          project: item.project || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitCost,
          unitPrice,
          discountPercent: item.discountPercent || 0,
          process: item.process || null,
          material: item.material || null,
          estimatedHours: item.estimatedHours || null,
          drawingId: item.drawingId || null,
          drawingVersion: item.drawingVersion || null,
          drawingRef: item.drawingRef || null,
          thumbnailUrl: item.thumbnailUrl || null,
          notes: item.notes || null,
          sortOrder: item.sortOrder ?? 0,
          isNew: true,
          isDirty: true,
          cadFile: item.cadFile || null,
        };
        dispatch({ type: 'ADD_ITEM', item: newItem });
        return newItem.id;
      },
      [dispatch, marginPercent, roundingRule],
    ),
    loadQuote: useCallback(
      (data: any) => {
        dispatch({ type: 'LOAD_QUOTE', data });
      },
      [dispatch],
    ),
  };
}
