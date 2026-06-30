import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface AddAccountOptionsProps {
  onManualPress: () => void;
  onScanPress: () => void;
}

export function AddAccountOptions({
  onManualPress,
  onScanPress
}: AddAccountOptionsProps) {
  return (
    <View className="bg-background pb-safe flex-1 gap-6 px-6">
      <View className="pt-6">
        <Text className="text-muted-foreground text-base leading-6">
          Add an authenticator account with a QR code or setup key.
        </Text>
      </View>

      <View className="gap-3">
        <Card className="rounded-lg py-0">
          <CardHeader className="gap-2 py-5">
            <CardTitle className="text-xl">Scan QR code</CardTitle>
            <CardDescription className="text-base leading-6">
              Use the camera to scan an authenticator setup QR code.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <Button onPress={onScanPress}>
              <Text>Scan QR Code</Text>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg py-0">
          <CardHeader className="gap-2 py-5">
            <CardTitle className="text-xl">Enter manually</CardTitle>
            <CardDescription className="text-base leading-6">
              Type the issuer, account label, and secret setup key.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <Button variant="outline" onPress={onManualPress}>
              <Text>Enter Manually</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
