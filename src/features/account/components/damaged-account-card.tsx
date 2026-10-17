import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import type { DamagedAccount } from '@/features/totp/storage/totp-storage';
import { AlertTriangleIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

interface DamagedAccountCardProps {
  account: DamagedAccount;
  onRetry: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function DamagedAccountCard({
  account,
  onRetry,
  onRemove
}: DamagedAccountCardProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRetryPress = useCallback(async () => {
    setActionError(null);
    setIsRetrying(true);

    try {
      await onRetry(account.id);
    } catch {
      setActionError('Could not recover this account. Try again.');
    } finally {
      setIsRetrying(false);
    }
  }, [account.id, onRetry]);

  const handleRemovePress = useCallback(() => {
    const name = account.record?.issuer ?? 'this saved account';

    Alert.alert(
      'Remove damaged account?',
      `This removes ${name} from this device. To use it again, add it with its original setup key or QR code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setActionError(null);
            setIsRemoving(true);
            void onRemove(account.id)
              .catch(() => {
                setActionError('Could not remove this account. Try again.');
              })
              .finally(() => setIsRemoving(false));
          }
        }
      ]
    );
  }, [account.id, account.record?.issuer, onRemove]);

  const title = account.record?.issuer ?? 'Saved account needs attention';
  const subtitle = account.record?.label ?? `Account ID ${account.id}`;
  const hasInvalidAccountId = account.reason === 'invalid-account-id';
  const hasMissingSecret = account.reason === 'missing-secret';

  return (
    <Card className="border-destructive/30 bg-card gap-3 rounded-lg px-3.5 py-3.5 shadow-none">
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </View>
        <Icon as={AlertTriangleIcon} className="text-destructive" size={18} />
      </View>
      <Text className="bg-destructive/10 text-destructive self-start rounded-md px-2 py-1 text-xs font-semibold">
        Damaged account record
      </Text>
      <Text className="text-muted-foreground text-sm leading-5">
        {getIssueDescription(account)}
      </Text>
      {actionError != null ? <StatusMessage value={actionError} /> : null}
      <View className={hasInvalidAccountId ? 'flex-col' : 'flex-row gap-3'}>
        {hasInvalidAccountId || hasMissingSecret ? null : (
          <Button
            accessibilityLabel={`Retry recovery of ${title}`}
            className="flex-1"
            disabled={isRetrying || isRemoving}
            onPress={() => void handleRetryPress().catch(() => undefined)}
            variant="outline"
          >
            <Text>{isRetrying ? 'Retrying…' : 'Retry'}</Text>
          </Button>
        )}
        <Button
          accessibilityLabel={`Remove ${title}`}
          className="border-destructive/30 bg-destructive/5 flex-1"
          disabled={isRetrying || isRemoving}
          onPress={handleRemovePress}
          variant="outline"
        >
          <Text className="text-destructive">
            {isRemoving ? 'Removing…' : 'Remove'}
          </Text>
        </Button>
      </View>
    </Card>
  );
}

function getIssueDescription(account: DamagedAccount): string {
  switch (account.reason) {
    case 'missing-record':
      return 'The saved account details are missing. Retry, or remove this entry and add the account again with its setup key or QR code.';
    case 'invalid-record-json':
    case 'invalid-record':
      return 'The saved account details are damaged. Retry, or remove this entry and add the account again with its setup key or QR code.';
    case 'invalid-account-id':
      return 'This account ID cannot be used for secure storage. Remove this entry and add the account again with its original setup key or QR code.';
    case 'missing-secret':
      return 'Cody cannot access this account’s saved secret on this device. Remove this entry and add the account again with its original setup key or QR code.';
    case 'read-failed':
      return 'Cody could not read this account. Retry, or remove this entry and add the account again with its setup key or QR code.';
    case 'write-recovery-failed':
      return 'A save stopped partway through. Retry to finish recovering this account, or remove it from this device.';
  }
}
