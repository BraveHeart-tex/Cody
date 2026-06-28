import { Text } from '@/components/ui/text';
import { View } from 'react-native';

interface CenteredStateProps {
  action?: React.ReactNode;
  description: string;
  title: string;
}

export function CenteredState({
  action,
  description,
  title
}: CenteredStateProps) {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-5 px-8">
      <View className="gap-2">
        <Text className="text-foreground text-center text-2xl font-semibold">
          {title}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {description}
        </Text>
      </View>
      {action}
    </View>
  );
}
