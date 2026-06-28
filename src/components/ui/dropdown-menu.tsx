import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils/cn';
import {
  CheckboxItem as DropdownMenuPrimitiveCheckboxItem,
  Content as DropdownMenuPrimitiveContent,
  Group as DropdownMenuPrimitiveGroup,
  Item as DropdownMenuPrimitiveItem,
  ItemIndicator as DropdownMenuPrimitiveItemIndicator,
  Label as DropdownMenuPrimitiveLabel,
  Overlay as DropdownMenuPrimitiveOverlay,
  Portal as DropdownMenuPrimitivePortal,
  RadioGroup as DropdownMenuPrimitiveRadioGroup,
  RadioItem as DropdownMenuPrimitiveRadioItem,
  Root as DropdownMenuPrimitiveRoot,
  Separator as DropdownMenuPrimitiveSeparator,
  Sub as DropdownMenuPrimitiveSub,
  SubContent as DropdownMenuPrimitiveSubContent,
  SubTrigger as DropdownMenuPrimitiveSubTrigger,
  Trigger as DropdownMenuPrimitiveTrigger,
  useSubContext
} from '@rn-primitives/dropdown-menu';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp
} from 'lucide-react-native';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle
} from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { Fragment } from 'react/jsx-runtime';

const DropdownMenu = DropdownMenuPrimitiveRoot;

const DropdownMenuTrigger = DropdownMenuPrimitiveTrigger;

const DropdownMenuGroup = DropdownMenuPrimitiveGroup;

const DropdownMenuPortal = DropdownMenuPrimitivePortal;

const DropdownMenuSub = DropdownMenuPrimitiveSub;

const DropdownMenuRadioGroup = DropdownMenuPrimitiveRadioGroup;

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveSubTrigger> & {
  children?: React.ReactNode;

  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = useSubContext();
  const icon =
    Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}
    >
      <DropdownMenuPrimitiveSubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none'
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8'
        )}
        {...props}
      >
        <>{children}</>
        <Icon
          as={icon}
          className={cn(
            'text-foreground ml-auto size-4 shrink-0',
            iconClassName
          )}
        />
      </DropdownMenuPrimitiveSubTrigger>
    </TextClassContext.Provider>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveSubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn}>
      <DropdownMenuPrimitiveSubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 origin-(--radix-context-menu-content-transform-origin)'
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

function DropdownMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveContent> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
}) {
  return (
    <DropdownMenuPrimitivePortal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitiveOverlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as typeof StyleSheet.absoluteFill
                ])
              : StyleSheet.absoluteFill
          })}
          className={overlayClassName}
        >
          <NativeOnlyAnimatedView entering={FadeIn}>
            <TextClassContext.Provider value="text-popover-foreground">
              <DropdownMenuPrimitiveContent
                className={cn(
                  'bg-popover border-border min-w-32 overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) cursor-default',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    )
                  }),
                  className
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </DropdownMenuPrimitiveOverlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitivePortal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveItem> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' &&
          'text-destructive group-active:text-destructive'
      )}
    >
      <DropdownMenuPrimitiveItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none',
              variant === 'destructive' &&
                'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            )
          }),
          variant === 'destructive' &&
            'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveCheckboxItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitiveCheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none'
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitiveItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </DropdownMenuPrimitiveItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitiveCheckboxItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveRadioItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitiveRadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none'
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitiveItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </DropdownMenuPrimitiveItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitiveRadioItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveLabel> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitiveLabel
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitiveSeparator>) {
  return (
    <DropdownMenuPrimitiveSeparator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
};
