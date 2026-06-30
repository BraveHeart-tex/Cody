import { cn } from '@/lib/utils/cn';
import { View } from 'react-native';

// TODO: Remove skeletons from the project
function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
