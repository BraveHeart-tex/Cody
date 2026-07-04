import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  LinearTransition
} from 'react-native-reanimated';

import { Field } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import {
  LOCK_TIMEOUT_SECONDS,
  type LockTimeoutSeconds
} from '@/features/settings/model/settings';

const LOCK_TIMEOUT_LABELS: Record<LockTimeoutSeconds, string> = {
  0: 'None',
  60: '1 min',
  300: '5 min',
  900: '15 min'
};

const LOCK_TIMEOUT_LAYOUT_TRANSITION = LinearTransition.springify()
  .damping(20)
  .stiffness(200);

const LOCK_TIMEOUT_ENTERING = FadeInUp.springify()
  .damping(20)
  .stiffness(200)
  .withInitialValues({ transform: [{ translateY: -6 }] });

const LOCK_TIMEOUT_EXITING = FadeOutUp.duration(140).easing(
  Easing.in(Easing.cubic)
);

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
    <Animated.View className="gap-2" layout={LOCK_TIMEOUT_LAYOUT_TRANSITION}>
      <Field label="Lock timeout">
        {requireBiometrics ? (
          <Animated.View
            entering={LOCK_TIMEOUT_ENTERING}
            exiting={LOCK_TIMEOUT_EXITING}
            key="lock-timeout-options"
            layout={LOCK_TIMEOUT_LAYOUT_TRANSITION}
          >
            <SegmentedControl
              disabled={disabled}
              labels={LOCK_TIMEOUT_LABELS}
              options={LOCK_TIMEOUT_SECONDS}
              selectedValue={selectedValue}
              onSelect={onSelect}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={LOCK_TIMEOUT_ENTERING}
            exiting={LOCK_TIMEOUT_EXITING}
            key="lock-timeout-message"
            layout={LOCK_TIMEOUT_LAYOUT_TRANSITION}
          >
            <Text className="text-muted-foreground text-sm leading-5">
              Turn on biometrics to choose a lock timeout.
            </Text>
          </Animated.View>
        )}
      </Field>
    </Animated.View>
  );
}
