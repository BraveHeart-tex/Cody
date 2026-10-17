import { cn } from '@/lib/utils/cn';
import { fontClassName } from '@/lib/utils/font-class-name';
import { TextInput } from 'react-native';

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={fontClassName(
        cn(
          'dark:bg-input/30 border-input bg-background text-foreground focus:border-ring will-change-variable flex h-11 w-full min-w-0 flex-row items-center rounded-lg border p-0 px-3 font-sans text-base leading-5',
          props.editable === false && 'opacity-50',
          'placeholder:text-muted-foreground',
          className
        )
      )}
      {...props}
    />
  );
}

export { Input };
