import { useLayoutEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { THEME } from '@/theme';

const RING_SIZE = 48;
const STROKE_WIDTH = 3;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  periodStartedAt: number;
  periodEndsAt: number;
  seconds: number;
}

export function CountdownRing({
  periodStartedAt,
  periodEndsAt,
  seconds
}: CountdownRingProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? THEME.dark : THEME.light;
  const progress = useSharedValue(1);

  useLayoutEffect(() => {
    const now = Date.now();

    progress.value = getRemainingProgress(now, periodStartedAt, periodEndsAt);
    progress.value = withTiming(0, {
      duration: Math.max(periodEndsAt - now, 0),
      easing: Easing.linear
    });
  }, [periodEndsAt, periodStartedAt, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -RING_CIRCUMFERENCE * (1 - progress.value)
  }));

  return (
    <View
      accessibilityLabel={`${seconds} seconds remaining`}
      className="h-12 w-12 shrink-0 items-center justify-center"
      testID="totp-countdown-ring"
    >
      <Svg
        height={RING_SIZE}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        width={RING_SIZE}
      >
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          fill="none"
          r={RING_RADIUS}
          stroke={theme.border}
          strokeWidth={STROKE_WIDTH}
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={RING_CENTER}
          cy={RING_CENTER}
          fill="none"
          r={RING_RADIUS}
          stroke={theme.primary}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
          testID="totp-countdown-ring-progress"
        />
      </Svg>

      <Text className="text-muted-foreground text-sm font-semibold">
        {seconds}
      </Text>
    </View>
  );
}

export function getRemainingProgress(
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
