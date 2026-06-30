import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';
import { type Quote } from './QuoteModals';

interface CompanyConfig {
  companyName: string;
  document: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  footer: string | null;
}

export function QuotePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paymentCondition, setPaymentCondition] = useState('Faturamento em 30 dias f.m.');
  const [proposalValidity, setProposalValidity] = useState('10 dias a partir da data de emissão');
  const [deliveryTerm, setDeliveryTerm] = useState('');

  const { data: companyConfig } = useQuery<CompanyConfig>({
    queryKey: ['company-config'],
    queryFn: async () => (await api.get('/config/company')).data,
  });

  const {
    data: quote,
    isLoading,
    error,
  } = useQuery<Quote>({
    queryKey: ['quote', id],
    queryFn: async () => (await api.get(`/quotes/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (quote) {
      if (quote.deliveryDate) {
        const dateStr = new Date(quote.deliveryDate).toLocaleDateString('pt-BR');
        setDeliveryTerm(`${dateStr} (sujeito a confirmação no fechamento)`);
      } else {
        setDeliveryTerm('A combinar');
      }

      if (quote.validUntil) {
        const dateStr = new Date(quote.validUntil).toLocaleDateString('pt-BR');
        setProposalValidity(`Válido até ${dateStr}`);
      } else {
        setProposalValidity('10 dias a partir da data de emissão');
      }
    }
  }, [quote]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">
          Carregando proposta comercial...
        </span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 gap-4">
        <span className="text-red-500 font-semibold">
          Erro ao carregar orçamento para impressão.
        </span>
        <Button onClick={() => navigate('/quotes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950/20 text-slate-900 py-6 print:py-0 print:bg-white print:text-black">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            margin: 12mm 15mm !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />
      <div className="max-w-4xl mx-auto mb-6 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotes')}
            className="h-9 px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Visualização de Proposta comercial #{quote.quoteNumber} (v{quote.revision})
          </span>
        </div>

        <Button onClick={handlePrint} size="sm" className="h-9 px-4 gap-2">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto mb-6 px-4 print:hidden">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
          <span className="text-base mt-0.5">💡</span>
          <div>
            <p className="font-semibold">Dica de Edição</p>
            <p className="text-xs mt-0.5">
              Você pode clicar diretamente nos campos pontilhados de{' '}
              <strong>Forma de Pagamento</strong>, <strong>Prazo de Entrega</strong> e{' '}
              <strong>Validade da Proposta</strong> no papel abaixo para personalizá-los antes de
              gerar o PDF.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white text-black p-8 md:p-12 border border-slate-200 shadow-lg print:shadow-none print:border-none print:p-0 min-h-[297mm] flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {companyConfig?.companyName || 'METALÚRGICA ALFA S.A.'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {companyConfig?.address || 'Endereço não cadastrado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {companyConfig?.document ? `CNPJ: ${companyConfig.document}` : ''}
                {companyConfig?.phone ? ` | Tel: ${companyConfig.phone}` : ''}
              </p>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-lg font-bold text-slate-700">PROPOSTA COMERCIAL</h2>
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-slate-800">Orçamento:</span> #
                  {quote.quoteNumber} (v{quote.revision})
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Data de Emissão:</span>{' '}
                  {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Validade:</span>{' '}
                  {quote.validUntil
                    ? new Date(quote.validUntil).toLocaleDateString('pt-BR')
                    : new Date(
                        new Date(quote.createdAt).getTime() + 10 * 24 * 60 * 60 * 1000,
                      ).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 print:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Cliente
              </h3>
              <p className="text-sm font-bold text-slate-900">{quote.client.name}</p>
              {quote.client.cnpj && (
                <p className="text-xs text-slate-500 mt-1">CNPJ: {quote.client.cnpj}</p>
              )}
              {quote.client.address && (
                <p className="text-xs text-slate-500">{quote.client.address}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contato / Faturamento
              </h3>
              {quote.contact ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{quote.contact.name}</p>
                  {quote.contact.email && (
                    <p className="text-xs text-slate-500 mt-0.5">E-mail: {quote.contact.email}</p>
                  )}
                  {quote.contact.phone && (
                    <p className="text-xs text-slate-500">Tel: {quote.contact.phone}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">Contato geral da empresa</p>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Descrição dos Itens / Escopo Técnico
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                      <th className="py-2.5 px-4 w-[60px]">Item</th>
                      <th className="py-2.5 px-4">Projeto / Descrição</th>
                      <th className="py-2.5 px-4 w-[100px]">Categoria</th>
                      <th className="py-2.5 px-4 w-[80px] text-right">Qtd</th>
                      <th className="py-2.5 px-4 w-[110px] text-right">Preço Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item: any, idx: number) => {
                      const ep =
                        Number(item.unitPrice) * (1 - Number(item.discountPercent || 0) / 100);
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900 whitespace-pre-wrap">
                              {item.project || item.description}
                            </p>
                            {item.description && item.project !== item.description && (
                              <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600">
                            {quote.category?.name || ''}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900">
                            {formatCurrency(ep * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <div className="w-[300px] border border-slate-200 rounded-lg bg-slate-50/50 p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal dos Serviços:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {globalDisc > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    Desconto{quote.discountPercent ? ` (${quote.discountPercent}%)` : ''}:
                  </span>
                  <span>-{formatCurrency(globalDisc)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>VALOR TOTAL PROPOSTA:</span>
                <span>{formatCurrency(finalPrice)}</span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Observações
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Condições Gerais de Venda
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Forma de Pagamento:</span>
                <input
                  type="text"
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value)}
                  className="w-full text-slate-900 border border-dashed border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-slate-500 focus:ring-0 print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Prazo de Entrega:</span>
                <input
                  type="text"
                  value={deliveryTerm}
                  onChange={(e) => setDeliveryTerm(e.target.value)}
                  className="w-full text-slate-900 border border-dashed border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-slate-500 focus:ring-0 print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <span className="font-bold text-slate-700 block">Validade desta Proposta:</span>
                <input
                  type="text"
                  value={proposalValidity}
                  onChange={(e) => setProposalValidity(e.target.value)}
                  className="w-full text-slate-900 border border-dashed border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-slate-500 focus:ring-0 print:border-none print:p-0 print:bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-16 mt-12 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-2">
            <div className="border-t border-slate-400 w-[200px] mx-auto pt-2" />
            <p className="font-bold text-slate-800">Metalúrgica Alfa S.A.</p>
            <p className="text-slate-500">Depto. Comercial / Estimador</p>
          </div>
          <div className="space-y-2">
            <div className="border-t border-slate-400 w-[200px] mx-auto pt-2" />
            <p className="font-bold text-slate-800">{quote.client.name}</p>
            <p className="text-slate-500">Aceito de Proposta / Assinatura e Data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
