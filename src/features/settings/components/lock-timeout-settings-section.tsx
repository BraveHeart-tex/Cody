import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  LOCK_TIMEOUT_SECONDS,
  type LockTimeoutSeconds
} from '@/features/settings/model/settings';
import { cn } from '@/lib/utils/cn';

const LOCK_TIMEOUT_LABELS: Record<LockTimeoutSeconds, string> = {
  0: 'Immediately',
  60: '1 min',
  300: '5 min',
  900: '15 min'
};

interface LockTimeoutSettingsSectionProps {
  disabled: boolean;
  onSelect: (value: LockTimeoutSeconds) => void | Promise<void>;
  requireBiometrics: boolean;
  selectedValue: LockTimeoutSeconds;
}

export function LockTimeoutSettingsSection({
  disabled,
  onSelect,
  requireBiometrics,
  selectedValue
}: LockTimeoutSettingsSectionProps) {
  return (
    <View className="border-border/60 bg-card gap-3 rounded-xl border p-5">
      <Text
        accessibilityRole="header"
        className="text-card-foreground text-base font-bold"
      >
        Lock timeout
      </Text>
      <Text className="text-muted-foreground text-sm leading-5">
        {requireBiometrics
          ? 'Require authentication after Cody has been in the background for:'
          : 'Turn on biometrics to choose a lock timeout.'}
      </Text>
      {requireBiometrics && (
        <View className="gap-2">
          {[
            LOCK_TIMEOUT_SECONDS.slice(0, 2),
            LOCK_TIMEOUT_SECONDS.slice(2)
          ].map((row, index) => (
            <View className="flex-row gap-2" key={index}>
              {row.map(value => (
                <Button
                  key={value}
                  variant="outline"
                  disabled={disabled}
                  accessibilityState={{ selected: value === selectedValue }}
                  className={cn(
                    'h-auto min-h-12 min-w-0 flex-1 px-2 py-3',
                    value === selectedValue &&
                      'border-primary bg-accent dark:border-primary dark:bg-accent'
                  )}
                  onPress={() => onSelect(value)}
                >
                  <Text
                    className={cn(
                      'flex-1 text-center font-semibold',
                      value === selectedValue && 'text-accent-foreground'
                    )}
                  >
                    {LOCK_TIMEOUT_LABELS[value]}
                  </Text>
                </Button>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
