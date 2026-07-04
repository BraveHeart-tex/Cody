import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricsSupportStatus =
  | { isSupported: true }
  | { isSupported: false; reason: 'no-hardware' | 'not-enrolled' };

export async function getBiometricsSupportStatus(): Promise<BiometricsSupportStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();

  if (!hasHardware) {
    return { isSupported: false, reason: 'no-hardware' };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!isEnrolled) {
    return { isSupported: false, reason: 'not-enrolled' };
  }

  return { isSupported: true };
}
