import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const WEB_INTERACTION_STATES = Platform.select({
  web: 'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed'
});

const WEB_HOVER_STATES = {
  default: Platform.select({ web: 'hover:bg-primary/90' }),
  destructive: Platform.select({ web: 'hover:bg-destructive/90' }),
  outline: Platform.select({ web: 'hover:bg-accent' }),
  secondary: Platform.select({ web: 'hover:bg-secondary/80' }),
  ghost: Platform.select({ web: 'hover:bg-accent' }),
  link: Platform.select({ web: 'hover:underline' })
};

const WEB_TEXT_HOVER_STATES = Platform.select({
  web: 'group-hover:text-accent-foreground'
});

const buttonVariants = cva(
  'group shrink-0 flex-row items-center justify-center gap-2 rounded-lg will-change-variable',
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90',
          WEB_HOVER_STATES.default
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90',
          WEB_HOVER_STATES.destructive
        ),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border',
          WEB_HOVER_STATES.outline
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80',
          WEB_HOVER_STATES.secondary
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          WEB_HOVER_STATES.ghost
        ),
        link: WEB_HOVER_STATES.link
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
        outline: cn(
          'group-active:text-accent-foreground',
          WEB_TEXT_HOVER_STATES
        ),
        secondary: 'text-secondary-foreground',
        ghost: cn('group-active:text-accent-foreground', WEB_TEXT_HOVER_STATES),
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
          WEB_INTERACTION_STATES,
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
