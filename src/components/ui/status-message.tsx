import { Text } from '@/components/ui/text';

interface StatusMessageProps {
  value: string;
}

function StatusMessage({ value }: StatusMessageProps) {
  return (
    <Text className="bg-destructive text-destructive-foreground rounded-lg px-4 py-3 text-center text-base font-semibold">
      {value}
    </Text>
  );
}

export { StatusMessage };
