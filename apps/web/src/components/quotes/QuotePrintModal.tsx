import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ArrowLeft } from 'lucide-react';
import { QuotePrintContent } from './QuotePrintContent';

interface QuotePrintModalProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotePrintModal({ quoteId, open, onOpenChange }: QuotePrintModalProps) {
  const [paymentCondition, setPaymentCondition] = useState('Faturamento em 30 dias f.m.');
  const [proposalValidity, setProposalValidity] = useState('10 dias a partir da data de emissão');
  const [deliveryTerm, setDeliveryTerm] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: companyConfig } = useQuery({
    queryKey: ['company-config'],
    queryFn: async () => (await api.get('/config/company')).data,
  });

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote-modal', quoteId],
    queryFn: async () => (await api.get(`/quotes/${quoteId}`)).data,
    enabled: !!quoteId && open,
  });

  useEffect(() => {
    if (companyConfig?.footer !== undefined) {
      setAdditionalInfo(companyConfig.footer || '');
    }
  }, [companyConfig]);

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

  const handlePrint = () => {
    const el = contentRef.current;
    const root = document.getElementById('root');
    if (el) {
      el.style.overflow = 'visible';
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
      el.style.padding = '0';
      el.style.backgroundColor = 'white';
    }
    if (root) root.style.display = 'none';
    requestAnimationFrame(() => {
      window.print();
      if (el) {
        el.style.overflow = '';
        el.style.height = '';
        el.style.maxHeight = '';
        el.style.padding = '';
        el.style.backgroundColor = '';
      }
      if (root) root.style.display = '';
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 sm:max-w-[95vw] print:!relative print:!top-0 print:!left-0 print:!translate-x-0 print:!translate-y-0 print:!h-auto print:!max-h-none print:!overflow-visible print:!max-w-none print:!rounded-none"
      >
        <DialogTitle className="sr-only">
          {quote ? `Imprimir Proposta #${quote.quoteNumber}` : 'Imprimir Proposta'}
        </DialogTitle>
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">
              {quote ? `Proposta #${quote.quoteNumber} (v${quote.revision})` : ''}
            </span>
          </div>
          <Button onClick={handlePrint} size="sm" className="h-8 px-4 gap-2">
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quote ? (
            <div className="mx-auto bg-white text-black p-8 md:p-12 border shadow-sm min-h-[297mm] print:shadow-none print:border-none print:p-4 print:w-full print:max-w-none print:min-h-0">
              <QuotePrintContent
                quote={quote}
                companyConfig={companyConfig}
                paymentCondition={paymentCondition}
                setPaymentCondition={setPaymentCondition}
                proposalValidity={proposalValidity}
                setProposalValidity={setProposalValidity}
                deliveryTerm={deliveryTerm}
                setDeliveryTerm={setDeliveryTerm}
                additionalInfo={additionalInfo}
                setAdditionalInfo={setAdditionalInfo}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
