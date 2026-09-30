export function parseApiDate(value) {
  if (value instanceof Date) return value;
  const text = String(value ?? '');
  return new Date(text.includes('T') ? text : `${text}T12:00:00`);
}

export function formatApiDate(formatter, value) {
  const date = parseApiDate(value);
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date);
}
