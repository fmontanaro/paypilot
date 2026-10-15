export function isGoalInviteToken(value: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(value.trim());
}

export function isInviteContact(value: string): boolean {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  if (!/^\+?[\d\s().-]+$/.test(contact)) return false;
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}
