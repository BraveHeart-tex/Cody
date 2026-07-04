import { View } from 'react-native';

import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';

interface BiometricsSettingsSectionProps {
  disabled: boolean;
  onCheckedChange: (isEnabled: boolean) => void | Promise<void>;
  requireBiometrics: boolean;
}

export function BiometricsSettingsSection({
  disabled,
  onCheckedChange,
  requireBiometrics
}: BiometricsSettingsSectionProps) {
  return (
    <View className="border-border bg-card rounded-lg border p-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-card-foreground text-base font-semibold">
            Require biometrics
          </Text>
          <Text className="text-muted-foreground text-sm leading-5">
            Save a preference for biometric app lock.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Require biometrics"
          checked={requireBiometrics}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </View>
    </View>
  );
}
