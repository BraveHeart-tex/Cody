import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StateCard } from '@/components/ui/state-card';
import { Text } from '@/components/ui/text';
import { AccountCard } from '@/features/account/components/account-card';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { AccountSearchInput } from '@/features/account/components/account-search-input';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { router } from 'expo-router';
import { PlusIcon } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';

const ACCOUNT_LIST_BATCH_SIZE = 12;
const ACCOUNT_LIST_WINDOW_SIZE = 7;

export function AccountList() {
  const { accounts, deleteAccount, error, isLoading } = useAccounts();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredAccounts = useMemo(
    () => filterAccounts(accounts, searchQuery),
    [accounts, searchQuery]
  );

  const handleAddPress = useCallback(() => {
    router.push('/add-account');
  }, []);

  const handleMovePress = useCallback(() => {
    router.push('/move-accounts');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setActiveAccountId(null);
  }, []);

  const handleAccountPress = useCallback((accountId: string) => {
    setActiveAccountId(currentId =>
      currentId === accountId ? null : accountId
    );
  }, []);

  const handleAccountDelete = useCallback(
    async (accountId: string) => {
      await deleteAccount(accountId);
      setActiveAccountId(null);
      router.replace('/');
    },
    [deleteAccount]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OtpAccount>) => (
      <AccountCard
        account={item}
        isActive={item.id === activeAccountId}
        onDelete={handleAccountDelete}
        onMove={handleMovePress}
        onPress={handleAccountPress}
      />
    ),
    [activeAccountId, handleAccountDelete, handleAccountPress, handleMovePress]
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
        filteredAccounts.length === 0
          ? 'flex-grow gap-3 pb-safe'
          : 'gap-3 pb-safe'
      }
      data={filteredAccounts}
      initialNumToRender={ACCOUNT_LIST_BATCH_SIZE}
      keyExtractor={keyExtractor}
      ListFooterComponent={
        filteredAccounts.length > 0 ? ListFooterSpacer : null
      }
      ListHeaderComponent={
        <AccountListHeaderSection
          accountCount={accounts.length}
          onSearchChange={handleSearchChange}
          onAddPress={handleAddPress}
          searchQuery={searchQuery}
        />
      }
      ListEmptyComponent={
        accounts.length === 0 ? AccountListEmpty : AccountListNoSearchResults
      }
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

function filterAccounts(accounts: OtpAccount[], searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return accounts;
  }

  return accounts.filter(account => {
    const issuer = account.issuer.toLowerCase();
    const label = account.label.toLowerCase();

    return issuer.includes(normalizedQuery) || label.includes(normalizedQuery);
  });
}

interface AccountListHeaderProps {
  accountCount: number;
  onAddPress: () => void;
}

interface AccountListHeaderSectionProps extends AccountListHeaderProps {
  onSearchChange: (value: string) => void;
  searchQuery: string;
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
        className="text-base"
      >
        <Icon as={PlusIcon} />
        <Text>Add</Text>
      </Button>
    </View>
  );
}

function AccountListHeaderSection(props: AccountListHeaderSectionProps) {
  return (
    <View className="gap-5">
      <AccountSearchInput
        onChangeText={props.onSearchChange}
        value={props.searchQuery}
      />
      <AccountListHeader
        accountCount={props.accountCount}
        onAddPress={props.onAddPress}
      />
    </View>
  );
}

function ListFooterSpacer() {
  return <View className="h-8" />;
}

function AccountListEmpty() {
  return (
    <View className="flex-1 justify-start">
      {/* TODO: FE-232 Replace this simple card with the polished illustrated empty state. */}
      <StateCard
        description="Scan a QR code or enter a setup key to add your first account."
        title="No accounts yet"
      />
    </View>
  );
}

function AccountListNoSearchResults() {
  return (
    <View className="flex-1 justify-start">
      <StateCard
        description="Try a different issuer or account label."
        title="No matching accounts"
      />
    </View>
  );
}
