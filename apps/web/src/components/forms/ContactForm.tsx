import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Field, FieldLabel, FieldGroup, FieldError } from '../ui/field';
import { PhoneInput } from '../ui/masked-input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
  onSubmit: (data: { name: string; phone?: string; email?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export function ContactForm({
  onSubmit,
  isPending,
  onCancel,
  submitLabel = 'Salvar',
}: ContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (!name.trim()) {
      toast.error('O nome do contato é obrigatório.');
      return;
    }

    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldGroup>
        <Field data-invalid={triedSubmit && !name.trim()}>
          <FieldLabel>Nome do Contato *</FieldLabel>
          <Input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
          />
          {triedSubmit && !name.trim() && <FieldError>O nome do contato é obrigatório.</FieldError>}
        </Field>

        <Field>
          <FieldLabel>Telefone</FieldLabel>
          <PhoneInput value={phone} onChange={setPhone} placeholder="(00) 00000-0000" />
        </Field>

        <Field>
          <FieldLabel>E-mail</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@empresa.com"
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
