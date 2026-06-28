import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { useTotpCountdown } from '@/features/totp/hooks/use-totp-countdown';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';

const DEFAULT_PERIOD = 30;
const CODE_PLACEHOLDER = '------';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, error, isLoading } = useAccounts();
  const account = useMemo(
    () => accounts.find(currentAccount => currentAccount.id === id),
    [accounts, id]
  );

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pt-safe pb-safe"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-4 pt-6">
        <Button
          className="self-start"
          variant="outline"
          onPress={handleBackPress}
        >
          <Text>Back</Text>
        </Button>
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-semibold">
            Account details
          </Text>
          <Text className="text-muted-foreground text-base leading-6">
            Review this authenticator account.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <DetailSkeleton />
      ) : error != null ? (
        <StateCard
          description="Try closing and reopening the app. Your saved secrets were not changed."
          title="Could not load account"
        />
      ) : account == null ? (
        <StateCard
          description="This account may have been removed or is no longer available on this device."
          title="Account not found"
        />
      ) : (
        <AccountDetails account={account} />
      )}
    </ScrollView>
  );
}

interface AccountDetailsProps {
  account: OtpAccount;
}

function AccountDetails({ account }: AccountDetailsProps) {
  const period = account.period ?? DEFAULT_PERIOD;
  const countdown = useTotpCountdown(period);
  const code =
    generateTotpCode({
      secret: account.secret,
      algorithm: account.algorithm,
      period,
      digits: account.digits,
      timestamp: countdown.periodStartedAt
    }) || CODE_PLACEHOLDER;

  return (
    <Card className="rounded-lg py-0">
      <CardHeader className="gap-2 py-6">
        <CardTitle className="text-2xl">
          {account.issuer || 'Unknown issuer'}
        </CardTitle>
        <CardDescription className="text-base">{account.label}</CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="gap-5 py-6">
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-muted-foreground text-sm font-medium">
              Current code
            </Text>
            {/* TODO: FE-229 Make this code tap-to-copy with haptic confirmation. */}
            <Text className="text-foreground font-mono text-5xl font-semibold">
              {code}
            </Text>
          </View>
          {/* TODO: FE-222 Swap this numeric placeholder for the animated countdown ring. */}
          <View className="border-border h-14 w-14 items-center justify-center rounded-full border">
            <Text className="text-muted-foreground text-base font-semibold">
              {countdown.remainingSeconds}
            </Text>
          </View>
        </View>

        <Separator />

        <View className="gap-4">
          <DetailRow label="Type" value={account.type.toUpperCase()} />
          <DetailRow label="Algorithm" value={account.algorithm} />
          <DetailRow label="Digits" value={String(account.digits)} />
          <DetailRow label="Period" value={`${period} seconds`} />
        </View>

        {/* TODO: FE-227 Add edit controls; FE-228 adds the destructive delete sheet. */}
      </CardContent>
    </Card>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-muted-foreground text-sm font-medium">{label}</Text>
      <Text className="text-foreground shrink text-right text-base font-semibold">
        {value}
      </Text>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <Card className="gap-5 rounded-lg px-6 py-6">
      <View className="gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-56" />
      </View>
      <Separator />
      <View className="flex-row items-center justify-between gap-4">
        <Skeleton className="h-12 w-44" />
        <Skeleton className="h-14 w-14 rounded-full" />
      </View>
      <Separator />
      <View className="gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </View>
    </Card>
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
