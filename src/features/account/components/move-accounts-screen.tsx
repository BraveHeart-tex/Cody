import { StateCard } from '@/components/ui/state-card';
import { AccountListSkeleton } from '@/features/account/components/account-list-skeleton';
import { MoveAccountCard } from '@/features/account/components/move-account-card';
import {
  orderAccountsByIds,
  scheduleAfterRender
} from '@/features/account/model/move-accounts';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { useCallback, useMemo, useState } from 'react';
import type { ScrollView } from 'react-native';
import { View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, {
  type SortableGridDragEndParams,
  type SortableGridRenderItem
} from 'react-native-sortables';

const ACCOUNT_GRID_GAP = 12;
const DRAG_ACTIVATION_DELAY_MS = 0;

export function MoveAccountsScreen() {
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

function keyExtractor(account: OtpAccount): string {
  return account.id;
}
