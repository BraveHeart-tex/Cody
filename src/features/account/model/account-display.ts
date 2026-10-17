import type { OtpAccountRecord } from '@/features/totp/model/totp-account';

export function getAccountInitial(account: OtpAccountRecord): string {
  const source = account.label.trim() || account.issuer.trim();

  return source.charAt(0).toUpperCase() || '?';
}
