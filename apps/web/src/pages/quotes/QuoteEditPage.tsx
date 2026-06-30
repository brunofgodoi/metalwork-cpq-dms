import { useParams } from 'react-router-dom';
import { QuoteComposer } from './QuoteComposer';

export function QuoteEditPage() {
  const { id } = useParams<{ id: string }>();
  return <QuoteComposer quoteId={id} />;
}

export function NewQuotePage() {
  return <QuoteComposer />;
}
