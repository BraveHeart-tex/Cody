import { generateTotpCode } from '@/features/totp/model/totp-code';
import type { OtpAccount } from '@/features/totp/model/totp-account';

export type ManualTotpPeriod = 30 | 60;
export type ManualTotpDigits = 6 | 8;

export interface ManualAccountFormValues {
  issuer: string;
  label: string;
  secret: string;
  period: ManualTotpPeriod;
  digits: ManualTotpDigits;
}

export interface ManualAccountValidationResult {
  issuer: string;
  label: string;
  secret: string;
  error: string | null;
  isValid: boolean;
}

const BASE32_SECRET = /^[A-Z2-7]+=*$/;
const DEFAULT_TIMESTAMP = 0;

export function normalizeManualSecret(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function validateManualAccount(
  values: ManualAccountFormValues,
  accounts: Pick<OtpAccount, 'secret'>[]
): ManualAccountValidationResult {
  const issuer = values.issuer.trim();
  const label = values.label.trim();
  const secret = normalizeManualSecret(values.secret);

  if (label.length === 0) {
    return invalid({ issuer, label, secret }, 'Enter an account label.');
  }

  if (secret.length === 0) {
    return invalid({ issuer, label, secret }, 'Enter a secret key.');
  }

  if (!BASE32_SECRET.test(secret)) {
    return invalid(
      { issuer, label, secret },
      'Secret key must use base32 characters A-Z and 2-7.'
    );
  }

  const code = generateTotpCode({
    secret,
    algorithm: 'SHA1',
    period: values.period,
    digits: values.digits,
    timestamp: DEFAULT_TIMESTAMP
  });

  if (code.length === 0) {
    return invalid({ issuer, label, secret }, 'Secret key is not valid.');
  }

  const isDuplicate = accounts.some(
    account => normalizeManualSecret(account.secret) === secret
  );

  if (isDuplicate) {
    return invalid({ issuer, label, secret }, 'This account is already saved.');
  }

  return {
    issuer,
    label,
    secret,
    error: null,
    isValid: true
  };
}

function invalid(
  values: Pick<ManualAccountValidationResult, 'issuer' | 'label' | 'secret'>,
  error: string
): ManualAccountValidationResult {
  return {
    ...values,
    error,
    isValid: false
  };
}
