import { View } from 'react-native';

export function ScannerFrame() {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-center"
    >
      <View className="relative h-72 w-72">
        <View className="absolute top-0 left-0 h-16 w-16 rounded-tl-[28px] border-t-[6px] border-l-[6px] border-white" />
        <View className="absolute top-0 right-0 h-16 w-16 rounded-tr-[28px] border-t-[6px] border-r-[6px] border-white" />
        <View className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-[28px] border-b-[6px] border-l-[6px] border-white" />
        <View className="absolute right-0 bottom-0 h-16 w-16 rounded-br-[28px] border-r-[6px] border-b-[6px] border-white" />
      </View>
    </View>
  );
}
