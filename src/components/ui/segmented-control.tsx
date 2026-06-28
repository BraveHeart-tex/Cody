import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';

interface SegmentedControlProps<T extends number> {
  onSelect: (value: T) => void;
  options: T[];
  selectedValue: T;
  suffix?: string;
}

function SegmentedControl<T extends number>({
  onSelect,
  options,
  selectedValue,
  suffix = ''
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map(option => {
        const isSelected = option === selectedValue;

        return (
          <Button
            accessibilityState={{ selected: isSelected }}
            className={cn('flex-1', isSelected && 'border-primary')}
            key={option}
            variant={isSelected ? 'default' : 'outline'}
            onPress={() => onSelect(option)}
          >
            <Text>
              {option}
              {suffix}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}

export { SegmentedControl };
