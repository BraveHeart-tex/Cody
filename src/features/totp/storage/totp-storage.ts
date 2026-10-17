import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type {
  Algorithm,
  OtpAccount,
  OtpAccountRecord,
  OtpType
} from '@/features/totp/model/totp-account';

const ALGORITHMS = new Set<Algorithm>(['SHA1', 'SHA256', 'SHA512']);
const DIGITS = new Set<OtpAccountRecord['digits']>([6, 7, 8]);
const PERIODS = new Set<NonNullable<OtpAccountRecord['period']>>([30, 60]);
const SECURE_STORE_KEY_ID = /^[A-Za-z0-9._-]+$/;

export const KEYS = {
  accountIndex: 'totp:accounts:index',
  accountWriteJournal: 'totp:accounts:write-journal',
  accountIndexRecovery: (timestamp: number, sequence: number) =>
    `totp:accounts:index:recovery:${timestamp}:${sequence}`,
  accountRecord: (id: string) => `totp:accounts:${id}:record`,
  stagedAccountSecret: 'totp.accounts.pending.secret',
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
  | 'invalid-account-id'
  | 'missing-secret'
  | 'read-failed'
  | 'write-recovery-failed';

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

export interface AccountWriteJournal {
  kind: 'write' | 'remove';
  accountIds: string[];
  affectedIds: string[];
  records: OtpAccountRecord[];
  secretAccountId: string | null;
  removeAccountId: string | null;
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

export async function setStagedAccountSecret(secret: string): Promise<void> {
  await setItemAsync(KEYS.stagedAccountSecret, secret);
}

export async function getStagedAccountSecret(): Promise<string | null> {
  return getItemAsync(KEYS.stagedAccountSecret);
}

export async function deleteStagedAccountSecret(): Promise<void> {
  await deleteItemAsync(KEYS.stagedAccountSecret);
}

export async function getAccountWriteJournal(): Promise<AccountWriteJournal | null> {
  const value = await AsyncStorage.getItem(KEYS.accountWriteJournal);

  if (value == null) {
    return null;
  }

  const journal: unknown = JSON.parse(value);

  if (!isAccountWriteJournal(journal)) {
    throw new Error('The saved account write recovery data is invalid.');
  }

  return journal;
}

export async function saveAccountWriteJournal(
  journal: AccountWriteJournal
): Promise<void> {
  if (!isAccountWriteJournal(journal)) {
    throw new Error('The account write recovery data is invalid.');
  }

  await writeJSON(KEYS.accountWriteJournal, journal);
}

export async function clearAccountWriteJournal(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.accountWriteJournal);
}

export async function applyAccountWriteJournal(
  journal: AccountWriteJournal
): Promise<void> {
  if (journal.kind === 'remove') {
    if (journal.removeAccountId == null) {
      throw new Error('The saved account removal recovery data is invalid.');
    }

    await deleteAccountData(journal.removeAccountId);
    await setAccountIndex(journal.accountIds);

    if (journal.secretAccountId != null) {
      await deleteStagedAccountSecret();
    }

    await clearAccountWriteJournal();

    return;
  }

  const stagedSecret =
    journal.secretAccountId == null ? null : await getStagedAccountSecret();

  if (journal.secretAccountId != null && stagedSecret == null) {
    throw new MissingStagedAccountSecretError();
  }

  for (const record of journal.records) {
    await setAccountRecord(record);
  }

  if (journal.secretAccountId != null && stagedSecret != null) {
    await setSecret(journal.secretAccountId, stagedSecret);
  }

  await setAccountIndex(journal.accountIds);

  if (journal.secretAccountId != null) {
    await deleteStagedAccountSecret();
  }

  await clearAccountWriteJournal();
}

export async function recoverAccountWriteJournal(): Promise<void> {
  const journal = await getAccountWriteJournal();

  if (journal == null) {
    return;
  }

  if (
    journal.kind === 'write' &&
    journal.secretAccountId != null &&
    (await getStagedAccountSecret()) == null
  ) {
    // Canonical writes do not begin until the pending secret is staged. A
    // missing staged value therefore means this operation can be discarded.
    await clearAccountWriteJournal();

    return;
  }

  await applyAccountWriteJournal(journal);
}

export class MissingStagedAccountSecretError extends Error {
  constructor() {
    super('The pending account secret is not available.');
    this.name = 'MissingStagedAccountSecretError';
  }
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
  if (!isOtpAccountRecord(record)) {
    throw new Error('The saved account record is invalid.');
  }

  await writeJSON(KEYS.accountRecord(record.id), record);
}

export async function deleteAccountRecord(id: string): Promise<void> {
  await AsyncStorage.removeItem(KEYS.accountRecord(id));
}

export async function deleteAccountData(id: string): Promise<void> {
  const results = await Promise.allSettled([
    deleteAccountRecord(id),
    deleteSecret(id)
  ]);
  const failedResult = results.find(result => result.status === 'rejected');

  if (failedResult?.status === 'rejected') {
    throw failedResult.reason;
  }
}

export async function getAccountFromStores(
  id: string
): Promise<OtpAccount | DamagedAccount> {
  if (!isSecureStoreAccountId(id)) {
    return { id, record: null, reason: 'invalid-account-id' };
  }

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

function isAccountWriteJournal(value: unknown): value is AccountWriteJournal {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.kind === 'write' || value.kind === 'remove') &&
    Array.isArray(value.accountIds) &&
    value.accountIds.every(id => typeof id === 'string') &&
    Array.isArray(value.affectedIds) &&
    value.affectedIds.every(id => typeof id === 'string') &&
    Array.isArray(value.records) &&
    value.records.every(isOtpAccountRecord) &&
    (value.secretAccountId == null ||
      isSecureStoreAccountId(value.secretAccountId)) &&
    (value.kind === 'remove'
      ? typeof value.removeAccountId === 'string'
      : value.removeAccountId == null)
  );
}

function isSecureStoreAccountId(value: unknown): value is string {
  return typeof value === 'string' && SECURE_STORE_KEY_ID.test(value);
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
  return value === 'totp';
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
