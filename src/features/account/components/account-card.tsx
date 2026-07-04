import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AccountActions } from '@/features/account/components/account-actions';
import { AccountCardDetails } from '@/features/account/components/account-card-details';
import { AccountInitial } from '@/features/account/components/account-initial';
import { getAccountInitial } from '@/features/account/model/account-display';
import type { TotpPeriod } from '@/features/totp/hooks/use-totp-countdown';
import { getAccountColor } from '@/features/totp/model/account-colors';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  LinearTransition
} from 'react-native-reanimated';

interface AccountCardProps {
  account: OtpAccount;
  isActive: boolean;
  onDelete: (accountId: string) => void;
  onMove?: () => void;
  onPress: (accountId: string) => void;
}

const DEFAULT_PERIOD: TotpPeriod = 30;
const CARD_LAYOUT_TRANSITION = LinearTransition.springify()
  .dampingRatio(1)
  .stiffness(200);

const DETAILS_ENTERING = FadeInUp.springify()
  .dampingRatio(1)
  .stiffness(200)
  .withInitialValues({ transform: [{ translateY: -8 }] });

const DETAILS_EXITING = FadeOutUp.duration(140).easing(Easing.in(Easing.cubic));

export const AccountCard = memo(function AccountCard({
  account,
  isActive,
  onDelete,
  onMove,
  onPress
}: AccountCardProps) {
  const period = account.period ?? DEFAULT_PERIOD;
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

  const handlePress = useCallback(() => {
    onPress(account.id);
  }, [account.id, onPress]);

  return (
    <Animated.View layout={CARD_LAYOUT_TRANSITION}>
      <Pressable
        accessibilityLabel={`${isActive ? 'Close' : 'Open'} ${issuer} account`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isActive }}
        onPress={handlePress}
      >
        <Card
          className="relative gap-4 rounded-lg border-0 border-t-4 px-0 py-4"
          style={cardStyle}
        >
          <CardHeader className="px-4">
            <View className="flex-row items-center gap-3">
              <AccountInitial initial={initial} style={iconStyle} />
              <View className="min-w-0 flex-1 gap-1">
                <CardTitle
                  className="text-foreground text-lg"
                  numberOfLines={1}
                >
                  {issuer}
                </CardTitle>
                <CardDescription
                  className="text-sm font-medium tracking-wide"
                  numberOfLines={1}
                >
                  {account.label}
                </CardDescription>
              </View>
              {isActive ? (
                <AccountActions
                  account={account}
                  issuer={issuer}
                  onDelete={onDelete}
                  onMove={onMove}
                />
              ) : null}
            </View>
          </CardHeader>

          {isActive ? (
            <Animated.View
              entering={DETAILS_ENTERING}
              exiting={DETAILS_EXITING}
              layout={CARD_LAYOUT_TRANSITION}
            >
              <AccountCardDetails
                account={account}
                color={color}
                issuer={issuer}
                period={period}
              />
            </Animated.View>
          ) : null}
        </Card>
      </Pressable>
    </Animated.View>
  );
}, areAccountCardPropsEqual);

function areAccountCardPropsEqual(
  previous: AccountCardProps,
  next: AccountCardProps
): boolean {
  if (
    previous.account !== next.account ||
    previous.isActive !== next.isActive
  ) {
    return false;
  }

  if (previous.onPress !== next.onPress) {
    return false;
  }

  if (previous.onDelete !== next.onDelete) {
    return false;
  }

  if (previous.onMove !== next.onMove) {
    return false;
  }

  return true;
}
