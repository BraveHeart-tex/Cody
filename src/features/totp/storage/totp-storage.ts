import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type {
  Algorithm,
  OtpAccount,
  OtpAccountRecord,
  OtpType
} from '@/features/totp/model/totp-account';

const OTP_TYPES = new Set<OtpType>(['totp', 'hotp', 'steam']);
const ALGORITHMS = new Set<Algorithm>(['SHA1', 'SHA256', 'SHA512']);
const DIGITS = new Set<OtpAccountRecord['digits']>([6, 7, 8]);
const PERIODS = new Set<NonNullable<OtpAccountRecord['period']>>([30, 60]);
const SECURE_STORE_KEY_ID = /^[A-Za-z0-9._-]+$/;

export const KEYS = {
  accountIndex: 'totp:accounts:index',
  accountIndexRecovery: (timestamp: number, sequence: number) =>
    `totp:accounts:index:recovery:${timestamp}:${sequence}`,
  accountRecord: (id: string) => `totp:accounts:${id}:record`,
  accountSecret: (id: string) => {
    if (!SECURE_STORE_KEY_ID.test(id)) {
      throw new Error('Invalid TOTP account id');
    }

    return `totp.accounts.${id}.secret`;
  }
} as const;

export type AccountStorageIssueReason =
  | 'missing-record'
  | 'invalid-record-json'
  | 'invalid-record'
  | 'missing-secret'
  | 'read-failed';

export interface DamagedAccount {
  id: string;
  record: OtpAccountRecord | null;
  reason: AccountStorageIssueReason;
}

export interface AccountsStorageSnapshot {
  accountIds: string[];
  accounts: OtpAccount[];
  damagedAccounts: DamagedAccount[];
}

export class CorruptAccountIndexError extends Error {
  constructor(readonly rawValue: string) {
    super('The saved account index is corrupted.');
    this.name = 'CorruptAccountIndexError';
  }
}

export async function getSecret(id: string): Promise<string | null> {
  return getItemAsync(KEYS.accountSecret(id));
}

export async function setSecret(id: string, secret: string): Promise<void> {
  await setItemAsync(KEYS.accountSecret(id), secret);
}

export async function deleteSecret(id: string): Promise<void> {
  if (!SECURE_STORE_KEY_ID.test(id)) {
    return;
  }

  await deleteItemAsync(KEYS.accountSecret(id));
}

export async function getAccountIndex(): Promise<string[]> {
  const value = await AsyncStorage.getItem(KEYS.accountIndex);

  if (value == null) {
    return [];
  }

  let ids: unknown;

  try {
    ids = JSON.parse(value) as unknown;
  } catch {
    throw new CorruptAccountIndexError(value);
  }

  if (
    !Array.isArray(ids) ||
    !ids.every((id): id is string => typeof id === 'string') ||
    new Set(ids).size !== ids.length
  ) {
    throw new CorruptAccountIndexError(value);
  }

  return ids;
}

export async function setAccountIndex(ids: string[]): Promise<void> {
  await writeJSON(KEYS.accountIndex, ids);
}

export async function archiveCorruptAccountIndex(
  rawValue: string
): Promise<void> {
  const timestamp = Date.now();
  let sequence = 0;
  let key = KEYS.accountIndexRecovery(timestamp, sequence);

  while ((await AsyncStorage.getItem(key)) != null) {
    sequence += 1;
    key = KEYS.accountIndexRecovery(timestamp, sequence);
  }

  await AsyncStorage.setItem(key, rawValue);
}

export async function getAccountRecord(
  id: string
): Promise<OtpAccountRecord | null> {
  const value = await AsyncStorage.getItem(KEYS.accountRecord(id));

  if (value == null) {
    return null;
  }

  let record: unknown;

  try {
    record = JSON.parse(value) as unknown;
  } catch {
    throw new InvalidAccountRecordError('invalid-record-json');
  }

  if (!isOtpAccountRecord(record) || record.id !== id) {
    throw new InvalidAccountRecordError('invalid-record');
  }

  return record;
}

export async function setAccountRecord(
  record: OtpAccountRecord
): Promise<void> {
  await writeJSON(KEYS.accountRecord(record.id), record);
}

export async function deleteAccountRecord(id: string): Promise<void> {
  await AsyncStorage.removeItem(KEYS.accountRecord(id));
}

export async function getAccountFromStores(
  id: string
): Promise<OtpAccount | DamagedAccount> {
  const [recordResult, secretResult] = await Promise.allSettled([
    getAccountRecord(id),
    getSecret(id)
  ]);

  const record =
    recordResult.status === 'fulfilled' ? recordResult.value : null;
  const secret =
    secretResult.status === 'fulfilled' ? secretResult.value : null;

  if (recordResult.status === 'rejected') {
    const reason = recordResult.reason;

    return {
      id,
      record: null,
      reason:
        reason instanceof InvalidAccountRecordError
          ? reason.reason
          : 'read-failed'
    };
  }

  if (record == null) {
    return { id, record: null, reason: 'missing-record' };
  }

  if (secretResult.status === 'rejected') {
    return { id, record, reason: 'read-failed' };
  }

  if (secret == null) {
    return { id, record, reason: 'missing-secret' };
  }

  return { ...record, secret };
}

export async function getAllAccounts(): Promise<AccountsStorageSnapshot> {
  const accountIds = await getAccountIndex();
  const entries = await Promise.all(accountIds.map(getAccountFromStores));

  return {
    accountIds,
    accounts: entries.filter(isOtpAccount),
    damagedAccounts: entries.filter(isDamagedAccount)
  };
}

class InvalidAccountRecordError extends Error {
  constructor(readonly reason: 'invalid-record-json' | 'invalid-record') {
    super('The saved account record is invalid.');
    this.name = 'InvalidAccountRecordError';
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isOtpAccount(value: OtpAccount | DamagedAccount): value is OtpAccount {
  return 'secret' in value;
}

function isDamagedAccount(
  value: OtpAccount | DamagedAccount
): value is DamagedAccount {
  return !isOtpAccount(value);
}

function isOtpAccountRecord(value: unknown): value is OtpAccountRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.issuer === 'string' &&
    typeof value.label === 'string' &&
    isOtpType(value.type) &&
    isAlgorithm(value.algorithm) &&
    isDigits(value.digits) &&
    isOptional(value.period, isPeriod) &&
    isOptional(value.counter, isNumber) &&
    isOptional(value.iconUrl, isString) &&
    isOptional(value.color, isString) &&
    typeof value.sortOrder === 'number' &&
    typeof value.createdAt === 'number' &&
    isOptional(value.lastUsedAt, isNumber)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null;
}

function isOtpType(value: unknown): value is OtpType {
  return OTP_TYPES.has(value as OtpType);
}

function isAlgorithm(value: unknown): value is Algorithm {
  return ALGORITHMS.has(value as Algorithm);
}

function isDigits(value: unknown): value is OtpAccountRecord['digits'] {
  return DIGITS.has(value as OtpAccountRecord['digits']);
}

function isPeriod(
  value: unknown
): value is NonNullable<OtpAccountRecord['period']> {
  return PERIODS.has(value as NonNullable<OtpAccountRecord['period']>);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptional<T>(
  value: unknown,
  guard: (value: unknown) => value is T
): value is T | undefined {
  return value === undefined || guard(value);
}
