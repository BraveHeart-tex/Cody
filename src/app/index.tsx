import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  View,
  type ListRenderItemInfo
} from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import {
  useTotpCountdown,
  type TotpCountdownState
} from '@/features/totp/hooks/use-totp-countdown';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';

const DEFAULT_PERIOD = 30;
const CODE_PLACEHOLDER = '------';
const ACCOUNT_LIST_BATCH_SIZE = 12;
const ACCOUNT_LIST_WINDOW_SIZE = 7;
const LOADING_ROW_COUNT = 4;

export default function Index() {
  const { accounts, error, isLoading } = useAccounts();
  const thirtySecondCountdown = useTotpCountdown(30);
  const sixtySecondCountdown = useTotpCountdown(60);

  const handleAddPress = useCallback(() => {
    router.push('/scan');
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OtpAccount>) => (
      <AccountCard
        account={item}
        countdown={
          item.period === 60 ? sixtySecondCountdown : thirtySecondCountdown
        }
      />
    ),
    [sixtySecondCountdown, thirtySecondCountdown]
  );

  return (
    <View className="bg-background pt-safe flex-1 px-6">
      <View className="gap-6 pt-6 pb-6">
        <View className="gap-2">
          <Text className="text-foreground text-4xl font-semibold">Cody</Text>
          <Text className="text-muted-foreground text-base leading-6">
            Your saved authenticator accounts.
          </Text>
        </View>

        <Button onPress={handleAddPress}>
          <Text>Scan QR Code</Text>
        </Button>
      </View>

      {isLoading ? (
        <LoadingList />
      ) : error != null ? (
        <StateCard
          description="Try closing and reopening the app. Your saved secrets were not changed."
          title="Could not load saved accounts"
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName={
            accounts.length === 0 ? 'flex-grow pb-safe' : 'gap-3 pb-safe'
          }
          data={accounts}
          initialNumToRender={ACCOUNT_LIST_BATCH_SIZE}
          keyExtractor={keyExtractor}
          ListFooterComponent={accounts.length > 0 ? ListFooterSpacer : null}
          ListEmptyComponent={EmptyState}
          maxToRenderPerBatch={ACCOUNT_LIST_BATCH_SIZE}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          windowSize={ACCOUNT_LIST_WINDOW_SIZE}
        />
      )}
    </View>
  );
}

function keyExtractor(account: OtpAccount): string {
  return account.id;
}

interface AccountCardProps {
  account: OtpAccount;
  countdown: TotpCountdownState;
}

const AccountCard = memo(function AccountCard({
  account,
  countdown
}: AccountCardProps) {
  const period = account.period ?? DEFAULT_PERIOD;
  const code =
    generateTotpCode({
      secret: account.secret,
      algorithm: account.algorithm,
      period,
      digits: account.digits,
      timestamp: countdown.periodStartedAt
    }) || CODE_PLACEHOLDER;

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/account/[id]',
      params: { id: account.id }
    });
  }, [account.id]);

  return (
    <Pressable
      accessibilityLabel={`Open ${account.issuer || 'Unknown issuer'} account`}
      accessibilityRole="button"
      onPress={handlePress}
    >
      <Card className="gap-4 rounded-lg px-0 py-4">
        <CardHeader className="flex-row items-start justify-between gap-4 px-4">
          <View className="min-w-0 flex-1 gap-1">
            <CardTitle className="text-foreground text-lg" numberOfLines={1}>
              {account.issuer || 'Unknown issuer'}
            </CardTitle>
            <CardDescription className="text-base" numberOfLines={1}>
              {account.label}
            </CardDescription>
          </View>
          <CountdownBadge seconds={countdown.remainingSeconds} />
        </CardHeader>

        <CardContent className="px-4">
          <Text className="text-foreground font-mono text-4xl font-semibold">
            {code}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
});

interface CountdownBadgeProps {
  seconds: number;
}

function CountdownBadge({ seconds }: CountdownBadgeProps) {
  return (
    // TODO: FE-222 Swap this numeric placeholder for the animated countdown ring.
    <View className="border-border h-12 w-12 shrink-0 items-center justify-center rounded-full border">
      <Text className="text-muted-foreground text-sm font-semibold">
        {seconds}
      </Text>
    </View>
  );
}

function LoadingList() {
  return (
    <View className="pb-safe gap-3">
      {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
        <Card className="gap-4 rounded-lg px-4 py-4" key={index}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </View>
            <Skeleton className="h-12 w-12 rounded-full" />
          </View>
          <Skeleton className="h-10 w-40" />
        </Card>
      ))}
    </View>
  );
}

function ListFooterSpacer() {
  return <View className="h-8" />;
}

function EmptyState() {
  return (
    <View className="flex-1 justify-center">
      {/* TODO: FE-232 Replace this simple card with the polished illustrated empty state. */}
      <StateCard
        description="Scan a TOTP QR code to add your first account."
        title="No accounts yet"
      />
    </View>
  );
}

interface StateCardProps {
  description: string;
  title: string;
}

function StateCard({ description, title }: StateCardProps) {
  return (
    <Card className="gap-2 rounded-lg border-dashed px-5 py-8">
      <CardTitle className="text-foreground text-center text-lg">
        {title}
      </CardTitle>
      <CardDescription className="text-center text-base leading-6">
        {description}
      </CardDescription>
    </Card>
  );
}
