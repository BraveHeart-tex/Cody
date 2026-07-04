import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { BiometricsSettingsSection } from '@/features/settings/components/biometrics-settings-section';
import { LockTimeoutSettingsSection } from '@/features/settings/components/lock-timeout-settings-section';
import { ThemeSettingsSection } from '@/features/settings/components/theme-settings-section';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { getBiometricsSupportStatus } from '@/features/settings/model/biometrics';

const BIOMETRIC_SUPPORT_MESSAGES = {
  'no-hardware': 'This device does not support biometric authentication.',
  'not-enrolled':
    'Set up Face ID, Touch ID, or fingerprint unlock on this device first.'
} as const;

export function SettingsScreen() {
  const {
    error,
    isLoading,
    saveError,
    setLockTimeoutSeconds,
    setRequireBiometrics,
    setThemeMode,
    settings
  } = useSettings();
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(false);

  const storageMessage =
    error != null || saveError != null
      ? 'Settings storage is unavailable.'
      : null;
  const statusMessage = biometricMessage ?? storageMessage;
  const isBiometricsDisabled =
    isLoading || isCheckingBiometrics || storageMessage != null;
  const isTimeoutDisabled =
    isLoading || !settings.requireBiometrics || storageMessage != null;

  const handleBiometricsChange = useCallback(
    async (isEnabled: boolean) => {
      setBiometricMessage(null);

      if (!isEnabled) {
        try {
          await setRequireBiometrics(false);
        } catch {
          // The store records saveError for display.
        }

        return;
      }

      setIsCheckingBiometrics(true);

      try {
        const supportStatus = await getBiometricsSupportStatus();

        if (!supportStatus.isSupported) {
          setBiometricMessage(BIOMETRIC_SUPPORT_MESSAGES[supportStatus.reason]);

          return;
        }

        try {
          await setRequireBiometrics(true);
        } catch {
          // The store records saveError for display.
        }
      } catch {
        setBiometricMessage('Biometric support could not be checked.');
      } finally {
        setIsCheckingBiometrics(false);
      }
    },
    [setRequireBiometrics]
  );
  const handleLockTimeoutSelect = useCallback(
    async (value: typeof settings.lockTimeoutSeconds) => {
      try {
        await setLockTimeoutSeconds(value);
      } catch {
        // The store records saveError for display.
      }
    },
    [setLockTimeoutSeconds]
  );
  const handleThemeSelect = useCallback(
    async (value: typeof settings.themeMode) => {
      try {
        await setThemeMode(value);
      } catch {
        // The store records saveError for display.
      }
    },
    [setThemeMode]
  );

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pb-safe"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-2">
        <Text className="text-muted-foreground text-base leading-6">
          App preferences stay on this device.
        </Text>
      </View>

      <View className="gap-5">
        <BiometricsSettingsSection
          disabled={isBiometricsDisabled}
          requireBiometrics={settings.requireBiometrics}
          onCheckedChange={handleBiometricsChange}
        />

        <LockTimeoutSettingsSection
          disabled={isTimeoutDisabled}
          requireBiometrics={settings.requireBiometrics}
          selectedValue={settings.lockTimeoutSeconds}
          onSelect={handleLockTimeoutSelect}
        />

        <ThemeSettingsSection
          selectedValue={settings.themeMode}
          onSelect={handleThemeSelect}
        />
      </View>

      {statusMessage != null ? <StatusMessage value={statusMessage} /> : null}
    </ScrollView>
  );
}
