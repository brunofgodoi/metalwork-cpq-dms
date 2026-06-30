import { type ReactNode } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  Eye,
  FileText,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Ban,
} from 'lucide-react';

interface QuoteLayoutProps {
  children: ReactNode;
  quote?: {
    id: string;
    quoteNumber: number;
    client?: { name: string };
    status?: string;
  } | null;
  onOpenPrint?: () => void;
  onExportCsv?: () => void;
  onSend?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELED: 'Cancelado',
  PENDING_APPROVAL: 'Pendente Aprovação',
};

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CANCELED: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export function QuoteLayout({
  children,
  quote,
  onOpenPrint,
  onExportCsv,
  onSend,
  onApprove,
  onReject,
  onCancel,
}: QuoteLayoutProps) {
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = location.pathname.endsWith('/edit');
  const isNew = location.pathname.endsWith('/new');

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b px-6 py-3">
        <Link to="/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          {quote ? (
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">Orçamento #{quote.quoteNumber}</h1>
              {quote.client && (
                <span className="text-muted-foreground text-sm">{quote.client.name}</span>
              )}
            </div>
          ) : isNew ? (
            <h1 className="text-lg font-semibold">Novo Orçamento</h1>
          ) : id ? (
            <h1 className="text-lg font-semibold">Editando Orçamento</h1>
          ) : (
            <div className="h-5 w-48 rounded bg-muted" />
          )}
        </div>
        {id && !isNew && onOpenPrint && (
          <Button variant="outline" size="sm" onClick={onOpenPrint}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        )}
        {id && !isNew && onExportCsv && (
          <Button variant="outline" size="sm" onClick={onExportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
        {id && !isEditMode && !isNew && (
          <Link to={`/quotes/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
        {id && isEditMode && (
          <Link to={`/quotes/${id}`}>
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </Button>
          </Link>
        )}
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
      {quote && !isNew && id && (
        <footer className="flex items-center justify-between border-t bg-background px-6 py-2.5">
          <div className="flex items-center gap-3">
            <Badge
              className={`px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[quote.status || ''] || ''}`}
            >
              {STATUS_LABELS[quote.status || ''] || quote.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {quote.status === 'DRAFT' && onSend && (
              <Button size="sm" onClick={onSend} className="text-xs">
                <Send className="h-3.5 w-3.5 mr-1" />
                Enviar
              </Button>
            )}
            {quote.status === 'SENT' && onApprove && (
              <Button
                size="sm"
                variant="outline"
                onClick={onApprove}
                className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50 text-xs"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Aprovar
              </Button>
            )}
            {quote.status === 'SENT' && onReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 text-xs"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Rejeitar
              </Button>
            )}
            {quote.status === 'APPROVED' && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel} className="text-xs">
                <Ban className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
