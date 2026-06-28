import type { OtpAccountRecord } from '@/features/totp/model/totp-account';

const ACCOUNT_COLOR_PALETTE = [
  '#4F46E5',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DB2777',
  '#7C3AED'
] as const;

type AccountColorInput = Pick<OtpAccountRecord, 'id' | 'issuer' | 'label'>;

export function getDefaultAccountColor(account: AccountColorInput): string {
  const value = `${account.id}:${account.issuer}:${account.label}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return ACCOUNT_COLOR_PALETTE[hash % ACCOUNT_COLOR_PALETTE.length];
}

export function getAccountColor(
  account: AccountColorInput & Pick<OtpAccountRecord, 'color'>
): string {
  return account.color || getDefaultAccountColor(account);
}
