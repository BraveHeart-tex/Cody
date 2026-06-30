import { cn } from '@/lib/utils/cn';
import { TextInput } from 'react-native';

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'dark:bg-input/30 border-input bg-background text-foreground py- flex h-10 w-full min-w-0 flex-row items-center rounded-md border p-0 px-3 text-base leading-5 shadow-sm shadow-black/5 sm:h-9',
        props.editable === false && 'opacity-50',
        'placeholder:text-muted-foreground/50',
        className
      )}
      {...props}
    />
  );
}

export { Input };
