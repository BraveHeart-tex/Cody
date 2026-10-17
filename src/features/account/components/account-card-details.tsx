import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { AccountCountdownProgress } from '@/features/account/components/account-countdown-progress';
import { copyPasscode } from '@/features/account/model/passcode-clipboard';
import {
  useTotpCountdown,
  type TotpPeriod
} from '@/features/totp/hooks/use-totp-countdown';
import type { StoredOtpAccount } from '@/features/totp/model/totp-account';
import { generateTotpCode } from '@/features/totp/model/totp-code';
import * as Haptics from 'expo-haptics';
import { CheckIcon, CopyIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  type GestureResponderEvent
} from 'react-native';

const CODE_PLACEHOLDER = 'Code unavailable';
const COPIED_FEEDBACK_MS = 1500;
const COPY_ERROR_MESSAGE = 'Couldn’t copy passcode. Try again.';

type CopyAction = 'copy' | 'retry';

interface AccountCardDetailsProps {
  account: StoredOtpAccount;
  color: string;
  issuer: string;
  isSecretLoading: boolean;
  period: TotpPeriod;
}

export function AccountCardDetails({
  account,
  color,
  issuer,
  isSecretLoading,
  period
}: AccountCardDetailsProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<CopyAction | null>(null);
  const [hasCopyError, setHasCopyError] = useState(false);
  const copyPendingRef = useRef(false);
  const countdown = useTotpCountdown(period);
  const secret = account.secret;
  const code = useMemo(
    () =>
      secret == null
        ? ''
        : generateTotpCode({
            secret,
            algorithm: account.algorithm,
            period,
            digits: account.digits,
            timestamp: countdown.periodStartedAt
          }),
    [
      account.algorithm,
      account.digits,
      secret,
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

  const handleCopy = useCallback(
    async (action: CopyAction) => {
      if (copyPendingRef.current || code.length === 0) {
        return;
      }

      copyPendingRef.current = true;
      setPendingAction(action);
      setHasCopyError(false);
      setIsCopied(false);

      try {
        await copyPasscode(code);
        setIsCopied(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => undefined
        );
      } catch {
        setHasCopyError(true);
      } finally {
        copyPendingRef.current = false;
        setPendingAction(null);
      }
    },
    [code]
  );

  const handleCopyPress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      void handleCopy('copy');
    },
    [handleCopy]
  );

  const handleRetryPress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      void handleCopy('retry');
    },
    [handleCopy]
  );

  return (
    <CardContent className="gap-4 px-4">
      <View className="gap-2">
        <Text className="text-muted-foreground text-sm">Passcode</Text>
        <View className="flex-row items-center gap-2">
          <Text
            adjustsFontSizeToFit
            className="text-foreground min-w-0 flex-1 text-left font-mono text-3xl"
            minimumFontScale={0.75}
            numberOfLines={1}
          >
            {code || (isSecretLoading ? 'Loading passcode…' : CODE_PLACEHOLDER)}
          </Text>
          <Button
            disabled={
              code.length === 0 || pendingAction != null || isSecretLoading
            }
            accessibilityLabel={
              isSecretLoading
                ? 'Loading passcode'
                : code.length === 0
                  ? 'Passcode unavailable'
                  : pendingAction === 'copy'
                    ? 'Copying passcode'
                    : isCopied
                      ? 'Passcode copied'
                      : `Copy ${issuer} passcode`
            }
            accessibilityState={{ busy: pendingAction === 'copy' }}
            onPress={handleCopyPress}
            size="icon"
            testID="account-card-copy"
            variant="ghost"
          >
            {pendingAction === 'copy' ? (
              <ActivityIndicator
                accessible={false}
                size="small"
                testID="account-card-copy-spinner"
              />
            ) : (
              <Icon as={isCopied && code.length > 0 ? CheckIcon : CopyIcon} />
            )}
          </Button>
        </View>
        {hasCopyError || pendingAction === 'retry' ? (
          <View className="flex-row items-center gap-2">
            {hasCopyError ? (
              <View className="min-w-0 flex-1">
                <StatusMessage value={COPY_ERROR_MESSAGE} />
              </View>
            ) : null}
            <Button
              accessibilityLabel="Retry copying passcode"
              accessibilityState={{ busy: pendingAction === 'retry' }}
              disabled={pendingAction != null}
              onPress={handleRetryPress}
              size="sm"
              testID="account-card-copy-retry"
              variant="outline"
            >
              {pendingAction === 'retry' ? (
                <ActivityIndicator
                  accessible={false}
                  size="small"
                  testID="account-card-copy-retry-spinner"
                />
              ) : (
                <Text>Retry</Text>
              )}
            </Button>
          </View>
        ) : null}
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
