import {
  Fingerprint,
  LockKeyhole,
  RotateCcw,
  ShieldCheck
} from 'lucide-react-native';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SecurityIllustration } from '@/components/ui/security-illustration';
import { Text } from '@/components/ui/text';
import type { AuthenticationFailure } from '@/features/app-lock/model/authentication-feedback';
import { BiometricGuidance } from '@/features/settings/components/biometric-guidance';

type LockScreenProps = {
  status: 'initializing' | 'load-error' | 'locked' | 'unlocked';
  active: boolean;
  isAuthenticating: boolean;
  failureKind: AuthenticationFailure | null;
  failureMessage: string | null;
  onRetry: () => void;
  onUnlock: () => void;
};

export function LockScreen({
  status,
  active,
  isAuthenticating,
  failureKind,
  failureMessage,
  onRetry,
  onUnlock
}: LockScreenProps) {
  const loading = status === 'initializing';
  const loadError = status === 'load-error';
  const kind = status === 'locked' && !isAuthenticating ? failureKind : null;
  const needsSetup = kind === 'not-enrolled' || kind === 'weak-biometric';
  const title = loading
    ? 'Checking security settings'
    : loadError
      ? 'Could not load security settings'
      : kind === 'not-enrolled'
        ? 'Set up biometrics first'
        : kind === 'weak-biometric'
          ? 'Strong biometrics required'
          : kind === 'unavailable'
            ? 'Biometrics unavailable'
            : kind === 'lockout'
              ? 'Biometrics temporarily locked'
              : 'Cody is locked';
  const description = loading
    ? 'Preparing your private space on this device.'
    : loadError
      ? 'Cody can’t verify your protection preferences right now.'
      : kind != null && kind !== 'cancelled' && kind !== 'failed'
        ? failureMessage
        : 'Authenticate to access your codes.';
  const attention =
    loadError ||
    (status === 'locked' &&
      !isAuthenticating &&
      kind !== 'cancelled' &&
      !!failureMessage);
  const canUnlock = status === 'locked' && active;
  const label = isAuthenticating
    ? 'Authenticating…'
    : kind === 'unavailable' || kind === 'weak-biometric'
      ? 'Check again'
      : kind === 'not-enrolled' || kind === 'lockout' || kind === 'failed'
        ? 'Try again'
        : 'Unlock with biometrics';

  return (
    <View
      className="bg-background pt-safe absolute inset-0 z-50"
      accessibilityViewIsModal
    >
      <ScrollView contentContainerClassName="grow px-8 pb-safe" bounces={false}>
        <View
          className="flex-row items-center justify-center gap-2 py-6"
          accessible
          accessibilityLabel="Cody"
        >
          <View className="bg-accent rounded-lg p-2">
            <Icon as={LockKeyhole} className="text-primary" size={18} />
          </View>
          <View className="w-16">
            <Text className="w-full text-lg font-bold">Cody</Text>
          </View>
        </View>
        <View className="grow items-center justify-center py-10">
          <View className="w-full max-w-sm items-center">
            <View className="mb-6">
              <SecurityIllustration
                variant={attention ? 'attention' : 'lock'}
              />
            </View>
            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              className="w-full text-center text-3xl font-extrabold tracking-tight"
            >
              {title}
            </Text>
            <Text className="text-muted-foreground mt-3 w-full text-center text-base leading-6">
              {description}
            </Text>
            {loading && (
              <ActivityIndicator
                className="text-primary mt-6"
                accessibilityLabel="Loading security settings"
              />
            )}
            {loadError && (
              <View className="bg-accent mt-6 w-full flex-row items-start gap-3 rounded-xl p-4">
                <Icon
                  as={ShieldCheck}
                  className="text-accent-foreground mt-0.5"
                  size={18}
                />
                <Text className="text-accent-foreground flex-1 text-sm leading-5">
                  Account content stays hidden until security settings load
                  successfully.
                </Text>
              </View>
            )}
            {(loadError || canUnlock) && (
              <Button
                className="mt-7 h-auto min-h-12 w-full py-3"
                disabled={isAuthenticating}
                accessibilityLabel={loadError ? 'Retry loading' : label}
                accessibilityState={{ busy: isAuthenticating }}
                onPress={loadError ? onRetry : onUnlock}
              >
                {isAuthenticating ? (
                  <ActivityIndicator className="text-primary-foreground" />
                ) : (
                  <Icon as={loadError ? RotateCcw : Fingerprint} size={20} />
                )}
                <Text className="flex-1 text-center text-base font-semibold">
                  {loadError ? 'Retry loading' : label}
                </Text>
              </Button>
            )}
            {needsSetup && <BiometricGuidance />}
            {isAuthenticating ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-muted-foreground mt-4 w-full text-center text-sm leading-5"
              >
                Confirm your identity in the system dialog.
              </Text>
            ) : kind === 'cancelled' || kind === 'failed' ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-muted-foreground mt-4 w-full text-center text-sm leading-5"
              >
                {failureMessage}
              </Text>
            ) : kind === 'unavailable' ? (
              <Text className="text-muted-foreground mt-4 w-full text-center text-sm leading-5">
                There is no app PIN or device passcode fallback.
              </Text>
            ) : null}
          </View>
        </View>
        <View className="w-full max-w-xs flex-row items-center justify-center gap-2 self-center pb-6">
          <Icon as={ShieldCheck} className="text-muted-foreground" size={14} />
          <Text className="text-muted-foreground flex-1 text-center text-xs">
            Protected on this device
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
