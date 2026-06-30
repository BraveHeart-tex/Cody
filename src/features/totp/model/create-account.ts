import { createAccountId } from '@/features/totp/model/account-id';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';
import type {
  ManualTotpDigits,
  ManualTotpPeriod
} from '@/features/totp/model/manual-account';
import type { TotpDraft } from '@/features/totp/model/parse-otpauth-uri';
import type { OtpAccount } from '@/features/totp/model/totp-account';

export interface CreateManualOtpAccountInput {
  issuer: string;
  label: string;
  secret: string;
  digits: ManualTotpDigits;
  period: ManualTotpPeriod;
}

export function createManualOtpAccount(
  input: CreateManualOtpAccountInput
): OtpAccount {
  const accountId = createAccountId();

  return {
    id: accountId,
    issuer: input.issuer,
    label: input.label,
    secret: input.secret,
    type: 'totp',
    algorithm: 'SHA1',
    digits: input.digits,
    period: input.period,
    color: getDefaultAccountColor({
      id: accountId,
      issuer: input.issuer,
      label: input.label
    }),
    createdAt: Date.now(),
    sortOrder: 0
  };
}

export function createScannedOtpAccount(
  draft: TotpDraft,
  label: string
): OtpAccount {
  const accountId = createAccountId();
  const trimmedLabel = label.trim();

  return {
    ...draft,
    id: accountId,
    label: trimmedLabel,
    color: getDefaultAccountColor({
      id: accountId,
      issuer: draft.issuer,
      label: trimmedLabel
    }),
    createdAt: Date.now(),
    sortOrder: 0
  };
}
