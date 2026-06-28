import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';

interface FieldProps {
  children: React.ReactNode;
  isInvalid?: boolean;
  label: string;
  labelClassName?: string;
  labelTestID?: string;
  required?: boolean;
}

function Field({
  children,
  isInvalid = false,
  label,
  labelClassName,
  labelTestID,
  required = false
}: FieldProps) {
  return (
    <View className="gap-2">
      <Text
        className={cn(
          'text-foreground text-sm font-semibold',
          labelClassName,
          isInvalid && 'text-destructive'
        )}
        testID={labelTestID}
      >
        {label}
        {required ? (
          <Text className="text-destructive text-sm font-semibold"> *</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

export { Field };
