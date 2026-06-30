import { Appearance, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AccountList } from '@/features/account/components/account-list';
import { MoonIcon, SunIcon } from 'lucide-react-native';

export function AccountHomeScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const handleThemeChange = () => {
    Appearance.setColorScheme(scheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <View className="bg-background pt-safe flex-1 px-6">
      <View className="flex-row items-center justify-between gap-6 pt-6 pb-6">
        <Text className="text-foreground text-4xl font-semibold">Cody</Text>
        {/* TODO: Move this to settings scren after testing */}
        <Button onPress={handleThemeChange} variant="outline" size="icon">
          <Icon as={scheme === 'dark' ? SunIcon : MoonIcon} />
        </Button>
      </View>
      <AccountList />
    </View>
  );
}
