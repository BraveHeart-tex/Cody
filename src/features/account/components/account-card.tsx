import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { copyPasscode } from '@/features/account/model/passcode-clipboard';
import {
  useTotpCountdown,
  type TotpPeriod
} from '@/features/totp/hooks/use-totp-countdown';
import { getAccountColor } from '@/features/totp/model/account-colors';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';
import { CheckIcon, CopyIcon, EllipsisIcon } from 'lucide-react-native';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type ViewStyle
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

interface AccountCardProps {
  account: OtpAccount;
  isActive: boolean;
  onPress: (accountId: string) => void;
}

const DEFAULT_PERIOD: TotpPeriod = 30;
const CODE_PLACEHOLDER = '******';
const COPIED_FEEDBACK_MS = 1500;
const CARD_LAYOUT_TRANSITION = LinearTransition.duration(220).easing(
  Easing.out(Easing.cubic)
);
const DETAILS_ENTERING = FadeIn.duration(160).easing(Easing.out(Easing.cubic));
const DETAILS_EXITING = FadeOut.duration(120).easing(Easing.in(Easing.cubic));

export const AccountCard = memo(function AccountCard({
  account,
  isActive,
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
              {isActive ? <AccountActions /> : null}
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

function AccountCardDetails({
  account,
  color,
  issuer,
  period
}: {
  account: OtpAccount;
  color: string;
  issuer: string;
  period: TotpPeriod;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const countdown = useTotpCountdown(period);
  const code = useMemo(
    () =>
      generateTotpCode({
        secret: account.secret,
        algorithm: account.algorithm,
        period,
        digits: account.digits,
        timestamp: countdown.periodStartedAt
      }) || CODE_PLACEHOLDER,
    [
      account.algorithm,
      account.digits,
      account.secret,
      countdown.periodStartedAt,
      period
    ]
  );

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsCopied(false);
    }, COPIED_FEEDBACK_MS);

    return () => clearTimeout(timeoutId);
  }, [isCopied]);

  const handleCopyPress = useCallback(
    async (event: GestureResponderEvent) => {
      event.stopPropagation();
      await copyPasscode(code);
      setIsCopied(true);
    },
    [code]
  );

  return (
    <CardContent className="gap-4 px-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="w-full min-w-0 flex-1 flex-row items-center">
          <Text className="text-base">Passcode</Text>
          <Text
            className="text-foreground min-w-0 flex-1 text-center font-mono text-2xl font-semibold"
            numberOfLines={1}
          >
            {code}
          </Text>
        </View>

        <Button
          accessibilityLabel={
            isCopied ? 'Passcode copied' : `Copy ${issuer} passcode`
          }
          onPress={handleCopyPress}
          size="icon"
          testID="account-card-copy"
          variant="ghost"
        >
          <Icon as={isCopied ? CheckIcon : CopyIcon} />
        </Button>
      </View>

      <AccountCountdownProgress
        color={color}
        period={period}
        periodEndsAt={countdown.periodEndsAt}
        periodStartedAt={countdown.periodStartedAt}
        remainingSeconds={countdown.remainingSeconds}
      />

      <Text className="text-muted-foreground text-center text-xs">
        {countdown.remainingSeconds}s until refresh
      </Text>
    </CardContent>
  );
}

const AccountCountdownProgress = memo(function AccountCountdownProgress({
  color,
  period,
  periodEndsAt,
  periodStartedAt,
  remainingSeconds
}: {
  color: string;
  period: number;
  periodEndsAt: number;
  periodStartedAt: number;
  remainingSeconds: number;
}) {
  const animatedProgress = useSharedValue(1);

  useLayoutEffect(() => {
    const now = Date.now();

    animatedProgress.value = getRemainingProgress(
      now,
      periodStartedAt,
      periodEndsAt
    );
    animatedProgress.value = withTiming(0, {
      duration: Math.max(periodEndsAt - now, 0),
      easing: Easing.linear
    });
  }, [animatedProgress, periodEndsAt, periodStartedAt]);

  const progressStyle = useAnimatedStyle<ViewStyle>(
    () => ({
      backgroundColor: color,
      transform: [{ scaleX: animatedProgress.value }],
      width: '100%'
    }),
    [color]
  );

  return (
    <View
      accessibilityLabel={`${remainingSeconds}s until refresh`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        max: period,
        min: 0,
        now: remainingSeconds
      }}
      className="bg-muted h-1 overflow-hidden rounded-full"
      testID="account-card-progress"
    >
      <Animated.View className="h-full rounded-full" style={progressStyle} />
    </View>
  );
});

function AccountInitial({
  initial,
  style
}: {
  initial: string;
  style: ViewStyle;
}) {
  return (
    <View
      accessibilityLabel={`Account icon ${initial}`}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={style}
    >
      <Text className="text-primary-foreground text-lg font-semibold">
        {initial}
      </Text>
    </View>
  );
}

function AccountActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          accessibilityLabel="Account actions"
          size="icon"
          variant="ghost"
        >
          <Icon as={EllipsisIcon} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Text>Move</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Rename</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Customize</Text>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          <Text>Delete</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getAccountInitial(account: OtpAccount): string {
  const source = account.label.trim() || account.issuer.trim();

  return source.charAt(0).toUpperCase() || '?';
}

function getRemainingProgress(
  timestamp: number,
  periodStartedAt: number,
  periodEndsAt: number
): number {
  const periodDuration = periodEndsAt - periodStartedAt;

  if (periodDuration <= 0) {
    return 0;
  }

  return clamp((periodEndsAt - timestamp) / periodDuration, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

  return true;
}
