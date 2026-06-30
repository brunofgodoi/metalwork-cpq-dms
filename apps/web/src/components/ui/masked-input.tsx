/**
 * masked-input.tsx
 * Reusable masked input components using react-imask.
 * Provides: CurrencyInput (BRL right-to-left fill), DocumentInput (CPF/CNPJ auto-detect), PhoneInput.
 */
import * as React from 'react';
import { IMaskInput } from 'react-imask';
import { cn } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupText } from '@/components/ui/input-group';

// ---------------------------------------------------------------------------
// Shared base: IMask wrapped to match Shadcn Input visual style
// ---------------------------------------------------------------------------
const imaskInputClass =
  'data-slot=input-group-control flex h-9 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none ring-0 outline-none transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed md:text-sm';

// ---------------------------------------------------------------------------
// CurrencyInput — BRL with right-to-left fill (digit → R$ 0,01 → R$ 0,10...)
// ---------------------------------------------------------------------------
interface CurrencyInputProps {
  value: string;
  onValueChange: (raw: string, numericValue: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  readOnly?: boolean;
}

/**
 * Converts a raw numeric cents string to a formatted BRL display value.
 * e.g. "12350" → "123,50"
 *
function centsToBRL(cents: string): string {
  const num = parseInt(cents || '0', 10);
  return (num / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
*/

/**
 * Parses a BRL display string back to a float.
 * e.g. "1.234,56" → 1234.56
 */
export function parseBRLToFloat(brlStr: string): number | undefined {
  const clean = brlStr.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? undefined : n;
}

export function CurrencyInput({
  value,
  onValueChange,
  placeholder = '0,00',
  disabled = false,
  className,
  id,
  readOnly,
}: CurrencyInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <IMaskInput
        id={id}
        mask={Number}
        scale={2}
        thousandsSeparator="."
        padFractionalZeros={true}
        normalizeZeros={true}
        radix=","
        mapToRadix={['.']}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        onAccept={(maskedValue: string, maskRef: any) => {
          const numValue = maskRef.unmaskedValue ? parseFloat(maskRef.unmaskedValue) : undefined;
          onValueChange(maskedValue, numValue);
        }}
        className={cn(imaskInputClass)}
      />
    </InputGroup>
  );
}

const baseInputStyles =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40';

// ---------------------------------------------------------------------------
// DocumentInput — auto-detect CPF (11 digits) vs CNPJ (14 digits)
// ---------------------------------------------------------------------------
interface DocumentInputProps {
  value: string;
  onChange: (masked: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const CPF_MASK = '000.000.000-00';
const CNPJ_MASK = '00.000.000/0000-00';

export function DocumentInput({
  value,
  onChange,
  placeholder = 'CPF ou CNPJ',
  disabled = false,
  className,
  id,
}: DocumentInputProps) {
  /**
   * react-imask supports an array of mask definitions with a `dispatch` function.
   * The dispatch fires on every keystroke with the raw unmasked value and picks the
   * correct mask definition — allowing seamless CPF → CNPJ transition while typing.
   */
  const masks = React.useMemo(
    () => [
      {
        mask: CPF_MASK,
        // CPF: exactly 11 digits
        lazy: false,
      },
      {
        mask: CNPJ_MASK,
        // CNPJ: 12-14 digits
        lazy: false,
      },
    ],
    [],
  );

  return (
    <IMaskInput
      id={id}
      // Use the array + dispatch so imask can grow from CPF → CNPJ
      mask={masks as any}
      dispatch={(appended, dynamicMasked) => {
        // Count only digits in current accumulated value
        const digits = (dynamicMasked.value + appended).replace(/\D/g, '');
        // Switch to CNPJ mask when digit count exceeds 11
        return digits.length > 11 ? dynamicMasked.compiledMasks[1] : dynamicMasked.compiledMasks[0];
      }}
      value={value}
      onAccept={(maskedVal: string) => onChange(maskedVal)}
      placeholder={placeholder}
      disabled={disabled}
      unmask={false}
      lazy={true}
      className={cn(baseInputStyles, className)}
    />
  );
}

// ---------------------------------------------------------------------------
// PhoneInput — (XX) XXXXX-XXXX / (XX) XXXX-XXXX auto-detect
// ---------------------------------------------------------------------------
interface PhoneInputProps {
  value: string;
  onChange: (masked: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = '(00) 00000-0000',
  disabled = false,
  className,
  id,
}: PhoneInputProps) {
  return (
    <IMaskInput
      id={id}
      mask={[{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }]}
      value={value}
      onAccept={(maskedVal: string) => onChange(maskedVal)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(baseInputStyles, className)}
    />
  );
}
