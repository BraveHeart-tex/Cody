import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from 'react-native';

const LOADING_ROW_COUNT = 4;

interface AccountListSkeletonProps {
  showHeader?: boolean;
}

export function AccountListSkeleton({
  showHeader = false
}: AccountListSkeletonProps) {
  return (
    <View className="pb-safe gap-3">
      {showHeader ? <AccountListHeaderSkeleton /> : null}
      {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
        <Card className="relative px-0 py-4" key={index}>
          <View className="flex-row items-center gap-3 px-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <View className="min-w-0 flex-1 gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </View>
            <Skeleton className="h-11 w-11 rounded-lg" />
          </View>
        </Card>
      ))}
    </View>
  );
}

function AccountListHeaderSkeleton() {
  return (
    <View className="gap-5">
      <View className="border-input bg-background h-11 justify-center rounded-lg border px-4">
        <Skeleton className="h-4 w-28" />
      </View>
      <View className="flex-row items-center justify-between gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-11 w-20 rounded-lg" />
      </View>
    </View>
  );
}
