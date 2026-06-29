import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';

export function MoveAccountsDoneButton() {
  return (
    <Button
      accessibilityLabel="Done moving accounts"
      onPress={() => router.replace('/')}
      size="sm"
      variant="ghost"
    >
      <Text>Done</Text>
    </Button>
  );
}
