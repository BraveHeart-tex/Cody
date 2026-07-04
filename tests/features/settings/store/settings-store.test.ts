/* eslint-disable import/first */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import type { AppSettings } from '@/features/settings/model/settings';

jest.mock('@/features/settings/storage/settings-storage', () => ({
  getSettings: jest.fn(),
  setSettings: jest.fn()
}));

import {
  getSettings,
  setSettings
} from '@/features/settings/storage/settings-storage';
import {
  resetSettingsStoreForTest,
  useSettingsStore
} from '@/features/settings/store/settings-store';

const mockGetSettings = jest.mocked(getSettings);
const mockSetSettings = jest.mocked(setSettings);

const storedSettings: AppSettings = {
  lockTimeoutSeconds: 60,
  requireBiometrics: false,
  themeMode: 'system'
};

describe('settings store', () => {
  beforeEach(() => {
    resetSettingsStoreForTest();
    mockGetSettings.mockResolvedValue(storedSettings);
    mockSetSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetSettingsStoreForTest();
    jest.resetAllMocks();
  });

  it('loads settings once', async () => {
    await Promise.all([
      useSettingsStore.getState().loadSettings(),
      useSettingsStore.getState().loadSettings()
    ]);

    expect(mockGetSettings).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState()).toMatchObject({
      isLoading: false,
      loadStatus: 'loaded',
      settings: storedSettings
    });
  });

  it('persists biometric changes', async () => {
    await useSettingsStore.getState().setRequireBiometrics(true);

    expect(mockSetSettings).toHaveBeenCalledWith({
      ...storedSettings,
      requireBiometrics: true
    });
    expect(useSettingsStore.getState().settings.requireBiometrics).toBe(true);
  });

  it('blocks timeout changes while biometrics are disabled', async () => {
    await useSettingsStore.getState().loadSettings();
    await useSettingsStore.getState().setLockTimeoutSeconds(300);

    expect(mockSetSettings).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().settings.lockTimeoutSeconds).toBe(60);
  });

  it('persists allowed timeout changes when biometrics are enabled', async () => {
    mockGetSettings.mockResolvedValueOnce({
      ...storedSettings,
      requireBiometrics: true
    });

    await useSettingsStore.getState().setLockTimeoutSeconds(300);

    expect(mockSetSettings).toHaveBeenCalledWith({
      ...storedSettings,
      lockTimeoutSeconds: 300,
      requireBiometrics: true
    });
  });

  it('ignores invalid theme values', async () => {
    await useSettingsStore
      .getState()
      .setThemeMode('purple' as AppSettings['themeMode']);

    expect(mockSetSettings).not.toHaveBeenCalled();
  });
});
