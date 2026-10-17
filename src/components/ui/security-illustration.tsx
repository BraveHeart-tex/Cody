import { useColorScheme, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { THEME } from '@/theme';

interface SecurityIllustrationProps {
  variant?: 'lock' | 'attention';
}

export function SecurityIllustration({
  variant = 'lock'
}: SecurityIllustrationProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? THEME.dark : THEME.light;

  return (
    <View
      testID={`security-illustration-${variant}`}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      className="size-28 shrink-0"
    >
      <Svg width="100%" height="100%" viewBox="0 0 128 128" accessible={false}>
        <Rect
          x={18}
          y={46}
          width={80}
          height={60}
          rx={14}
          transform="rotate(-8 58 76)"
          fill={theme.accent}
        />
        <Path
          d="M44 64V42a20 20 0 0 1 40 0v22"
          fill="none"
          stroke={theme.accentForeground}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <Rect
          x={28}
          y={54}
          width={72}
          height={58}
          rx={12}
          fill={theme.primary}
        />
        <Path
          d="M39 72v-4a3 3 0 0 1 3-3h12"
          fill="none"
          stroke={theme.primaryForeground}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d="M64 76a5 5 0 0 0-2 9.58V91a2 2 0 0 0 4 0v-5.42A5 5 0 0 0 64 76Z"
          fill={theme.primaryForeground}
        />
        {variant === 'attention' && (
          <>
            <Circle cx={99} cy={99} r={16} fill={theme.background} />
            <Circle
              cx={99}
              cy={99}
              r={13.5}
              fill={theme.destructive}
              fillOpacity={0.12}
              stroke={theme.destructive}
              strokeWidth={1.5}
            />
            <Path
              d="M99 92v7"
              stroke={theme.destructive}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Circle cx={99} cy={104} r={1.5} fill={theme.destructive} />
          </>
        )}
      </Svg>
    </View>
  );
}
