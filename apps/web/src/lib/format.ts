export function fmtBRL(val: number | string | null | undefined) {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

export function pct(val: number | string | null | undefined) {
  if (val == null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return `${num.toFixed(1)}%`;
}
