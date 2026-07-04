import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AccountList } from '@/features/account/components/account-list';
import { router } from 'expo-router';
import { SettingsIcon } from 'lucide-react-native';

export function AccountHomeScreen() {
  const handleSettingsPress = () => {
    router.push('/settings');
  };

  return (
    <View className="bg-background pt-safe flex-1 px-6">
      <View className="flex-row items-center justify-between gap-6 pt-6 pb-6">
        <Text variant="h1">Cody</Text>
        <Button
          accessibilityLabel="Open settings"
          onPress={handleSettingsPress}
          variant="outline"
          size="icon"
        >
          <Icon as={SettingsIcon} />
        </Button>
      </View>
      <AccountList />
    </View>
  );
}
