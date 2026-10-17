export type OtpType = 'totp';

export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface OtpAccountRecord {
  // identity
  id: string; // crypto.randomUUID()
  issuer: string; // "GitHub"
  label: string; // "user@email.com"

  // otp config
  type: OtpType;
  algorithm: Algorithm; // default SHA1 (virtually universal)
  digits: 6 | 7 | 8; // default 6

  // totp-specific
  period?: 30 | 60; // seconds, default 30

  // meta
  iconUrl?: string; // favicon / brand logo
  color?: string; // user-assigned accent color
  sortOrder: number; // for drag reorder
  createdAt: number; // Date.now()
  lastUsedAt?: number;
}

export interface OtpAccount extends OtpAccountRecord {
  secret: string;
}
