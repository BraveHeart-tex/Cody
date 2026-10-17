import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Camera, ShieldCheck } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

export function ScannerPermissionState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="grow items-center justify-center gap-8 px-8 py-8 pb-safe"
    >
      <View className="bg-accent rounded-full p-6">
        <Icon as={Camera} className="text-accent-foreground size-10" />
      </View>
      <View className="w-full gap-3">
        <Text
          accessibilityRole="header"
          className="text-foreground text-center text-2xl font-bold"
        >
          {title}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {description}
        </Text>
      </View>
      {action != null ? <View className="w-full">{action}</View> : null}
      <View className="flex-row justify-center gap-2">
        <Icon
          as={ShieldCheck}
          className="text-muted-foreground mt-0.5 size-4"
        />
        <Text className="text-muted-foreground shrink text-center text-xs leading-5">
          Camera access is only used to scan setup QR codes.
        </Text>
      </View>
    </ScrollView>
  );
}
