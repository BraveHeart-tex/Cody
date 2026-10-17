import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable } from 'react-native';

const buttonVariants = cva(
  'group shrink-0 flex-row items-center justify-center gap-2 rounded-lg will-change-variable',
  {
    variants: {
      variant: {
        default: 'bg-primary active:bg-primary/90',
        destructive: 'bg-destructive active:bg-destructive/90',
        outline:
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border',
        secondary: 'bg-secondary active:bg-secondary/80',
        ghost: 'active:bg-accent dark:active:bg-accent/50',
        link: ''
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-11 gap-1.5 px-3',
        lg: 'h-12 px-6',
        icon: 'h-11 w-11'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

const buttonTextVariants = cva(
  'text-foreground font-sans-medium text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive-foreground',
        outline: 'group-active:text-accent-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: 'text-primary group-active:underline'
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(
          props.disabled && 'opacity-50',
          buttonVariants({ variant, size }),
          className
        )}
        role="button"
        {...props}
        accessibilityState={{
          ...props.accessibilityState,
          disabled: props.disabled ?? props.accessibilityState?.disabled
        }}
      />
    </TextClassContext.Provider>
  );
}

export { Button };
