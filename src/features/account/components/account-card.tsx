import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CountdownRing } from '@/features/totp/components/countdown-ring';
import type { TotpCountdownState } from '@/features/totp/hooks/use-totp-countdown';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';
import { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';

interface AccountCardProps {
  account: OtpAccount;
  countdown: TotpCountdownState;
}

const DEFAULT_PERIOD = 30;
const CODE_PLACEHOLDER = '------';

export const AccountCard = memo(function AccountCard({
  account,
  countdown
}: AccountCardProps) {
  const period = account.period ?? DEFAULT_PERIOD;
  const code =
    generateTotpCode({
      secret: account.secret,
      algorithm: account.algorithm,
      period,
      digits: account.digits,
      timestamp: countdown.periodStartedAt
    }) || CODE_PLACEHOLDER;

  const handlePress = useCallback(() => {
    // TODO: Make the card interactive with the new design code will be shown upon click
  }, []);

  return (
    <Pressable
      accessibilityLabel={`Open ${account.issuer || 'Unknown issuer'} account`}
      accessibilityRole="button"
      onPress={handlePress}
    >
      <Card className="gap-4 rounded-lg px-0 py-4">
        <CardHeader className="flex-row items-start justify-between gap-4 px-4">
          <View className="min-w-0 flex-1 gap-1">
            <CardTitle className="text-foreground text-lg" numberOfLines={1}>
              {account.issuer || 'Unknown issuer'}
            </CardTitle>
            <CardDescription className="text-sm" numberOfLines={1}>
              {account.label}
            </CardDescription>
          </View>
          <CountdownRing
            periodEndsAt={countdown.periodEndsAt}
            periodStartedAt={countdown.periodStartedAt}
            seconds={countdown.remainingSeconds}
          />
        </CardHeader>

        <CardContent className="px-4">
          <Text className="text-foreground font-mono text-4xl font-semibold">
            {code}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
});
