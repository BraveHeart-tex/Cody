import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StateCard } from '@/components/ui/state-card';
import { Text } from '@/components/ui/text';
import { AccountCard } from '@/features/account/components/account-card';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { AccountSearchInput } from '@/features/account/components/account-search-input';
import { DamagedAccountCard } from '@/features/account/components/damaged-account-card';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  CorruptAccountIndexError,
  type DamagedAccount
} from '@/features/totp/storage/totp-storage';
import { router } from 'expo-router';
import {
  KeyboardIcon,
  PlusIcon,
  QrCodeIcon,
  ShieldCheckIcon
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, type ListRenderItemInfo, View } from 'react-native';

const ACCOUNT_LIST_BATCH_SIZE = 12;
const ACCOUNT_LIST_WINDOW_SIZE = 7;

export function AccountList() {
  const {
    accounts,
    accountIds,
    damagedAccounts,
    deleteAccount,
    error,
    isLoading,
    removeDamagedAccount,
    retryAccount,
    retryLoad,
    startReaddingAccounts
  } = useAccounts();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listItems = useMemo(
    () => buildAccountListItems(accountIds, accounts, damagedAccounts),
    [accountIds, accounts, damagedAccounts]
  );
  const filteredItems = useMemo(
    () => filterAccountListItems(listItems, searchQuery),
    [listItems, searchQuery]
  );

  const handleAddPress = useCallback(() => {
    router.push('/add-account');
  }, []);

  const handleScanPress = useCallback(() => {
    router.push('/scan');
  }, []);

  const handleManualPress = useCallback(() => {
    router.push('/add-account/manual');
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
    },
    [deleteAccount]
  );

  const handleReaddAccounts = useCallback(() => {
    Alert.alert(
      'Re-add saved accounts?',
      'Cody will archive the damaged account index and start a new list. Saved account records and secrets will remain on this device, but you will need the original setup keys or QR codes to add accounts again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            void startReaddingAccounts().catch(() => undefined);
          }
        }
      ]
    );
  }, [startReaddingAccounts]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AccountListItem>) =>
      item.kind === 'damaged' ? (
        <DamagedAccountCard
          account={item.account}
          onRemove={removeDamagedAccount}
          onRetry={retryAccount}
        />
      ) : (
        <AccountCard
          account={item.account}
          isActive={item.account.id === activeAccountId}
          onDelete={handleAccountDelete}
          onMove={accounts.length > 1 ? handleMovePress : undefined}
          onPress={handleAccountPress}
        />
      ),
    [
      accounts.length,
      activeAccountId,
      handleAccountDelete,
      handleAccountPress,
      handleMovePress,
      removeDamagedAccount,
      retryAccount
    ]
  );

  if (isLoading) {
    return <AccountListSkeleton showHeader />;
  }

  if (error != null) {
    return (
      <View className="gap-3">
        <StateCard
          description={
            error instanceof CorruptAccountIndexError
              ? 'The saved account list is damaged. Retry, or start a new list and add accounts again with their original setup keys or QR codes.'
              : 'Cody could not read the saved accounts. Retry to try again.'
          }
          title="Could not load saved accounts"
        />
        <Button
          accessibilityLabel="Retry loading saved accounts"
          onPress={() => void retryLoad().catch(() => undefined)}
          variant="outline"
        >
          <Text>Retry</Text>
        </Button>
        {error instanceof CorruptAccountIndexError ? (
          <Button
            accessibilityLabel="Re-add accounts"
            onPress={handleReaddAccounts}
            variant="destructive"
          >
            <Text>Re-add accounts</Text>
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1"
      contentContainerClassName={
        filteredItems.length === 0 ? 'flex-grow gap-3 pb-safe' : 'gap-3 pb-safe'
      }
      data={filteredItems}
      initialNumToRender={ACCOUNT_LIST_BATCH_SIZE}
      keyExtractor={keyExtractor}
      ListFooterComponent={filteredItems.length > 0 ? ListFooterSpacer : null}
      ListHeaderComponent={
        <AccountListHeaderSection
          accountCount={accountIds.length}
          onSearchChange={handleSearchChange}
          onAddPress={handleAddPress}
          searchQuery={searchQuery}
        />
      }
      ListEmptyComponent={
        accountIds.length === 0 ? (
          <AccountListEmpty
            onManualPress={handleManualPress}
            onScanPress={handleScanPress}
          />
        ) : (
          AccountListNoSearchResults
        )
      }
      maxToRenderPerBatch={ACCOUNT_LIST_BATCH_SIZE}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      windowSize={ACCOUNT_LIST_WINDOW_SIZE}
    />
  );
}

type AccountListItem =
  | { kind: 'account'; account: OtpAccount }
  | { kind: 'damaged'; account: DamagedAccount };

function buildAccountListItems(
  accountIds: string[],
  accounts: OtpAccount[],
  damagedAccounts: DamagedAccount[]
): AccountListItem[] {
  const accountsById = new Map(accounts.map(account => [account.id, account]));
  const damagedById = new Map(
    damagedAccounts.map(account => [account.id, account])
  );

  return accountIds.flatMap<AccountListItem>(id => {
    const account = accountsById.get(id);

    if (account != null) {
      return [{ kind: 'account' as const, account }];
    }

    const damagedAccount = damagedById.get(id);

    return damagedAccount == null
      ? []
      : [{ kind: 'damaged' as const, account: damagedAccount }];
  });
}

function keyExtractor(item: AccountListItem): string {
  return item.account.id;
}

function filterAccountListItems(
  items: AccountListItem[],
  searchQuery: string
): AccountListItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return items;
  }

  return items.filter(item => {
    const issuer =
      item.kind === 'account'
        ? item.account.issuer
        : (item.account.record?.issuer ?? '');
    const label =
      item.kind === 'account'
        ? item.account.label
        : (item.account.record?.label ?? item.account.id);

    return (
      issuer.toLowerCase().includes(normalizedQuery) ||
      label.toLowerCase().includes(normalizedQuery)
    );
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
      <Text variant="h3">{title}</Text>
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
  if (props.accountCount === 0) {
    return null;
  }

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

interface AccountListEmptyProps {
  onManualPress: () => void;
  onScanPress: () => void;
}

function AccountListEmpty({
  onManualPress,
  onScanPress
}: AccountListEmptyProps) {
  return (
    <View className="flex-1 items-center justify-center px-2 py-10">
      <View className="w-full max-w-sm items-center gap-6">
        <View className="border-border bg-card size-16 items-center justify-center rounded-full border">
          <Icon as={ShieldCheckIcon} className="text-primary" size={28} />
        </View>

        <View className="gap-2">
          <Text className="text-foreground text-center text-2xl font-semibold">
            Add your first account
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            Scan an authenticator QR code or enter a setup key to start saving
            codes in Cody.
          </Text>
        </View>

        <View className="w-full gap-3">
          <Button
            accessibilityLabel="Scan QR code"
            onPress={onScanPress}
            size="lg"
          >
            <Icon as={QrCodeIcon} />
            <Text>Scan QR Code</Text>
          </Button>
          <Button
            accessibilityLabel="Add manually"
            onPress={onManualPress}
            size="lg"
            variant="outline"
          >
            <Icon as={KeyboardIcon} />
            <Text>Add Manually</Text>
          </Button>
        </View>
      </View>
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
