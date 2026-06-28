import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export function AccountSearchInput() {
  return (
    <View className="relative w-full">
      <View
        accessibilityElementsHidden
        className="absolute top-0 left-3 z-10 h-10 justify-center sm:h-9"
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-muted-foreground text-base">🔍</Text>
      </View>
      <Input
        accessibilityLabel="Search accounts"
        className="pl-10"
        placeholder="Search"
      />
    </View>
  );
}
