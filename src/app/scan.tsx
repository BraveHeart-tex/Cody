import { ScannerView } from '@/features/scanner/components/scanner-view';
import { View } from 'react-native';

export default function ScanScreen() {
  return (
    <View className="bg-background flex-1">
      <ScannerView />
    </View>
  );
}
