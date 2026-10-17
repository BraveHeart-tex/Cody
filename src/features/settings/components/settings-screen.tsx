import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

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
  const [isChangingProtection, setIsChangingProtection] = useState(false);
  const changeProtection = useAppLockStore(state => state.changeProtection);

  const storageMessage =
    error != null || saveError != null
      ? 'Settings storage is unavailable.'
      : null;
  const statusMessage = biometricMessage ?? storageMessage;
  const isBiometricsDisabled =
    isLoading || isChangingProtection || storageMessage != null;
  const isTimeoutDisabled =
    isLoading ||
    isChangingProtection ||
    !settings.requireBiometrics ||
    storageMessage != null;

  const handleBiometricsChange = useCallback(
    async (isEnabled: boolean) => {
      setBiometricMessage(null);
      setIsChangingProtection(true);

      try {
        const result = await changeProtection(isEnabled);

        if (!result.success) {
          setBiometricMessage(result.message);
        }
      } catch {
        // The settings store records persistence errors for display.
      } finally {
        setIsChangingProtection(false);
      }
    },
    [changeProtection]
  );
  const handleLockTimeoutSelect = useCallback(
    async (value: LockTimeoutSeconds) => {
      try {
        await setLockTimeoutSeconds(value);
      } catch {
        // The store records saveError for display.
      }
    },
    [setLockTimeoutSeconds]
  );
  const handleThemeSelect = useCallback(
    async (value: ThemeMode) => {
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
