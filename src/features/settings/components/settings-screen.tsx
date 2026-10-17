import { ShieldCheck } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { AuthenticationFailure } from '@/features/app-lock/model/authentication-feedback';
import { BiometricGuidance } from '@/features/settings/components/biometric-guidance';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { useAppLockStore } from '@/features/app-lock/store/app-lock-store';
import { BiometricsSettingsSection } from '@/features/settings/components/biometrics-settings-section';
import { LockTimeoutSettingsSection } from '@/features/settings/components/lock-timeout-settings-section';
import { ThemeSettingsSection } from '@/features/settings/components/theme-settings-section';
import { useSettings } from '@/features/settings/hooks/use-settings';
import type {
  LockTimeoutSeconds,
  ThemeMode
} from '@/features/settings/model/settings';

export function SettingsScreen() {
  const {
    error,
    isLoading,
    saveError,
    setLockTimeoutSeconds,
    setThemeMode,
    settings
  } = useSettings();
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [biometricKind, setBiometricKind] =
    useState<AuthenticationFailure | null>(null);
  const [biometricsReady, setBiometricsReady] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const securityMutation = useRef(false);
  const [isChangingProtection, setIsChangingProtection] = useState(false);
  const changeProtection = useAppLockStore(state => state.changeProtection);

  const storageMessage =
    error != null ? 'Settings storage is unavailable.' : null;
  const isBiometricsDisabled =
    isLoading ||
    isChangingProtection ||
    isSavingTimeout ||
    storageMessage != null;
  const isTimeoutDisabled =
    isLoading ||
    isChangingProtection ||
    isSavingTimeout ||
    !settings.requireBiometrics ||
    storageMessage != null;

  const handleBiometricsAvailable = useCallback(() => {
    setBiometricsReady(true);
    setBiometricKind(null);
    setBiometricMessage(
      'Biometrics are ready. Try changing protection again to confirm your identity.'
    );
  }, []);
  const handleBiometricsChange = useCallback(
    async (isEnabled: boolean) => {
      if (securityMutation.current) {
        return;
      }

      securityMutation.current = true;
      setBiometricsReady(false);
      setBiometricMessage(null);
      setBiometricKind(null);
      setIsChangingProtection(true);

      try {
        const result = await changeProtection(isEnabled);

        if (!result.success) {
          setBiometricMessage(result.message);
          setBiometricKind(result.kind ?? null);
        }
      } catch {
        setBiometricMessage(
          'Couldn’t save biometric protection. Your previous setting is unchanged.'
        );
      } finally {
        securityMutation.current = false;
        setIsChangingProtection(false);
      }
    },
    [changeProtection]
  );
  const handleLockTimeoutSelect = useCallback(
    async (value: LockTimeoutSeconds) => {
      if (securityMutation.current) {
        return;
      }

      securityMutation.current = true;
      setIsSavingTimeout(true);
      setTimeoutMessage(null);

      try {
        await setLockTimeoutSeconds(value);
      } catch {
        setTimeoutMessage(
          'Couldn’t save your lock timeout. Your previous setting is unchanged.'
        );
      } finally {
        securityMutation.current = false;
        setIsSavingTimeout(false);
      }
    },
    [setLockTimeoutSeconds]
  );
  const handleThemeSelect = useCallback(
    async (value: ThemeMode) => {
      setThemeMessage(null);

      try {
        await setThemeMode(value);
      } catch {
        setThemeMessage(
          'Couldn’t save your theme preference. Try selecting it again.'
        );
      }
    },
    [setThemeMode]
  );

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pt-4 pb-safe"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-2">
        <Text className="text-muted-foreground text-base leading-6">
          App preferences stay on this device.
        </Text>
      </View>

      <View className="gap-3">
        <Text
          accessibilityRole="header"
          className="text-muted-foreground text-xs font-bold tracking-widest uppercase"
        >
          Security
        </Text>
        <BiometricsSettingsSection
          disabled={isBiometricsDisabled}
          pending={isChangingProtection}
          requireBiometrics={settings.requireBiometrics}
          onCheckedChange={handleBiometricsChange}
        />

        {biometricMessage &&
          (biometricKind === 'cancelled' || biometricsReady ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-muted-foreground text-sm leading-5"
            >
              {biometricMessage}
              {biometricKind === 'cancelled'
                ? ' No settings were changed.'
                : ''}
            </Text>
          ) : (
            <StatusMessage value={biometricMessage} />
          ))}
        {(biometricKind === 'not-enrolled' ||
          biometricKind === 'weak-biometric') && (
          <BiometricGuidance onAvailable={handleBiometricsAvailable} />
        )}
        <LockTimeoutSettingsSection
          disabled={isTimeoutDisabled}
          requireBiometrics={settings.requireBiometrics}
          selectedValue={settings.lockTimeoutSeconds}
          onSelect={handleLockTimeoutSelect}
        />

        {isSavingTimeout && (
          <Text
            accessibilityLiveRegion="polite"
            className="text-muted-foreground text-sm"
          >
            Saving lock timeout…
          </Text>
        )}
        {timeoutMessage && <StatusMessage value={timeoutMessage} />}
        <View className="bg-accent mt-2 flex-row items-start gap-3 rounded-xl p-4">
          <Icon
            as={ShieldCheck}
            className="text-accent-foreground mt-0.5"
            size={18}
          />
          <Text className="text-accent-foreground flex-1 text-sm leading-5">
            Biometric checks use your device’s system prompt. Cody doesn’t store
            your fingerprint or face data.
          </Text>
        </View>
        <Text className="text-muted-foreground text-sm leading-5">
          {settings.requireBiometrics
            ? 'Changing biometric protection requires you to confirm your identity.'
            : 'Biometric protection is off. Re-enabling it requires device authentication.'}
        </Text>
      </View>
      <View className="gap-3 pb-6">
        <ThemeSettingsSection
          selectedValue={settings.themeMode}
          onSelect={handleThemeSelect}
        />
      </View>

      {themeMessage && <StatusMessage value={themeMessage} />}
      {storageMessage != null ? (
        <StatusMessage value={storageMessage} />
      ) : saveError != null &&
        !biometricMessage &&
        !timeoutMessage &&
        !themeMessage ? (
        <StatusMessage value="Settings storage is unavailable. Try your change again." />
      ) : null}
    </ScrollView>
  );
}
