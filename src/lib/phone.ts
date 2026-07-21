// Phone helpers shared by the login page and the admin "create login" flow.
// MUST stay in sync with supabase/functions/admin-create-user/index.ts.

// Synthetic email domain used to key phone-based logins. Never receives mail.
export const PHONE_EMAIL_DOMAIN = "phone.eltuffventures.com";

// Normalize a Ghanaian phone number to E.164 digits (no leading +).
// 0244000000 -> 233244000000 ; +233 24 400 0000 -> 233244000000
export function normalizePhoneDigits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  if (d.length === 9) return "233" + d;
  return d;
}

// The synthetic email a phone number logs in with.
export function phoneToLoginEmail(raw: string): string {
  return `${normalizePhoneDigits(raw)}@${PHONE_EMAIL_DOMAIN}`;
}

// Decide whether a typed identifier is an email or a phone number.
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes("@");
}

// Resolve any typed identifier (email or phone) to the email Supabase auth uses.
export function identifierToAuthEmail(identifier: string): string {
  const id = identifier.trim();
  return isEmailIdentifier(id) ? id.toLowerCase() : phoneToLoginEmail(id);
}
