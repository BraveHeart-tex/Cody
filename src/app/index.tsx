import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { AccountList } from '@/features/account/components/account-list';

export default function Index() {
  return (
    <View className="bg-background pt-safe flex-1 px-6">
      <View className="gap-6 pt-6 pb-6">
        <Text className="text-foreground text-4xl font-semibold">Cody</Text>
      </View>
      <AccountList />
    </View>
  );
}
