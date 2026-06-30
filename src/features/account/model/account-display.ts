import type { OtpAccount } from '@/features/totp/model/totp-account';

export function getAccountInitial(account: OtpAccount): string {
  const source = account.label.trim() || account.issuer.trim();

  return source.charAt(0).toUpperCase() || '?';
}
