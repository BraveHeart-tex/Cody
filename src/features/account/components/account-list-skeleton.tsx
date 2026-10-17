import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from 'react-native';

const LOADING_ROW_COUNT = 6;

export function AccountListSkeleton() {
  return (
    <View className="pb-safe gap-2">
      {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
        <Card
          className="border-border/30 gap-3 rounded-lg px-0 py-3 shadow-none"
          key={index}
        >
          <View className="flex-row items-center gap-3 px-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <View className="min-w-0 flex-1 gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </View>
            <Skeleton className="size-9 rounded-lg opacity-70" />
          </View>
        </Card>
      ))}
    </View>
  );
}
