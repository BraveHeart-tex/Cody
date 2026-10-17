/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  archiveCorruptAccountIndex,
  CorruptAccountIndexError,
  getAllAccounts,
  getAccountIndex,
  KEYS,
  setSecret
} from '@/features/totp/storage/totp-storage';
import type { OtpAccountRecord } from '@/features/totp/model/totp-account';

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

  it('surfaces malformed record JSON and missing record-secret pairs', async () => {
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
      { ...baseRecord, secret: 'JBSWY3DPEHPK3PXP' }
    ]);
    expect(snapshot.damagedAccounts).toEqual([
      { id: 'bad-json-id', record: null, reason: 'invalid-record-json' },
      {
        id: 'missing-secret-id',
        record: { ...baseRecord, id: 'missing-secret-id' },
        reason: 'missing-secret'
      },
      { id: 'missing-record-id', record: null, reason: 'missing-record' }
    ]);
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
