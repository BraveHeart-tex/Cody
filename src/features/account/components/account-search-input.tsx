import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react-native';
import { View } from 'react-native';

export function AccountSearchInput() {
  return (
    <View className="relative w-full">
      <View
        accessibilityElementsHidden
        className="absolute top-0 left-4 z-10 h-10 justify-center sm:h-9"
        importantForAccessibility="no-hide-descendants"
      >
        <Icon as={SearchIcon} className="text-muted-foreground text-base" />
      </View>
      <Input
        accessibilityLabel="Search accounts"
        className="pl-10"
        placeholder="Search"
      />
    </View>
  );
}
