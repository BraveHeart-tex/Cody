import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react-native';

interface SegmentedControlProps<T extends number | string> {
  disabled?: boolean;
  icons?: Partial<Record<string, LucideIcon>>;
  labels?: Partial<Record<string, string>>;
  onSelect: (value: T) => void;
  options: readonly T[];
  selectedValue: T;
  suffix?: string;
}

function SegmentedControl<T extends number | string>({
  disabled = false,
  icons,
  labels,
  onSelect,
  options,
  selectedValue,
  suffix = ''
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map(option => {
        const isSelected = option === selectedValue;
        const IconComponent = icons?.[String(option)];

        return (
          <Button
            accessibilityState={{ selected: isSelected }}
            className={cn(
              'flex-1',
              IconComponent != null && 'h-20 flex-col gap-1.5 px-2 py-4',
              isSelected && 'border-primary'
            )}
            disabled={disabled}
            key={option}
            variant={isSelected ? 'default' : 'outline'}
            onPress={() => onSelect(option)}
          >
            {IconComponent != null ? (
              <Icon as={IconComponent} size={20} />
            ) : null}
            <Text>{labels?.[String(option)] ?? `${option}${suffix}`}</Text>
          </Button>
        );
      })}
    </View>
  );
}

export { SegmentedControl };
