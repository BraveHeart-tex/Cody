import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';

export type BiometricsSupportStatus =
  | { isSupported: true }
  | {
      isSupported: false;
      reason: 'no-hardware' | 'not-enrolled' | 'weak-biometric';
    };

let authenticationInFlight = false;

export async function getBiometricsSupportStatus(): Promise<BiometricsSupportStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();

  if (!hasHardware) {
    return { isSupported: false, reason: 'no-hardware' };
  }

  if (Platform.OS === 'android') {
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!isEnrolled) {
      return { isSupported: false, reason: 'not-enrolled' };
    }

    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();

    if (enrolledLevel <= LocalAuthentication.SecurityLevel.SECRET) {
      return { isSupported: false, reason: 'not-enrolled' };
    }

    if (enrolledLevel < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      return { isSupported: false, reason: 'weak-biometric' };
    }

    return { isSupported: true };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!isEnrolled) {
    return { isSupported: false, reason: 'not-enrolled' };
  }

  return { isSupported: true };
}

export async function authenticateBiometrics(): Promise<LocalAuthentication.LocalAuthenticationResult> {
  if (authenticationInFlight) {
    return { success: false, error: 'app_cancel' };
  }

  authenticationInFlight = true;
  let backgrounded = AppState.currentState === 'background';
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'background') {
      backgrounded = true;
    }
  });

  try {
    const support = await getBiometricsSupportStatus();

    if (!support.isSupported) {
      return {
        success: false,
        error:
          support.reason === 'not-enrolled' ? 'not_enrolled' : 'not_available',
        ...(support.reason === 'weak-biometric'
          ? {
              warning:
                'Set up a strong biometric method, such as fingerprint unlock, in device settings.'
            }
          : {})
      };
    }

    if (backgrounded || AppState.currentState === 'background') {
      return { success: false, error: 'app_cancel' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: true,
      fallbackLabel: '',
      promptMessage: 'Authenticate to unlock Cody'
    });

    return backgrounded && result.success
      ? { success: false, error: 'app_cancel' }
      : result;
  } catch {
    return { success: false, error: 'unknown' };
  } finally {
    subscription.remove();
    authenticationInFlight = false;
  }
}
