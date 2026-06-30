import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Field, FieldLabel, FieldGroup, FieldError } from '../ui/field';
import { DocumentInput, PhoneInput } from '../ui/masked-input';
import { UserPlus, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  isActive?: boolean;
}

interface Client {
  id?: string;
  name: string;
  document?: string;
  address?: string;
  contacts?: Contact[];
}

interface ClientFormProps {
  initialValues?: Client;
  onSubmit: (data: Omit<Client, 'id'>) => void;
  isPending: boolean;
  onCancel: () => void;
  contactHeight?: string;
  submitLabel?: string;
  onDeleteContactPermanent?: (contactId: string) => Promise<void>;
}

export function ClientForm({
  initialValues,
  onSubmit,
  isPending,
  onCancel,
  contactHeight,
  submitLabel = 'Salvar',
  onDeleteContactPermanent,
}: ClientFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [document, setDocument] = useState(initialValues?.document ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [contacts, setContacts] = useState<Contact[]>(initialValues?.contacts ?? []);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [isDeletingContactId, setIsDeletingContactId] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setDocument(initialValues.document ?? '');
      setAddress(initialValues.address ?? '');
      setContacts(initialValues.contacts ?? []);
    }
  }, [initialValues]);

  const handleAddContact = () =>
    setContacts([...contacts, { name: '', phone: '', email: '', isActive: true }]);

  const handleRemoveContact = (i: number) => {
    const contact = contacts[i];
    if (!contact.id) {
      setContacts(contacts.filter((_, idx) => idx !== i));
    } else {
      const updated = [...contacts];
      updated[i] = { ...updated[i], isActive: false };
      setContacts(updated);
    }
  };

  const handleRestoreContact = (i: number) => {
    const updated = [...contacts];
    updated[i] = { ...updated[i], isActive: true };
    setContacts(updated);
  };

  const handleDeleteContactPermanent = async (i: number) => {
    const contact = contacts[i];
    if (!contact.id || !onDeleteContactPermanent) return;

    const confirmDelete = window.confirm(
      `Atenção: A exclusão permanente removerá o contato "${contact.name}" do sistema e invalidará suas referências em orçamentos históricos.\nDeseja prosseguir?`,
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingContactId(contact.id);
      await onDeleteContactPermanent(contact.id);
      setContacts(contacts.filter((_, idx) => idx !== i));
      toast.success('Contato excluído permanentemente!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir contato.');
    } finally {
      setIsDeletingContactId(null);
    }
  };

  const handleContactChange = (i: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[i] = { ...updated[i], [field]: value };
    setContacts(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (!name.trim()) {
      toast.error('A Razão Social é obrigatória.');
      return;
    }

    const hasInvalidContact = contacts.some(
      (c) => c.isActive !== false && !c.name.trim() && (c.phone.trim() || c.email.trim()),
    );
    if (hasInvalidContact) {
      toast.error('Preencha o nome de todos os contatos adicionados.');
      return;
    }

    const validContacts = contacts.filter((c) => c.name.trim() !== '');

    onSubmit({
      name: name.trim(),
      document: document.trim() || undefined,
      address: address.trim() || undefined,
      contacts: validContacts.length > 0 ? validContacts : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold border-b pb-2">Dados da Empresa</h4>
        <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field data-invalid={triedSubmit && !name.trim()}>
            <FieldLabel>Razão Social *</FieldLabel>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Acme S.A."
            />
            {triedSubmit && !name.trim() && <FieldError>A Razão Social é obrigatória.</FieldError>}
          </Field>
          <Field>
            <FieldLabel>CNPJ / CPF</FieldLabel>
            <DocumentInput value={document} onChange={setDocument} placeholder="CPF ou CNPJ" />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Endereço</FieldLabel>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, Cidade, Estado"
            />
          </Field>
        </FieldGroup>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-semibold">Contatos</h4>
          <Button type="button" size="sm" variant="outline" onClick={handleAddContact}>
            <UserPlus className="mr-2 h-4 w-4" /> Adicionar Contato
          </Button>
        </div>
        {contacts.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={contactHeight ? { height: contactHeight.trim() } : undefined}
          >
            <p className="text-sm text-muted-foreground italic">Nenhum contato adicionado.</p>
          </div>
        ) : (
          <div
            className="space-y-3 overflow-y-auto pr-1"
            style={contactHeight ? { height: contactHeight.trim() } : undefined}
          >
            {contacts.map((c, i) => {
              const isInactive = c.isActive === false;
              return (
                <div
                  key={i}
                  className={`flex flex-col md:flex-row gap-2 items-start md:items-center p-3 rounded-lg border transition-all ${
                    isInactive
                      ? 'bg-destructive/5 border-destructive/20 opacity-85'
                      : 'bg-secondary/30'
                  }`}
                >
                  {isInactive && (
                    <Badge variant="destructive" className="mr-1 shrink-0 select-none">
                      Inativo
                    </Badge>
                  )}
                  <Field
                    data-invalid={triedSubmit && !isInactive && !c.name.trim()}
                    className="flex-1"
                  >
                    <Input
                      placeholder="Nome *"
                      value={c.name}
                      onChange={(e) => handleContactChange(i, 'name', e.target.value)}
                      className="bg-background"
                      disabled={isInactive}
                    />
                  </Field>
                  <Field className="flex-1">
                    <PhoneInput
                      placeholder="(00) 00000-0000"
                      value={c.phone}
                      onChange={(val) => handleContactChange(i, 'phone', val)}
                      className="bg-background"
                      disabled={isInactive}
                    />
                  </Field>
                  <Field className="flex-1">
                    <Input
                      placeholder="Email"
                      type="email"
                      value={c.email}
                      onChange={(e) => handleContactChange(i, 'email', e.target.value)}
                      className="bg-background"
                      disabled={isInactive}
                    />
                  </Field>

                  {isInactive ? (
                    <div className="flex gap-1 mt-1 md:mt-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRestoreContact(i)}
                        className="text-primary hover:bg-secondary/80"
                        title="Reativar Contato"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      {user?.role === 'ADMIN' && onDeleteContactPermanent && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteContactPermanent(i)}
                          className="text-destructive hover:bg-destructive/10"
                          disabled={isDeletingContactId === c.id}
                          title="Excluir permanentemente"
                        >
                          {isDeletingContactId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveContact(i)}
                      className="text-destructive mt-1 md:mt-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
