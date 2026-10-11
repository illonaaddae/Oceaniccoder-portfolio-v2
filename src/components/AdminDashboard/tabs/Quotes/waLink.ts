/**
 * Opens WhatsApp straight to the client's chat. wa.me needs the number with
 * its country code and no symbols, so a Ghana number typed as 024… becomes
 * 23324…. With no number on file it falls back to WhatsApp's contact picker.
 */
export function waLink(phone: string | null | undefined, message: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
