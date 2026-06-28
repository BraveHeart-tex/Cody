import { Button } from '@/components/ui/button';
import { StateCard } from '@/components/ui/state-card';
import { Text } from '@/components/ui/text';
import { AccountCard } from '@/features/account/components/account-card';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { AccountSearchInput } from '@/features/account/components/account-search-input';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';

const ACCOUNT_LIST_BATCH_SIZE = 12;
const ACCOUNT_LIST_WINDOW_SIZE = 7;

export function AccountList() {
  const { accounts, error, isLoading } = useAccounts();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const handleAddPress = useCallback(() => {
    router.push('/add-account');
  }, []);

  const handleAccountPress = useCallback((accountId: string) => {
    setActiveAccountId(currentId =>
      currentId === accountId ? null : accountId
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OtpAccount>) => (
      <AccountCard
        account={item}
        isActive={item.id === activeAccountId}
        onPress={handleAccountPress}
      />
    ),
    [activeAccountId, handleAccountPress]
  );

  if (isLoading) {
    return <AccountListSkeleton />;
  }

  if (error != null) {
    return (
      <StateCard
        description="Try closing and reopening the app. Your saved secrets were not changed."
        title="Could not load saved accounts"
      />
    );
  }

  return (
    <FlatList
      className="flex-1"
      contentContainerClassName={
        accounts.length === 0 ? 'flex-grow gap-3 pb-safe' : 'gap-3 pb-safe'
      }
      data={accounts}
      initialNumToRender={ACCOUNT_LIST_BATCH_SIZE}
      keyExtractor={keyExtractor}
      ListFooterComponent={accounts.length > 0 ? ListFooterSpacer : null}
      ListHeaderComponent={
        <AccountListHeaderSection
          accountCount={accounts.length}
          onAddPress={handleAddPress}
        />
      }
      ListEmptyComponent={AccountListEmpty}
      maxToRenderPerBatch={ACCOUNT_LIST_BATCH_SIZE}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={ACCOUNT_LIST_WINDOW_SIZE}
    />
  );
}

function keyExtractor(account: OtpAccount): string {
  return account.id;
}

interface AccountListHeaderProps {
  accountCount: number;
  onAddPress: () => void;
}

function AccountListHeader({
  accountCount,
  onAddPress
}: AccountListHeaderProps) {
  const title = accountCount > 0 ? `Accounts (${accountCount})` : 'Accounts';

  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-foreground text-xl font-semibold">{title}</Text>
      <Button
        accessibilityLabel="Add account"
        onPress={onAddPress}
        size="sm"
        variant="ghost"
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          ➕
        </Text>
        <Text>Add</Text>
      </Button>
    </View>
  );
}

function AccountListHeaderSection(props: AccountListHeaderProps) {
  return (
    <View className="gap-5">
      <AccountSearchInput />
      <AccountListHeader {...props} />
    </View>
  );
}

function ListFooterSpacer() {
  return <View className="h-8" />;
}

function AccountListEmpty() {
  return (
    <View className="flex-1 justify-center">
      {/* TODO: FE-232 Replace this simple card with the polished illustrated empty state. */}
      <StateCard
        description="Scan a QR code or enter a setup key to add your first account."
        title="No accounts yet"
      />
    </View>
  );
}
