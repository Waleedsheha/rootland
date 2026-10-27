/** Egyptian mobile: 010 / 011 / 012 / 015 + 8 digits (accepts +20 / 0020 prefixes). Same rule as the database. */
export function normalizeEgyptMobile(raw: string): string | null {
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0020')) digits = digits.slice(4);
  else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`;
  return /^01[0125][0-9]{8}$/.test(digits) ? digits : null;
}
