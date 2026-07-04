import { memo, useLayoutEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';

interface AccountCountdownProgressProps {
  color: string;
  period: number;
  periodEndsAt: number;
  periodStartedAt: number;
  remainingSeconds: number;
}

const FILL_DURATION_MS = 200;

export const AccountCountdownProgress = memo(function AccountCountdownProgress({
  color,
  period,
  periodEndsAt,
  periodStartedAt,
  remainingSeconds
}: AccountCountdownProgressProps) {
  const initialProgress = getRemainingProgress(
    Date.now(),
    periodStartedAt,
    periodEndsAt
  );
  const animatedProgress = useSharedValue(initialProgress);
  const isFirstRunRef = useRef(true);

  useLayoutEffect(() => {
    const now = Date.now();
    const remainingDuration = Math.max(periodEndsAt - now, 0);

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      animatedProgress.value = getRemainingProgress(
        now,
        periodStartedAt,
        periodEndsAt
      );

      animatedProgress.value = withTiming(0, {
        duration: remainingDuration,
        easing: Easing.linear
      });

      return;
    }

    animatedProgress.value = withSequence(
      withTiming(1, {
        duration: FILL_DURATION_MS,
        easing: Easing.out(Easing.cubic)
      }),
      withTiming(0, {
        duration: Math.max(remainingDuration - FILL_DURATION_MS, 0),
        easing: Easing.linear
      })
    );
  }, [animatedProgress, periodEndsAt, periodStartedAt]);

  const progressStyle = useAnimatedStyle<ViewStyle>(
    () => ({
      backgroundColor: color,
      transform: [{ scaleX: animatedProgress.value }],
      width: '100%'
    }),
    [color]
  );

  return (
    <View
      accessibilityLabel={`${remainingSeconds}s until refresh`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: period,
        min: 0,
        now: remainingSeconds
      }}
      className="bg-muted h-1 overflow-hidden rounded-full"
      testID="account-card-progress"
    >
      <Animated.View className="h-full rounded-full" style={progressStyle} />
    </View>
  );
});

function getRemainingProgress(
  timestamp: number,
  periodStartedAt: number,
  periodEndsAt: number
): number {
  const periodDuration = periodEndsAt - periodStartedAt;

  if (periodDuration <= 0) {
    return 0;
  }

  return clamp((periodEndsAt - timestamp) / periodDuration, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
