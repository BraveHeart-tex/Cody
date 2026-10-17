import { Text } from '@/components/ui/text';

interface StatusMessageProps {
  variant?: 'error' | 'success';
  value: string;
}

function StatusMessage({ variant = 'error', value }: StatusMessageProps) {
  return (
    <Text
      accessibilityRole={variant === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      className={
        variant === 'error'
          ? 'bg-destructive/10 text-foreground border-destructive/30 rounded-lg border px-4 py-3 text-center text-sm leading-5 font-medium'
          : 'bg-accent text-accent-foreground border-border/50 rounded-lg border px-4 py-3 text-center text-sm leading-5 font-medium'
      }
    >
      {value}
    </Text>
  );
}

export { StatusMessage };
