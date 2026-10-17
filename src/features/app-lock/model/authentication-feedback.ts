import type { BiometricAuthenticationResult } from '@/features/settings/model/biometrics';

export type AuthenticationFailure =
  | 'cancelled'
  | 'not-enrolled'
  | 'unavailable'
  | 'weak-biometric'
  | 'lockout'
  | 'failed';

export function getAuthenticationFeedback(
  result: Exclude<BiometricAuthenticationResult, { success: true }>
): { kind: AuthenticationFailure; message: string } {
  if (['user_cancel', 'app_cancel', 'system_cancel'].includes(result.error)) {
    return { kind: 'cancelled', message: 'Authentication cancelled.' };
  }

  if (result.supportReason === 'weak-biometric') {
    return {
      kind: 'weak-biometric',
      message:
        'Set up a strong biometric method, such as fingerprint unlock, in device settings.'
    };
  }

  if (result.error === 'not_enrolled') {
    return {
      kind: 'not-enrolled',
      message: 'Set up biometrics in device settings, then try again.'
    };
  }

  if (result.error === 'not_available') {
    return {
      kind: 'unavailable',
      message:
        'This device does not currently support the biometric authentication Cody requires.'
    };
  }

  if (result.error === 'lockout') {
    return {
      kind: 'lockout',
      message:
        'Wait until your device allows biometric authentication again, then try again.'
    };
  }

  return {
    kind: 'failed',
    message: 'Authentication wasn’t completed. Please try again.'
  };
}
