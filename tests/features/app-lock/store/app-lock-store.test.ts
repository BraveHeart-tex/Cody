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
  resetSettingsStoreForTest,
  useSettingsStore
} from '@/features/settings/store/settings-store';
import {
  resetAppLockStoreForTest,
  useAppLockStore
} from '@/features/app-lock/store/app-lock-store';

const auth = jest.mocked(authenticateBiometrics);
const read = jest.mocked(getSettings);
const write = jest.mocked(setSettings);
const config = {
  requireBiometrics: true,
  lockTimeoutSeconds: 60 as const,
  themeMode: 'system' as const
};

async function initialize(settings = config) {
  read.mockResolvedValue(settings);
  await useAppLockStore.getState().retrySettings();
}

describe('app lock controller', () => {
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

  it('fails closed on settings load failure and can retry', async () => {
    read
      .mockRejectedValueOnce(new Error('read failed'))
      .mockResolvedValueOnce(config);
    await useAppLockStore.getState().retrySettings();
    expect(useAppLockStore.getState().status).toBe('load-error');
    await useAppLockStore.getState().retrySettings();
    expect(useAppLockStore.getState().status).toBe('locked');
  });

  it('starts enabled protection locked and leaves disabled protection unlocked', async () => {
    await initialize();
    expect(useAppLockStore.getState().status).toBe('locked');
    resetAppLockStoreForTest();
    resetSettingsStoreForTest();
    read.mockResolvedValue({ ...config, requireBiometrics: false });
    await useAppLockStore.getState().retrySettings();
    expect(useAppLockStore.getState().status).toBe('unlocked');
  });

  it('uses background elapsed time, including zero timeout and exact expiry', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    await useAppLockStore.getState().authenticate();
    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(59_999);
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('unlocked');

    useAppLockStore.getState().onAppStateChange('background');
    jest.advanceTimersByTime(60_000);
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('locked');
    expect(auth).toHaveBeenCalledTimes(1);

    await useSettingsStore.getState().setLockTimeoutSeconds(0);
    useAppLockStore.getState().onAppStateChange('background');
    useAppLockStore.getState().onAppStateChange('active');
    expect(useAppLockStore.getState().status).toBe('locked');
  });

  it('does not relock for inactive biometric UI and rejects auth after real background', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize();
    let finish!: (
      result: Awaited<ReturnType<typeof authenticateBiometrics>>
    ) => void;

    auth.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const request = useAppLockStore.getState().authenticate();

    await Promise.resolve();
    useAppLockStore.getState().onAppStateChange('inactive');
    finish({ success: true });
    await request;
    expect(useAppLockStore.getState().status).toBe('unlocked');

    useAppLockStore.getState().onAppStateChange('background');
    auth.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    useAppLockStore.getState().onAppStateChange('active');
    const stale = useAppLockStore.getState().authenticate(true);

    await Promise.resolve();
    useAppLockStore.getState().onAppStateChange('background');
    finish({ success: true });
    expect(await stale).toBe(false);
    expect(useAppLockStore.getState().status).toBe('locked');
  });

  it('authenticates both protection changes and does not grant on failed persistence', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize({ ...config, requireBiometrics: false });
    write.mockRejectedValueOnce(new Error('write failed'));
    await expect(
      useAppLockStore.getState().changeProtection(true)
    ).rejects.toThrow('write failed');
    expect(auth).toHaveBeenCalledTimes(1);
  });

  it('locks after enabling if background overlaps the settings write', async () => {
    useAppLockStore.getState().onAppStateChange('active');
    await initialize({ ...config, requireBiometrics: false });
    let finishWrite!: () => void;

    write.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishWrite = resolve;
        })
    );
    const change = useAppLockStore.getState().changeProtection(true);

    for (let i = 0; i < 8 && finishWrite == null; i++) {
      await Promise.resolve();
    }

    useAppLockStore.getState().onAppStateChange('background');
    useAppLockStore.getState().onAppStateChange('active');
    finishWrite();
    expect(await change).toMatchObject({ success: false });
    expect(useSettingsStore.getState().settings.requireBiometrics).toBe(true);
    expect(useAppLockStore.getState().status).toBe('locked');
  });
});
