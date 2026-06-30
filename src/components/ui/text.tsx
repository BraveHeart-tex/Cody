import { cn } from '@/lib/utils/cn';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext } from 'react';

import { StyleSheet, Text as RNText, type Role } from 'react-native';

const textVariants = cva('text-foreground font-sans text-base', {
  variants: {
    variant: {
      default: '',
      h1: 'text-center text-4xl font-extrabold tracking-tight',
      h2: 'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
      h3: 'text-2xl font-semibold tracking-tight',
      h4: 'text-xl font-semibold tracking-tight',
      p: 'mt-3 leading-7 sm:mt-6',
      blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
      code: cn(
        'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
      ),
      lead: 'text-muted-foreground text-xl',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-muted-foreground text-sm'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading'
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4'
};

const TextClassContext = createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  style,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  const resolvedClassName = cn(textVariants({ variant }), textClass, className);
  const usesMono = resolvedClassName.split(/\s+/).includes('font-mono');

  return (
    <Component
      className={resolvedClassName}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[usesMono && styles.mono, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  mono: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    letterSpacing: 1,
    fontWeight: '600'
  }
});

export { Text, TextClassContext };
