import { generateSync } from 'otplib';

import type { OtpAccount } from '@/src/features/totp/model/totp-account';

export interface GenerateTotpCodeInput {
  secret: string;
  period: 30 | 60;
  digits: OtpAccount['digits'];
  // Date.now-compatible Unix timestamp in milliseconds.
  timestamp?: number;
}

const BASE32_SECRET = /^[A-Z2-7]+=*$/i;

export function generateTotpCode({
  secret,
  period,
  digits,
  timestamp = Date.now()
}: GenerateTotpCodeInput): string {
  const normalizedSecret = secret.replace(/\s+/g, '').toUpperCase();

  if (normalizedSecret.length === 0 || !BASE32_SECRET.test(normalizedSecret)) {
    return '';
  }

  try {
    return generateSync({
      secret: normalizedSecret,
      period,
      digits,
      epoch: Math.floor(timestamp / 1000)
    });
  } catch {
    return '';
  }
}
