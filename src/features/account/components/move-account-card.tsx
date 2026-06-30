import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getAccountInitial } from '@/features/account/model/account-display';
import { getAccountColor } from '@/features/totp/model/account-colors';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { GripVerticalIcon } from 'lucide-react-native';
import { memo, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Sortable from 'react-native-sortables';

export const MoveAccountCard = memo(function MoveAccountCard({
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
