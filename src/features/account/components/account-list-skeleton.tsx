import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from 'react-native';

const LOADING_ROW_COUNT = 4;

// TODO: Remove skeletons from the project
export function AccountListSkeleton() {
  return (
    <View className="pb-safe gap-3">
      {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
        <Card className="gap-4 rounded-lg px-4 py-4" key={index}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </View>
            <Skeleton className="h-12 w-12 rounded-full" />
          </View>
          <Skeleton className="h-10 w-40" />
        </Card>
      ))}
    </View>
  );
}
