import { useEffect } from 'react';
import { AppState, BackHandler, Keyboard, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAppLockStore } from '@/features/app-lock/store/app-lock-store';
import { cn } from '@/lib/utils/cn';

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const status = useAppLockStore(state => state.status);
  const appState = useAppLockStore(state => state.appState);
  const retrySettings = useAppLockStore(state => state.retrySettings);
  const onAppStateChange = useAppLockStore(state => state.onAppStateChange);
  const authenticate = useAppLockStore(state => state.authenticate);
  const failureMessage = useAppLockStore(state => state.failureMessage);
  const isAuthenticating = useAppLockStore(state => state.isAuthenticating);
  const hasUnlocked = useAppLockStore(state => state.hasUnlocked);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    const currentState = AppState.currentState;

    if (currentState != null) {
      onAppStateChange(currentState);
    }

    void retrySettings();

    return () => subscription.remove();
  }, [onAppStateChange, retrySettings]);

  useEffect(() => {
    if (status === 'locked' && appState === 'active' && !isAuthenticating) {
      void authenticate(false);
    }
  }, [status, appState, isAuthenticating, authenticate]);

  const covered = status !== 'unlocked' || appState !== 'active';

  useEffect(() => {
    if (!covered) {
      return;
    }

    Keyboard.dismiss();
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );

    return () => subscription.remove();
  }, [covered]);

  return (
    <View className="flex-1">
      {hasUnlocked && (
        <View
          testID="app-lock-protected-content"
          className={cn('flex-1', covered ? 'opacity-0' : 'opacity-100')}
          accessibilityElementsHidden={covered}
          importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
          pointerEvents={covered ? 'none' : 'auto'}
        >
          {children}
        </View>
      )}
      {covered && (
        <View
          className="bg-background absolute inset-0 z-50 items-center justify-center px-8"
          accessibilityViewIsModal
        >
          <Text className="text-center text-xl font-semibold">
            {status === 'initializing'
              ? 'Loading security settings…'
              : status === 'load-error'
                ? 'Could not load security settings'
                : 'Cody is locked'}
          </Text>
          {!!failureMessage && (
            <Text className="text-muted-foreground mt-3 text-center">
              {failureMessage}
            </Text>
          )}
          {status === 'load-error' ? (
            <Button
              className="mt-6"
              variant="outline"
              onPress={() => void retrySettings()}
            >
              <Text>Retry</Text>
            </Button>
          ) : status === 'locked' && appState === 'active' ? (
            <Button
              className="mt-6"
              variant="outline"
              disabled={isAuthenticating}
              onPress={() => void authenticate(true)}
            >
              <Text>
                {isAuthenticating
                  ? 'Authenticating…'
                  : 'Unlock with biometrics'}
              </Text>
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}
