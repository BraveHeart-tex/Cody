import { cn } from '@/lib/utils/cn';
import { Platform, TextInput } from 'react-native';

const WEB_INTERACTION_STATES = Platform.select({
  web: 'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
});

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'dark:bg-input/30 border-input bg-background text-foreground focus:border-ring will-change-variable flex h-11 w-full min-w-0 flex-row items-center rounded-lg border p-0 px-3 font-sans text-base leading-5',
        props.editable === false && 'opacity-50',
        'placeholder:text-muted-foreground',
        WEB_INTERACTION_STATES,
        className
      )}
      {...props}
    />
  );
}

export { Input };
