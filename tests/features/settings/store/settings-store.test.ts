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

  it('applies the theme before persistence completes', async () => {
    await useSettingsStore.getState().loadSettings();
    let finishSave!: () => void;

    mockSetSettings.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishSave = resolve;
        })
    );

    const save = useSettingsStore.getState().setThemeMode('dark');

    expect(useSettingsStore.getState().settings.themeMode).toBe('dark');
    await Promise.resolve();
    finishSave();
    await save;
  });

  it('coalesces queued selections and persists only the latest theme', async () => {
    await useSettingsStore.getState().loadSettings();
    await Promise.all([
      useSettingsStore.getState().setThemeMode('dark'),
      useSettingsStore.getState().setThemeMode('light'),
      useSettingsStore.getState().setThemeMode('system')
    ]);
    expect(mockSetSettings).toHaveBeenCalledTimes(1);
    expect(mockSetSettings).toHaveBeenLastCalledWith(storedSettings);
    expect(useSettingsStore.getState().settings.themeMode).toBe('system');
  });

  it('keeps the session theme on save failure and allows retrying it', async () => {
    await useSettingsStore.getState().loadSettings();
    const failure = new Error('disk unavailable');

    mockSetSettings.mockRejectedValueOnce(failure);
    await expect(
      useSettingsStore.getState().setThemeMode('dark')
    ).rejects.toThrow(failure);
    expect(useSettingsStore.getState().settings.themeMode).toBe('dark');
    expect(useSettingsStore.getState().saveError).toBe(failure);

    await useSettingsStore.getState().setThemeMode('dark');
    expect(mockSetSettings).toHaveBeenCalledTimes(2);
    expect(useSettingsStore.getState().saveError).toBeNull();
  });

  it('does not let an older failed save replace a newer selection', async () => {
    await useSettingsStore.getState().loadSettings();
    let failSave!: (cause: Error) => void;

    mockSetSettings.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          failSave = reject;
        })
    );
    const first = useSettingsStore.getState().setThemeMode('dark');
    const rejected = expect(first).rejects.toThrow('disk unavailable');

    await Promise.resolve();
    const latest = useSettingsStore.getState().setThemeMode('light');

    failSave(new Error('disk unavailable'));
    await rejected;
    await latest;
    expect(useSettingsStore.getState().settings.themeMode).toBe('light');
    expect(useSettingsStore.getState().saveError).toBeNull();
    expect(mockSetSettings).toHaveBeenLastCalledWith({
      ...storedSettings,
      themeMode: 'light'
    });
  });

  it('preserves a theme selected during a biometric settings write', async () => {
    await useSettingsStore.getState().loadSettings();
    let finishSave!: () => void;

    mockSetSettings.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishSave = resolve;
        })
    );
    const biometricSave = useSettingsStore
      .getState()
      .setRequireBiometrics(true);

    await Promise.resolve();
    await Promise.resolve();
    const themeSave = useSettingsStore.getState().setThemeMode('dark');

    finishSave();
    await biometricSave;
    expect(useSettingsStore.getState().settings.themeMode).toBe('dark');
    await themeSave;
    expect(mockSetSettings).toHaveBeenLastCalledWith({
      ...storedSettings,
      requireBiometrics: true,
      themeMode: 'dark'
    });
  });

  it('does not save an unchanged theme', async () => {
    await useSettingsStore.getState().setThemeMode('system');
    expect(mockSetSettings).not.toHaveBeenCalled();
  });

  it('ignores invalid theme values', async () => {
    await useSettingsStore
      .getState()
      .setThemeMode('purple' as AppSettings['themeMode']);

    expect(mockSetSettings).not.toHaveBeenCalled();
  });
});
