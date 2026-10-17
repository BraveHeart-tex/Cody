import { afterEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETTINGS,
  type AppSettings
} from '@/features/settings/model/settings';
import {
  getSettings,
  SETTINGS_STORAGE_KEY,
  setSettings
} from '@/features/settings/storage/settings-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const storage = jest.mocked(AsyncStorage);

describe('settings storage', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns default settings when nothing is stored', async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('persists and restores settings', async () => {
    const settings: AppSettings = {
      lockTimeoutSeconds: 300,
      requireBiometrics: true,
      themeMode: 'dark'
    };

    await setSettings(settings);

    expect(storage.setItem).toHaveBeenCalledWith(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
    await expect(getSettings()).resolves.toEqual(settings);
  });

  it('throws an explicit error for invalid JSON', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{');

    await expect(getSettings()).rejects.toThrow(
      'Stored app settings contain invalid JSON.'
    );
  });

  it.each([
    ['missing security flag', { themeMode: 'dark' }],
    ['invalid security flag', { requireBiometrics: 'true' }],
    ['array record', []]
  ])('rejects %s', async (_label, record) => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(record));

    await expect(getSettings()).rejects.toThrow();
  });

  it('normalizes invalid persisted fields independently', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        lockTimeoutSeconds: 123,
        requireBiometrics: true,
        themeMode: 'purple'
      })
    );

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      requireBiometrics: true
    });
  });
});
