/* eslint-disable import/first */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

jest.mock('@/features/settings/model/biometrics', () => ({
  authenticateBiometrics: jest.fn()
}));
jest.mock('@/features/settings/storage/settings-storage', () => ({
  getSettings: jest.fn(),
  setSettings: jest.fn()
}));

import { authenticateBiometrics } from '@/features/settings/model/biometrics';
import {
  getSettings,
  setSettings
} from '@/features/settings/storage/settings-storage';
import {
  resetAppLockStoreForTest,
  useAppLockStore
} from '@/features/app-lock/store/app-lock-store';
import {
  resetSettingsStoreForTest,
  useSettingsStore
} from '@/features/settings/store/settings-store';

const auth = jest.mocked(authenticateBiometrics);
const read = jest.mocked(getSettings);
const write = jest.mocked(setSettings);
const enabledSettings = {
  requireBiometrics: true,
  lockTimeoutSeconds: 60 as const,
  themeMode: 'system' as const
};
const disabledSettings = { ...enabledSettings, requireBiometrics: false };

async function initialize(settings = enabledSettings) {
  read.mockResolvedValue(settings);
  await useAppLockStore.getState().retrySettings();
}

describe('app lock security regressions', () => {
  beforeEach(() => {
    resetAppLockStoreForTest();
    resetSettingsStoreForTest();
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    auth.mockResolvedValue({ success: true });
    write.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetAppLockStoreForTest();
    resetSettingsStoreForTest();
    jest.resetAllMocks();
  });

  it('does not resume after cold-start cancellation or a later failed unlock', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    auth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });

    expect(await useAppLockStore.getState().authenticate()).toBe(false);
    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(1_000);
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('locked');
    expect(useAppLockStore.getState().hasUnlocked).toBe(false);

    expect(await useAppLockStore.getState().authenticate()).toBe(true);
    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(60_000);
    useAppLockStore.getState().onAppStateChange('active');
    auth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await useAppLockStore.getState().authenticate()).toBe(false);
    useAppLockStore.getState().onAppStateChange('background');
    useAppLockStore.getState().onAppStateChange('active');

    expect(useAppLockStore.getState().status).toBe('locked');
    expect(useAppLockStore.getState().hasUnlocked).toBe(true);
    expect(auth).toHaveBeenCalledTimes(3);
  });

  it('stays locked when enablement persists after a background transition', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize(disabledSettings);
    let finishWrite!: () => void;

    write.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishWrite = resolve;
        })
    );
    const change = useAppLockStore.getState().changeProtection(true);

    for (let attempt = 0; attempt < 8 && finishWrite == null; attempt++) {
      await Promise.resolve();
    }

    useAppLockStore.getState().onAppStateChange('background');
    useAppLockStore.getState().onAppStateChange('active');
    finishWrite();

    expect(await change).toMatchObject({ success: false });
    expect(useSettingsStore.getState().settings.requireBiometrics).toBe(true);
    expect(useAppLockStore.getState().status).toBe('locked');
  });

  it('does not grant grace when the system clock moves backward', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    await useAppLockStore.getState().authenticate();
    useAppLockStore.getState().onAppStateChange('background');
    jest.setSystemTime(999_999);
    useAppLockStore.getState().onAppStateChange('active');

    expect(useAppLockStore.getState().status).toBe('locked');
  });

  it('applies a committed disable after returning while its write is pending', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    expect(await useAppLockStore.getState().authenticate()).toBe(true);
    let finishWrite!: () => void;
    let markWriteStarted!: () => void;
    const writeStarted = new Promise<void>(resolve => {
      markWriteStarted = resolve;
    });

    write.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishWrite = resolve;
          markWriteStarted();
        })
    );
    const change = useAppLockStore.getState().changeProtection(false);

    await writeStarted;

    useAppLockStore.getState().onAppStateChange('background');
    useAppLockStore.getState().onAppStateChange('active');
    finishWrite();

    expect(await change).toMatchObject({ success: true });
    expect(useSettingsStore.getState().settings.requireBiometrics).toBe(false);
    expect(useAppLockStore.getState().status).toBe('unlocked');
  });

  it.each([false, true])(
    'does not write after failed authentication when changing protection from %s',
    async initialValue => {
      useAppLockStore.getState().onAppStateChange('active');
      await initialize({ ...enabledSettings, requireBiometrics: initialValue });

      if (initialValue) {
        expect(await useAppLockStore.getState().authenticate()).toBe(true);
      }

      auth.mockClear();
      auth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
      expect(
        await useAppLockStore.getState().changeProtection(!initialValue)
      ).toMatchObject({ success: false });
      expect(write).not.toHaveBeenCalled();
      expect(useSettingsStore.getState().settings.requireBiometrics).toBe(
        initialValue
      );
    }
  );

  it.each([false, true])(
    'preserves protection %s when a successful auth cannot persist',
    async initialValue => {
      useAppLockStore.getState().onAppStateChange('active');
      await initialize({ ...enabledSettings, requireBiometrics: initialValue });

      if (initialValue) {
        expect(await useAppLockStore.getState().authenticate()).toBe(true);
      }

      write.mockRejectedValueOnce(new Error('write failed'));

      await expect(
        useAppLockStore.getState().changeProtection(!initialValue)
      ).rejects.toThrow('write failed');

      expect(useSettingsStore.getState().settings.requireBiometrics).toBe(
        initialValue
      );
      expect(useAppLockStore.getState().status).toBe('unlocked');
    }
  );

  it('rejects protection changes while locked or while another operation runs', async () => {
    await initialize();
    expect(
      await useAppLockStore.getState().changeProtection(false)
    ).toMatchObject({
      success: false
    });

    useAppLockStore.getState().onAppStateChange('active');
    await useAppLockStore.getState().authenticate();
    let finishAuth!: (
      result: Awaited<ReturnType<typeof authenticateBiometrics>>
    ) => void;

    auth.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishAuth = resolve;
        })
    );
    const disabling = useAppLockStore.getState().changeProtection(false);

    for (let attempt = 0; attempt < 8 && finishAuth == null; attempt++) {
      await Promise.resolve();
    }

    expect(
      await useAppLockStore.getState().changeProtection(true)
    ).toMatchObject({
      success: false
    });
    expect(auth).toHaveBeenCalledTimes(2);
    finishAuth({ success: true });
    expect(await disabling).toMatchObject({ success: true });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('does not lock from foreground inactivity alone', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    await useAppLockStore.getState().authenticate();
    jest.advanceTimersByTime(24 * 60 * 60 * 1_000);

    expect(useAppLockStore.getState().status).toBe('unlocked');
    expect(auth).toHaveBeenCalledTimes(1);
  });

  it('keeps grace through inactive and does not restart the timeout on duplicate background', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    await useAppLockStore.getState().authenticate();
    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(30_000);
    useAppLockStore.getState().onAppStateChange('inactive');
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('unlocked');

    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(30_000);
    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(30_000);
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('locked');
    expect(useAppLockStore.getState().lastBackgroundAt).toBe(1_030_000);
  });

  it('does not automatically authenticate while startup state is unknown', async () => {
    await initialize();

    expect(useAppLockStore.getState().appState).toBe('unknown');
    expect(useAppLockStore.getState().status).toBe('locked');
    expect(auth).not.toHaveBeenCalled();
  });
});
