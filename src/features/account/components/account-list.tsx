import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { AccountCard } from '@/features/account/components/account-card';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { AccountSearchInput } from '@/features/account/components/account-search-input';
import { DamagedAccountCard } from '@/features/account/components/damaged-account-card';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import type { StoredOtpAccount } from '@/features/totp/model/totp-account';
import {
  CorruptAccountIndexError,
  type DamagedAccount
} from '@/features/totp/storage/totp-storage';
import { router } from 'expo-router';
import {
  DatabaseIcon,
  KeyboardIcon,
  PlusIcon,
  QrCodeIcon,
  SearchIcon,
  ShieldAlertIcon,
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
    accountSecretLoading,
    damagedAccounts,
    deleteAccount,
    error,
    isLoading,
    loadAccountSecret,
    removeDamagedAccount,
    retryAccount,
    retryLoad,
    startReaddingAccounts
  } = useAccounts();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [operationFeedback, setOperationFeedback] = useState<{
    message: string;
    variant: 'error' | 'success';
  } | null>(null);
  const [readdError, setReaddError] = useState<string | null>(null);
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
      const deletedIssuer =
        accounts.find(account => account.id === accountId)?.issuer ?? 'Account';

      setOperationFeedback(null);

      try {
        await deleteAccount(accountId);
        setActiveAccountId(null);
        setOperationFeedback({
          message: `${deletedIssuer} deleted.`,
          variant: 'success'
        });
      } catch {
        setOperationFeedback({
          message:
            'Could not delete this account. It remains saved; try again.',
          variant: 'error'
        });
      }
    },
    [accounts, deleteAccount]
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
            setReaddError(null);
            void startReaddingAccounts().catch(() => {
              setReaddError('Could not finish re-adding accounts. Try again.');
            });
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
          isSecretLoading={accountSecretLoading?.[item.account.id] ?? false}
          onLoadSecret={loadAccountSecret}
          onDelete={handleAccountDelete}
          onMove={accounts.length > 1 ? handleMovePress : undefined}
          onPress={handleAccountPress}
        />
      ),
    [
      accounts.length,
      accountSecretLoading,
      activeAccountId,
      handleAccountDelete,
      handleAccountPress,
      handleMovePress,
      loadAccountSecret,
      removeDamagedAccount,
      retryAccount
    ]
  );

  if (isLoading) {
    return <AccountListSkeleton />;
  }

  if (error != null) {
    return (
      <AccountListError
        isCorrupt={error instanceof CorruptAccountIndexError}
        onReadd={handleReaddAccounts}
        onRetry={() => void retryLoad().catch(() => undefined)}
        readdError={readdError}
      />
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        className="-mx-1 flex-1"
        contentContainerClassName={
          filteredItems.length === 0
            ? 'flex-grow gap-2 px-1 pb-24'
            : 'gap-2 px-1 pb-24'
        }
        data={filteredItems}
        initialNumToRender={ACCOUNT_LIST_BATCH_SIZE}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <View className="gap-3">
            {operationFeedback != null ? (
              <StatusMessage
                value={operationFeedback.message}
                variant={operationFeedback.variant}
              />
            ) : null}
            <AccountListHeaderSection
              accountCount={accountIds.length}
              onClearSearch={() => handleSearchChange('')}
              onSearchChange={handleSearchChange}
              searchQuery={searchQuery}
            />
          </View>
        }
        ListEmptyComponent={
          accountIds.length === 0 ? (
            <AccountListEmpty
              onManualPress={handleManualPress}
              onScanPress={handleScanPress}
            />
          ) : (
            <AccountListNoSearchResults
              onClearSearch={() => handleSearchChange('')}
            />
          )
        }
        maxToRenderPerBatch={ACCOUNT_LIST_BATCH_SIZE}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        windowSize={ACCOUNT_LIST_WINDOW_SIZE}
      />
      {accountIds.length > 0 ? (
        <Button
          accessibilityLabel="Add account"
          className="absolute right-0 bottom-4 z-10 h-14 w-14 rounded-2xl shadow-md"
          onPress={handleAddPress}
          size="icon"
        >
          <Icon as={PlusIcon} size={26} />
        </Button>
      ) : null}
    </View>
  );
}

type AccountListItem =
  | { kind: 'account'; account: StoredOtpAccount }
  | { kind: 'damaged'; account: DamagedAccount };

