import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StateCard } from '@/components/ui/state-card';
import { Text } from '@/components/ui/text';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { getAccountColor } from '@/features/totp/model/account-colors';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { GripVerticalIcon } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ScrollView, ViewStyle } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, {
  type SortableGridDragEndParams,
  type SortableGridRenderItem
} from 'react-native-sortables';

const ACCOUNT_GRID_GAP = 12;
const DRAG_ACTIVATION_DELAY_MS = 0;

export default function MoveAccountsScreen() {
  const { accounts, error, isLoading, reorderAccounts } = useAccounts();
  const [orderedAccountIds, setOrderedAccountIds] = useState<string[] | null>(
    null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const orderedAccounts = useMemo(
    () => orderAccountsByIds(accounts, orderedAccountIds),
    [accounts, orderedAccountIds]
  );
  const scrollableRef = useAnimatedRef<ScrollView>();

  const handleDragStart = useCallback(() => {
    setSaveError(null);
  }, []);

  const handleDragEnd = useCallback(
    ({ data }: SortableGridDragEndParams<OtpAccount>) => {
      const accountIds = data.map(account => account.id);

      setOrderedAccountIds(accountIds);
      setSaveError(null);
      scheduleAfterRender(() => {
        void reorderAccounts(accountIds)
          .then(() => setSaveError(null))
          .catch(() => {
            setOrderedAccountIds(null);
            setSaveError('Could not save the new order. Try moving again.');
          });
      });
    },
    [reorderAccounts]
  );

  const renderItem = useCallback<SortableGridRenderItem<OtpAccount>>(
    ({ item }) => <MoveAccountCard account={item} />,
    []
  );

  if (isLoading) {
    return (
      <View className="bg-background flex-1 px-6 pt-6">
        <AccountListSkeleton />
      </View>
    );
  }

  if (error != null && accounts.length === 0) {
    return (
      <View className="bg-background flex-1 px-6 pt-6">
        <StateCard
          description="Try closing and reopening the app. Your saved secrets were not changed."
          title="Could not load saved accounts"
        />
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View className="bg-background flex-1 px-6 pt-6">
        <StateCard
          description="Add an account before arranging your list."
          title="No accounts to move"
        />
      </View>
    );
  }

  return (
    <Animated.ScrollView
      ref={scrollableRef}
      className="bg-background flex-1"
      contentContainerClassName="gap-5 px-6 pt-6 pb-safe"
      showsVerticalScrollIndicator={false}
    >
      {saveError != null ? (
        <StateCard description={saveError} title="Order was not saved" />
      ) : null}

      <Sortable.Grid
        columns={1}
        customHandle
        data={orderedAccounts}
        dimensionsAnimationType="none"
        dragActivationDelay={DRAG_ACTIVATION_DELAY_MS}
        activationAnimationDuration={120}
        dropAnimationDuration={120}
        itemEntering={null}
        itemExiting={null}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        rowGap={ACCOUNT_GRID_GAP}
        scrollableRef={scrollableRef}
        strategy="insert"
        overDrag="vertical"
        activeItemScale={1.02}
        activeItemOpacity={0.96}
        inactiveItemOpacity={1}
        inactiveItemScale={1}
        hapticsEnabled={false}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      />
    </Animated.ScrollView>
  );
}

const MoveAccountCard = memo(function MoveAccountCard({
  account
}: {
  account: OtpAccount;
}) {
  const color = getAccountColor(account);
  const issuer = account.issuer || 'Unknown issuer';
  const initial = getAccountInitial(account);

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      borderTopColor: color
    }),
    [color]
  );

  const iconStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: color
    }),
    [color]
  );

  return (
    <Card
      className="relative rounded-lg border-0 border-t-4 px-0 py-4"
      style={cardStyle}
      testID={`move-account-card-${account.id}`}
    >
      <CardHeader className="px-4">
        <View className="flex-row items-center gap-3">
          <View
            accessibilityLabel={`Account icon ${initial}`}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={iconStyle}
          >
            <Text className="text-primary-foreground text-lg font-semibold">
              {initial}
            </Text>
          </View>

          <View className="min-w-0 flex-1 gap-1">
            <CardTitle className="text-foreground text-lg" numberOfLines={1}>
              {issuer}
            </CardTitle>

            <CardDescription
              className="text-sm font-medium tracking-wide"
              numberOfLines={1}
            >
              {account.label}
            </CardDescription>
          </View>

          <Sortable.Handle>
            <View
              accessibilityLabel={`Drag ${issuer} account`}
              accessibilityRole="button"
              className="h-12 w-14 items-center justify-center rounded-md"
            >
              <Icon as={GripVerticalIcon} className="text-muted-foreground" />
            </View>
          </Sortable.Handle>
        </View>
      </CardHeader>
    </Card>
  );
});

function keyExtractor(account: OtpAccount): string {
  return account.id;
}

function scheduleAfterRender(callback: () => void): void {
  setTimeout(callback, 0);
}

function orderAccountsByIds(
  accounts: OtpAccount[],
  orderedAccountIds: string[] | null
): OtpAccount[] {
  if (orderedAccountIds == null) {
    return accounts;
  }

  const accountById = new Map(accounts.map(account => [account.id, account]));
  const orderedAccounts = orderedAccountIds
    .map(id => accountById.get(id))
    .filter((account): account is OtpAccount => account != null);
  const orderedAccountIdSet = new Set(orderedAccountIds);
  const remainingAccounts = accounts.filter(
    account => !orderedAccountIdSet.has(account.id)
  );

  return [...orderedAccounts, ...remainingAccounts];
}

function getAccountInitial(account: OtpAccount): string {
  const source = account.label.trim() || account.issuer.trim();

  return source.charAt(0).toUpperCase() || '?';
}
