import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';

export default function Index() {
  const { accounts, error, isLoading } = useAccounts();

  return (
    <View className="bg-background flex-1 px-6 py-16">
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-4xl font-semibold text-neutral-950">Cody</Text>
          <Text className="text-base leading-6 text-neutral-600">
            Your saved authenticator accounts.
          </Text>
        </View>

        <Button onPress={() => router.push('/scan')}>
          <Text>Scan QR Code</Text>
        </Button>
      </View>

      <ScrollView className="mt-8" contentContainerClassName="gap-3 pb-8">
        {isLoading ? (
          <StateText value="Loading saved accounts..." />
        ) : error != null ? (
          <StateText value="Could not load saved accounts." />
        ) : accounts.length === 0 ? (
          <View className="rounded-lg border border-dashed border-neutral-300 px-5 py-8">
            <Text className="text-center text-lg font-semibold text-neutral-950">
              No accounts yet
            </Text>
            <Text className="mt-2 text-center text-base leading-6 text-neutral-600">
              Scan a TOTP QR code to add your first account.
            </Text>
          </View>
        ) : (
          accounts.map(account => (
            <View
              className="rounded-lg border border-neutral-200 px-4 py-4"
              key={account.id}
            >
              <Text className="text-lg font-semibold text-neutral-950">
                {account.issuer || 'Unknown issuer'}
              </Text>
              <Text className="mt-1 text-base text-neutral-600">
                {account.label}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface StateTextProps {
  value: string;
}

function StateText({ value }: StateTextProps) {
  return (
    <View className="rounded-lg border border-neutral-200 px-5 py-6">
      <Text className="text-center text-base font-semibold text-neutral-700">
        {value}
      </Text>
    </View>
  );
}
