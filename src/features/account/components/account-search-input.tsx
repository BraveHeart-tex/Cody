import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

interface AccountSearchInputProps {
  onClear: () => void;
  onChangeText: (value: string) => void;
  value: string;
}

export function AccountSearchInput({
  onClear,
  onChangeText,
  value
}: AccountSearchInputProps) {
  return (
    <View className="relative w-full">
      <View
        accessibilityElementsHidden
        className="absolute top-0 left-4 z-10 h-11 justify-center"
        importantForAccessibility="no-hide-descendants"
      >
        <Icon as={SearchIcon} className="text-muted-foreground text-base" />
      </View>
      <Input
        accessibilityLabel="Search accounts"
        className="pr-12 pl-10 focus-visible:border-2 focus-visible:ring-0 focus-visible:ring-offset-0"
        onChangeText={onChangeText}
        placeholder="Search accounts..."
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          className="absolute top-0 right-0 z-10 h-11 w-11 items-center justify-center rounded-md"
          onPress={onClear}
        >
          <Icon as={XIcon} className="text-muted-foreground" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}