function buildAccountListItems(
  accountIds: string[],
  accounts: StoredOtpAccount[],
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

interface AccountListHeaderSectionProps {
  accountCount: number;
  onClearSearch: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
}

function AccountListHeaderSection(props: AccountListHeaderSectionProps) {
  if (props.accountCount === 0) {
    return null;
  }

  return (
    <View>
      <AccountSearchInput
        onClear={props.onClearSearch}
        onChangeText={props.onSearchChange}
        value={props.searchQuery}
      />
    </View>
  );
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
    <View className="min-h-[420px] flex-1 items-center justify-center px-2 py-10">
      <View className="w-full max-w-sm items-center gap-5">
        <AccountStateIllustration>
          <Icon as={ShieldCheckIcon} className="text-primary" size={36} />
        </AccountStateIllustration>
        <View className="items-center gap-2">
          <Text className="text-foreground text-center text-2xl font-semibold">
            No accounts yet
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            Add an account to start generating one-time codes in Cody.
          </Text>
        </View>
        <View className="w-full gap-2">
          <Button
            accessibilityLabel="Scan QR code"
            onPress={onScanPress}
            size="lg"
          >
            <Icon as={QrCodeIcon} />
            <Text>Scan QR code</Text>
          </Button>
          <Button
            accessibilityLabel="Add manually"
            onPress={onManualPress}
            size="lg"
            variant="outline"
          >
            <Icon as={KeyboardIcon} />
            <Text>Add manually</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

function AccountListNoSearchResults({
  onClearSearch
}: {
  onClearSearch: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-2 py-12">
      <AccountStateIllustration size="compact">
        <Icon as={SearchIcon} className="text-primary" size={32} />
      </AccountStateIllustration>
      <View className="items-center gap-2">
        <Text className="text-foreground text-center text-xl font-semibold">
          No matching accounts
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          Try a different issuer or account label.
        </Text>
      </View>
      <Button className="min-w-40" onPress={onClearSearch} variant="outline">
        <Text>Clear search</Text>
      </Button>
    </View>
  );
}

function AccountListError({
  isCorrupt,
  onReadd,
  onRetry,
  readdError
}: {
  isCorrupt: boolean;
  onReadd: () => void;
  onRetry: () => void;
  readdError: string | null;
}) {
  return (
    <View className="flex-1 items-start justify-center px-1 py-6">
      <View className="border-border bg-card w-full items-center gap-5 rounded-xl border px-4 py-6">
        <AccountStateIllustration size="error">
          <Icon
            as={isCorrupt ? ShieldAlertIcon : DatabaseIcon}
            className="text-primary"
            size={34}
          />
        </AccountStateIllustration>
        <View className="items-center gap-2">
          <Text className="text-foreground text-center text-2xl font-semibold">
            {isCorrupt
              ? 'Account list needs recovery'
              : 'Couldn’t load accounts'}
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            {isCorrupt
              ? 'Cody couldn’t read the saved account list. Retry first. Re-adding may require your original setup keys or QR codes.'
              : 'Account storage is temporarily unavailable. Retry to try again.'}
          </Text>
        </View>
        {readdError != null ? <StatusMessage value={readdError} /> : null}
        <View className="w-full gap-2">
          <Button
            accessibilityLabel="Retry loading saved accounts"
            onPress={onRetry}
            size="lg"
          >
            <Text>Retry loading</Text>
          </Button>
          {isCorrupt ? (
            <Button
              accessibilityLabel="Re-add accounts"
              onPress={onReadd}
              size="lg"
              variant="outline"
            >
              <Text>Re-add accounts</Text>
            </Button>
          ) : null}
        </View>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          {isCorrupt
            ? 'Keep the original QR codes or setup keys available in case you need to add accounts again.'
            : 'Retrying will not change your saved accounts.'}
        </Text>
      </View>
    </View>
  );
}

function AccountStateIllustration({
  children,
  size = 'default'
}: {
  children: React.ReactNode;
  size?: 'default' | 'compact' | 'error';
}) {
  return (
    <View
      className={`bg-accent/35 items-center justify-center rounded-full ${size === 'error' ? 'size-28' : size === 'compact' ? 'size-32' : 'size-36'}`}
    >
      <View
        className={`bg-accent items-center justify-center rounded-full ${size === 'default' ? 'size-24' : size === 'compact' ? 'size-20' : 'size-18'}`}
      >
        {children}
      </View>
    </View>
  );
}
