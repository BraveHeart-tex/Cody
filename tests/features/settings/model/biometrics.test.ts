import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';

import {
  authenticateBiometrics,
  getBiometricsSupportStatus
} from '@/features/settings/model/biometrics';

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn()
}));

const auth = jest.mocked(LocalAuthentication);
const originalPlatform = Platform.OS;
let appStateListener: ((state: string) => void) | undefined;
let removeListener: jest.Mock;

describe('biometrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    appStateListener = undefined;
    removeListener = jest.fn();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: string) => void;

        return { remove: removeListener } as ReturnType<
          typeof AppState.addEventListener
        >;
      });
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(true);
    auth.getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
    );
    auth.authenticateAsync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
    jest.restoreAllMocks();
  });

  it('requires strong biometrics on Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    auth.getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK
    );

    await expect(getBiometricsSupportStatus()).resolves.toEqual({
      isSupported: false,
      reason: 'weak-biometric'
    });
    expect(auth.isEnrolledAsync).toHaveBeenCalled();
  });

  it('accepts strong Android enrollment and rejects PIN-only enrollment', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });

    await expect(getBiometricsSupportStatus()).resolves.toEqual({
      isSupported: true
    });

    auth.getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.SECRET
    );
    await expect(getBiometricsSupportStatus()).resolves.toEqual({
      isSupported: false,
      reason: 'not-enrolled'
    });
  });

  it('reports Android without enrolled biometrics as not-enrolled', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    auth.isEnrolledAsync.mockResolvedValue(false);

    await expect(getBiometricsSupportStatus()).resolves.toEqual({
      isSupported: false,
      reason: 'not-enrolled'
    });
    expect(auth.getEnrolledLevelAsync).not.toHaveBeenCalled();
  });

  it('uses a biometric-only prompt policy', async () => {
    await expect(authenticateBiometrics()).resolves.toEqual({ success: true });
    expect(auth.authenticateAsync).toHaveBeenCalledWith({
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: true,
      fallbackLabel: '',
      promptMessage: 'Authenticate to unlock Cody'
    });
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('maps unsupported hardware and enrollment to native errors', async () => {
    auth.hasHardwareAsync.mockResolvedValue(false);
    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'not_available'
    });

    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(false);
    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'not_enrolled'
    });
  });

  it('includes actionable guidance for weak Android biometrics', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    auth.getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK
    );

    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'not_available',
      warning:
        'Set up a strong biometric method, such as fingerprint unlock, in device settings.'
    });
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it('converts native exceptions to a failure result', async () => {
    auth.authenticateAsync.mockRejectedValue(new Error('native failure'));
    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'unknown'
    });
  });

  it('cleans up after a support-check exception', async () => {
    auth.hasHardwareAsync.mockRejectedValue(new Error('availability failed'));

    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'unknown'
    });
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('does not open the prompt if backgrounded while checking availability', async () => {
    let finishHardwareCheck: ((available: boolean) => void) | undefined;

    auth.hasHardwareAsync.mockReturnValue(
      new Promise(resolve => {
        finishHardwareCheck = resolve;
      })
    );
    const authentication = authenticateBiometrics();

    appStateListener?.('background');
    finishHardwareCheck?.(true);

    await expect(authentication).resolves.toEqual({
      success: false,
      error: 'app_cancel'
    });
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('discards success if the app entered background during authentication', async () => {
    auth.authenticateAsync.mockImplementation(async () => {
      appStateListener?.('background');

      return { success: true };
    });

    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'app_cancel'
    });
  });

  it('does not discard success for the iOS inactive prompt transition', async () => {
    auth.authenticateAsync.mockImplementation(async () => {
      appStateListener?.('inactive');

      return { success: true };
    });

    await expect(authenticateBiometrics()).resolves.toEqual({ success: true });
  });

  it('rejects overlapping native prompts as app-cancelled', async () => {
    let finishPrompt:
      | ((result: LocalAuthentication.LocalAuthenticationResult) => void)
      | undefined;

    auth.authenticateAsync.mockReturnValue(
      new Promise(resolve => {
        finishPrompt = resolve;
      })
    );
    const first = authenticateBiometrics();

    await expect(authenticateBiometrics()).resolves.toEqual({
      success: false,
      error: 'app_cancel'
    });
    finishPrompt?.({ success: true });
    await expect(first).resolves.toEqual({ success: true });
  });
});
