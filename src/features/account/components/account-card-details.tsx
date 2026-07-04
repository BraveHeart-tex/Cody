import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AccountCountdownProgress } from '@/features/account/components/account-countdown-progress';
import { copyPasscode } from '@/features/account/model/passcode-clipboard';
import {
  useTotpCountdown,
  type TotpPeriod
} from '@/features/totp/hooks/use-totp-countdown';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';
import * as Haptics from 'expo-haptics';
import { CheckIcon, CopyIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

const CODE_PLACEHOLDER = '******';
const COPIED_FEEDBACK_MS = 1500;

interface AccountCardDetailsProps {
  account: OtpAccount;
  color: string;
  issuer: string;
  period: TotpPeriod;
}

export function AccountCardDetails({
  account,
  color,
  issuer,
  period
}: AccountCardDetailsProps) {
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [code]
  );

  return (
    <CardContent className="gap-4 px-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="w-full min-w-0 flex-1 flex-row items-center">
          <Text className="text-base">Passcode</Text>
          <Text
            className="text-foreground min-w-0 flex-1 text-center font-mono text-3xl font-semibold tracking-widest!"
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
