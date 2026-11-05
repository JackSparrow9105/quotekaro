/** WhatsApp link with a prefilled message to the customer's number (10-digit Indian numbers get +91). */
export function waLink(phone: string, text: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? '91' + digits : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
