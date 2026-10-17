import { cn } from '@/lib/utils/cn';
import * as SwitchPrimitives from '@rn-primitives/switch';

const SWITCH_HIT_SLOP = {
  bottom: 10,
  left: 10,
  right: 10,
  top: 10
} as const;

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-6 w-11 shrink-0 flex-row items-center rounded-full border border-transparent p-0.5',
        props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
        props.disabled && 'opacity-50',
        className
      )}
      hitSlop={SWITCH_HIT_SLOP}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'bg-background will-change-variable size-5 rounded-full transition-transform',
          props.checked
            ? 'dark:bg-primary-foreground translate-x-5'
            : 'dark:bg-foreground translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
