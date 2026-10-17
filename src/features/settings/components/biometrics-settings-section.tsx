import { ActivityIndicator, Platform, View } from 'react-native';

import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';

interface BiometricsSettingsSectionProps {
  disabled: boolean;
  pending?: boolean;
  onCheckedChange: (isEnabled: boolean) => void | Promise<void>;
  requireBiometrics: boolean;
}

export function BiometricsSettingsSection({
  disabled,
  pending = false,
  onCheckedChange,
  requireBiometrics
}: BiometricsSettingsSectionProps) {
  return (
    <View className="border-border/60 bg-card gap-3 rounded-xl border p-5">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-card-foreground text-base font-bold">
            Require biometrics
          </Text>
          <Text className="text-muted-foreground text-sm leading-5">
            {Platform.OS === 'ios'
              ? 'Protect Cody with Face ID or Touch ID.'
              : 'Protect Cody with strong biometric authentication.'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Require biometrics"
          checked={requireBiometrics}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </View>
      {pending && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator className="text-primary" />
          <Text
            accessibilityLiveRegion="polite"
            className="text-muted-foreground flex-1 text-sm leading-5"
          >
            Confirming security change…
          </Text>
        </View>
      )}
    </View>
  );
}
