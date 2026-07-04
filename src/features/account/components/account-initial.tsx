import { Text } from '@/components/ui/text';
import { View, type ViewStyle } from 'react-native';

interface AccountInitialProps {
  initial: string;
  style: ViewStyle;
}

export function AccountInitial({ initial, style }: AccountInitialProps) {
  return (
    <View
      accessibilityLabel={`Account icon ${initial}`}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={style}
    >
      <Text className="text-primary-foreground text-lg font-semibold">
        {initial}
      </Text>
    </View>
  );
}
