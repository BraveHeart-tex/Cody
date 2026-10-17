import { Text } from '@/components/ui/text';

interface StatusMessageProps {
  value: string;
}

function StatusMessage({ value }: StatusMessageProps) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="bg-destructive/10 text-foreground border-destructive/30 rounded-lg border px-4 py-3 text-center text-sm leading-5 font-medium"
    >
      {value}
    </Text>
  );
}

export { StatusMessage };
