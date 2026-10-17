/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemAsync } from 'expo-secure-store';

const mockSecureValues = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureValues.delete(key);
  }),
  getItemAsync: jest.fn(
    async (key: string) => mockSecureValues.get(key) ?? null
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureValues.set(key, value);
  })
}));

import {
  applyAccountWriteJournal,
  archiveCorruptAccountIndex,
  CorruptAccountIndexError,
  getAllAccounts,
  getAccountIndex,
  KEYS,
  saveAccountWriteJournal,
  setAccountRecord,
  setSecret
} from '@/features/totp/storage/totp-storage';
import type { OtpAccountRecord } from '@/features/totp/model/totp-account';
import type { AccountWriteJournal } from '@/features/totp/storage/totp-storage';

const baseRecord: OtpAccountRecord = {
  id: 'good-id',
  issuer: 'GitHub',
  label: 'user@example.com',
  type: 'totp',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  color: '#0891B2',
  sortOrder: 0,
  createdAt: 123
};

describe('TOTP storage health', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    mockSecureValues.clear();
    jest.clearAllMocks();
  });

  it('throws a typed error and preserves malformed account index JSON', async () => {
    const rawIndex = '{';

    await AsyncStorage.setItem(KEYS.accountIndex, rawIndex);

    await expect(getAccountIndex()).rejects.toMatchObject({
      name: CorruptAccountIndexError.name,
      rawValue: rawIndex
    });
  });

  it('batches metadata reads and defers missing-secret detection', async () => {
    await AsyncStorage.setItem(
      KEYS.accountIndex,
      JSON.stringify([
        'good-id',
        'bad-json-id',
        'missing-secret-id',
        'missing-record-id'
      ])
    );
    await AsyncStorage.setItem(
      KEYS.accountRecord('good-id'),
      JSON.stringify(baseRecord)
    );
    await AsyncStorage.setItem(KEYS.accountRecord('bad-json-id'), '{');
    await AsyncStorage.setItem(
      KEYS.accountRecord('missing-secret-id'),
      JSON.stringify({ ...baseRecord, id: 'missing-secret-id' })
    );
    await setSecret('good-id', 'JBSWY3DPEHPK3PXP');

    const snapshot = await getAllAccounts();

    expect(snapshot.accountIds).toEqual([
      'good-id',
      'bad-json-id',
      'missing-secret-id',
      'missing-record-id'
    ]);
    expect(snapshot.accounts).toEqual([
      baseRecord,
      { ...baseRecord, id: 'missing-secret-id' }
    ]);
    expect(snapshot.damagedAccounts).toEqual([
      { id: 'bad-json-id', record: null, reason: 'invalid-record-json' },
      { id: 'missing-record-id', record: null, reason: 'missing-record' }
    ]);
    expect(AsyncStorage.multiGet).toHaveBeenCalledWith([
      KEYS.accountRecord('good-id'),
      KEYS.accountRecord('bad-json-id'),
      KEYS.accountRecord('missing-secret-id'),
      KEYS.accountRecord('missing-record-id')
    ]);
    expect(getItemAsync).not.toHaveBeenCalled();
  });

  it('keeps unsupported account types out of usable accounts', async () => {
    const hotpRecord = { ...baseRecord, id: 'hotp-id', type: 'hotp' };
    const steamRecord = { ...baseRecord, id: 'steam-id', type: 'steam' };
    const unsupportedRecords = [hotpRecord, steamRecord];

    await AsyncStorage.setItem(
      KEYS.accountIndex,
      JSON.stringify(unsupportedRecords.map(({ id }) => id))
    );

    for (const record of unsupportedRecords) {
      await AsyncStorage.setItem(
        KEYS.accountRecord(record.id),
        JSON.stringify(record)
      );
      await setSecret(record.id, 'JBSWY3DPEHPK3PXP');
    }

    const snapshot = await getAllAccounts();

    expect(snapshot.accounts).toEqual([]);
    expect(snapshot.damagedAccounts).toEqual([
      { id: 'hotp-id', record: null, reason: 'invalid-record' },
      { id: 'steam-id', record: null, reason: 'invalid-record' }
    ]);

    for (const record of unsupportedRecords) {
      expect(await AsyncStorage.getItem(KEYS.accountRecord(record.id))).toBe(
        JSON.stringify(record)
      );
    }
  });

  it('rejects unsupported account types when saving records', async () => {
    const unsupportedRecord = {
      ...baseRecord,
      type: 'hotp'
    } as unknown as OtpAccountRecord;
    const unsupportedJournal = {
      kind: 'write',
      accountIds: [baseRecord.id],
      affectedIds: [baseRecord.id],
      records: [unsupportedRecord],
      secretAccountId: null,
      removeAccountId: null
    } as unknown as AccountWriteJournal;

    await expect(setAccountRecord(unsupportedRecord)).rejects.toThrow(
      'The saved account record is invalid.'
    );
    await expect(saveAccountWriteJournal(unsupportedJournal)).rejects.toThrow(
      'The account write recovery data is invalid.'
    );
    await expect(
      AsyncStorage.getItem(KEYS.accountRecord(baseRecord.id))
    ).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem(KEYS.accountWriteJournal)
    ).resolves.toBeNull();
  });

  it('replays a metadata journal without rewriting an unchanged index', async () => {
    await AsyncStorage.setItem(KEYS.accountIndex, JSON.stringify(['good-id']));
    jest.clearAllMocks();

    await applyAccountWriteJournal({
      kind: 'write',
      accountIds: ['good-id'],
      affectedIds: ['good-id'],
      records: [{ ...baseRecord, label: 'renamed@example.com' }],
      secretAccountId: null,
      removeAccountId: null,
      writeAccountIndex: false
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      KEYS.accountIndex,
      expect.any(String)
    );
    expect(await getAccountIndex()).toEqual(['good-id']);
  });

  it('rejects a parsed index with a non-string account id', async () => {
    await AsyncStorage.setItem(
      KEYS.accountIndex,
      JSON.stringify(['good-id', 5])
    );

    await expect(getAccountIndex()).rejects.toBeInstanceOf(
      CorruptAccountIndexError
    );
  });

  it('keeps invalid account IDs visible without reading their storage keys', async () => {
    await AsyncStorage.setItem(
      KEYS.accountIndex,
      JSON.stringify(['good-id', 'bad/id'])
    );
    await AsyncStorage.setItem(
      KEYS.accountRecord('good-id'),
      JSON.stringify(baseRecord)
    );
    await setSecret('good-id', 'JBSWY3DPEHPK3PXP');
    jest.clearAllMocks();

    const snapshot = await getAllAccounts();

    expect(snapshot.accountIds).toEqual(['good-id', 'bad/id']);
    expect(snapshot.accounts).toEqual([baseRecord]);
    expect(snapshot.damagedAccounts).toEqual([
      { id: 'bad/id', record: null, reason: 'invalid-account-id' }
    ]);
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith(
      KEYS.accountRecord('bad/id')
    );
    expect(getItemAsync).not.toHaveBeenCalled();
  });

  it('archives raw index data without changing the active index', async () => {
    const rawIndex = '{damaged';

    await AsyncStorage.setItem(KEYS.accountIndex, rawIndex);

    await archiveCorruptAccountIndex(rawIndex);

    expect(await AsyncStorage.getItem(KEYS.accountIndex)).toBe(rawIndex);
    const keys = await AsyncStorage.getAllKeys();
    const archiveKeys = keys.filter(key =>
      key.startsWith('totp:accounts:index:recovery:')
    );

    expect(archiveKeys).toHaveLength(1);
    expect(await AsyncStorage.getItem(archiveKeys[0]!)).toBe(rawIndex);
  });
});
