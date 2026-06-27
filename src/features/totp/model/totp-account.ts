export type OtpType = 'totp' | 'hotp' | 'steam';

export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface OtpAccountRecord {
  // identity
  id: string; // crypto.randomUUID()
  issuer: string; // "GitHub"
  label: string; // "user@email.com"

  // otp config
  type: OtpType; // totp for MVP
  algorithm: Algorithm; // default SHA1 (virtually universal)
  digits: 6 | 7 | 8; // default 6

  // totp-specific
  period?: 30 | 60; // seconds, default 30

  // hotp-specific
  counter?: number; // increment on each use, default 0

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
