import type {
  Algorithm,
  OtpAccount
} from '@/src/features/totp/model/totp-account';

export type TotpDraft = Pick<
  OtpAccount,
  'issuer' | 'label' | 'secret' | 'type' | 'algorithm' | 'digits' | 'period'
>;

export type ParseOtpAuthUriResult =
  | {
      account: TotpDraft;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

const ALGORITHMS = new Set<Algorithm>(['SHA1', 'SHA256', 'SHA512']);
const DIGITS = new Set<TotpDraft['digits']>([6, 7, 8]);
const PERIODS = new Set<NonNullable<TotpDraft['period']>>([30, 60]);
const BASE32_SECRET = /^[A-Z2-7]+=*$/i;
const DEFAULT_ALGORITHM: Algorithm = 'SHA1';
const DEFAULT_DIGITS: TotpDraft['digits'] = 6;
const DEFAULT_PERIOD: NonNullable<TotpDraft['period']> = 30;

export function parseOtpAuthUri(value: string): ParseOtpAuthUriResult {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: 'Scan a valid authenticator QR code.' };
  }

  if (url.protocol !== 'otpauth:') {
    return { ok: false, error: 'Scan an otpauth authenticator QR code.' };
  }

  if (url.hostname !== 'totp') {
    return {
      ok: false,
      error: `Unsupported authenticator type "${url.hostname || 'unknown'}".`
    };
  }

  const secret = normalizeSecret(url.searchParams.get('secret'));

  if (secret.length === 0) {
    return { ok: false, error: 'Authenticator QR code is missing a secret.' };
  }

  if (!BASE32_SECRET.test(secret)) {
    return { ok: false, error: 'Authenticator QR code has an invalid secret.' };
  }

  const algorithmResult = parseAlgorithm(url.searchParams.get('algorithm'));

  if (!algorithmResult.ok) {
    return algorithmResult;
  }

  const digitsResult = parseDigits(url.searchParams.get('digits'));

  if (!digitsResult.ok) {
    return digitsResult;
  }

  const periodResult = parsePeriod(url.searchParams.get('period'));

  if (!periodResult.ok) {
    return periodResult;
  }

  const labelParts = parseLabel(url.pathname);
  const queryIssuer = cleanText(url.searchParams.get('issuer'));
  const issuer = queryIssuer || labelParts.issuer || '';
  const label = labelParts.label || issuer || 'Account';

  return {
    ok: true,
    account: {
      issuer,
      label,
      secret,
      type: 'totp',
      algorithm: algorithmResult.value,
      digits: digitsResult.value,
      period: periodResult.value
    }
  };
}

function parseAlgorithm(
  value: string | null
): { ok: true; value: Algorithm } | { ok: false; error: string } {
  const algorithm = (value ?? DEFAULT_ALGORITHM).toUpperCase();

  if (!ALGORITHMS.has(algorithm as Algorithm)) {
    return {
      ok: false,
      error: `Unsupported TOTP algorithm "${value ?? ''}".`
    };
  }

  return { ok: true, value: algorithm as Algorithm };
}

function parseDigits(
  value: string | null
): { ok: true; value: TotpDraft['digits'] } | { ok: false; error: string } {
  const digits = value == null ? DEFAULT_DIGITS : Number(value);

  if (!DIGITS.has(digits as TotpDraft['digits'])) {
    return {
      ok: false,
      error: `Unsupported TOTP digit count "${value ?? ''}".`
    };
  }

  return { ok: true, value: digits as TotpDraft['digits'] };
}

function parsePeriod(
  value: string | null
):
  | { ok: true; value: NonNullable<TotpDraft['period']> }
  | { ok: false; error: string } {
  const period = value == null ? DEFAULT_PERIOD : Number(value);

  if (!PERIODS.has(period as NonNullable<TotpDraft['period']>)) {
    return { ok: false, error: `Unsupported TOTP period "${value ?? ''}".` };
  }

  return { ok: true, value: period as NonNullable<TotpDraft['period']> };
}

function parseLabel(pathname: string): { issuer: string; label: string } {
  const rawLabel = decodePathname(pathname.replace(/^\/+/, ''));
  const [issuer = '', ...labelParts] = rawLabel.split(':');
  const label = labelParts.join(':');

  if (label.length === 0) {
    return { issuer: '', label: cleanText(rawLabel) };
  }

  return {
    issuer: cleanText(issuer),
    label: cleanText(label)
  };
}

function normalizeSecret(value: string | null): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

function cleanText(value: string | null): string {
  return (value ?? '').trim();
}

function decodePathname(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
