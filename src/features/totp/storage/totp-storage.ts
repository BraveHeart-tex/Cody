import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type {
  Algorithm,
  OtpAccount,
  OtpAccountRecord,
  OtpType
} from '@/src/features/totp/model/totp-account';

const OTP_TYPES = new Set<OtpType>(['totp', 'hotp', 'steam']);
const ALGORITHMS = new Set<Algorithm>(['SHA1', 'SHA256', 'SHA512']);
const DIGITS = new Set<OtpAccountRecord['digits']>([6, 7, 8]);
const PERIODS = new Set<NonNullable<OtpAccountRecord['period']>>([30, 60]);
const SECURE_STORE_KEY_ID = /^[A-Za-z0-9._-]+$/;

export const KEYS = {
  accountIndex: 'totp:accounts:index',
  accountRecord: (id: string) => `totp:accounts:${id}:record`,
  accountSecret: (id: string) => {
    if (!SECURE_STORE_KEY_ID.test(id)) {
      throw new Error('Invalid TOTP account id');
    }

    return `totp.accounts.${id}.secret`;
  }
} as const;

export async function getSecret(id: string): Promise<string | null> {
  return getItemAsync(KEYS.accountSecret(id));
}

export async function setSecret(id: string, secret: string): Promise<void> {
  await setItemAsync(KEYS.accountSecret(id), secret);
}

export async function deleteSecret(id: string): Promise<void> {
  await deleteItemAsync(KEYS.accountSecret(id));
}

export async function getAccountIndex(): Promise<string[]> {
  const ids = await readJSON<string[]>(KEYS.accountIndex);

  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.filter((id): id is string => typeof id === 'string');
}

export async function setAccountIndex(ids: string[]): Promise<void> {
  await writeJSON(KEYS.accountIndex, ids);
}

export async function getAccountRecord(
  id: string
): Promise<OtpAccountRecord | null> {
  const record = await readJSON<unknown>(KEYS.accountRecord(id));

  if (!isOtpAccountRecord(record)) {
    return null;
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

export async function getAllAccounts(): Promise<OtpAccount[]> {
  const ids = await getAccountIndex();
  const accounts = await Promise.all(ids.map(getAccountFromStores));

  return accounts.filter((account): account is OtpAccount => account != null);
}

async function getAccountFromStores(id: string): Promise<OtpAccount | null> {
  const [record, secret] = await Promise.all([
    getAccountRecord(id),
    getSecret(id)
  ]);

  if (record == null || secret == null) {
    return null;
  }

  return {
    ...record,
    secret
  };
}

async function readJSON<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);

  if (value == null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
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
