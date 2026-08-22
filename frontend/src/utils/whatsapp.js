// wa.me needs a full international number — enquiry phones are usually
// entered as a plain 10-digit Indian number, so assume +91 when no country
// code appears to already be present.
export function whatsAppNumber(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}
