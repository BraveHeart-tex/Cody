import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { OtpAccountRecord } from '@/features/totp/model/totp-account';
import { EllipsisIcon } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert } from 'react-native';

interface AccountActionsProps {
  account: OtpAccountRecord;
  issuer: string;
  onDelete: (accountId: string) => void;
  onMove?: () => void;
}

export function AccountActions({
  account,
  issuer,
  onDelete,
  onMove
}: AccountActionsProps) {
  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete account?',
      `This permanently deletes ${issuer} (${account.label}) from this device. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => onDelete(account.id),
          style: 'destructive'
        }
      ]
    );
  }, [account.id, account.label, issuer, onDelete]);

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
      <DropdownMenuContent className="min-w-44 p-1.5">
        {onMove ? (
          <DropdownMenuItem className="min-h-12 px-3" onPress={onMove}>
            <Text className="text-base">Move</Text>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="min-h-12 px-3">
          <Text className="text-base">Rename</Text>
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-12 px-3">
          <Text className="text-base">Customize</Text>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-12 px-3"
          onPress={handleDeletePress}
          variant="destructive"
        >
          <Text className="text-base">Delete</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
