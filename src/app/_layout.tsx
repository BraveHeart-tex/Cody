import { MoveAccountsDoneButton } from '@/features/account/components/move-accounts-done-button';
import { AppLockGate } from '@/features/app-lock/components/app-lock-gate';
import { useThemeMode } from '@/features/settings/hooks/use-theme-mode';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import '@/global.css';
import { NAV_THEME } from '@/theme';
import { appFontAssets, appFonts } from '@/theme/fonts';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(appFontAssets);

  const loadSettings = useSettingsStore(state => state.loadSettings);
  const loadStatus = useSettingsStore(state => state.loadStatus);

  useEffect(() => {
    void loadSettings().catch(() => undefined);
  }, [loadSettings]);

  // Navigation and NativeWind both follow the applied native appearance.
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = NAV_THEME[scheme];
  const isReady =
    fontsLoaded && (loadStatus === 'loaded' || loadStatus === 'failed');

  useThemeMode(isReady);

  const screenOptions = useMemo(
    () => ({
      headerShadowVisible: false,
      headerStyle: { backgroundColor: theme.colors.background },
      headerTitleStyle: {
        fontFamily: appFonts.faces.semiBold,
        fontWeight: 'normal' as const,
        fontSize: 17
      },
      headerTintColor: theme.colors.text,
      contentStyle: { backgroundColor: theme.colors.background }
    }),
    [theme]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [isReady, theme.colors.background]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Keep the security boundary mounted while settings retry. Unmounting it on
  // `loading` would restart its load effect after every failed read.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ backgroundColor: theme.colors.background, flex: 1 }}
    >
      <ThemeProvider value={theme}>
        <AppLockGate>
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-account/index"
              options={{ title: 'Add account' }}
            />
            <Stack.Screen
              name="add-account/manual"
              options={{ title: 'Enter setup key' }}
            />
            <Stack.Screen name="scan" options={{ title: 'Scan QR code' }} />
            <Stack.Screen
              name="move-accounts"
              options={{
                headerRight: MoveAccountsDoneButton,
                title: 'Move accounts'
              }}
            />
            <Stack.Screen
              name="account-confirm"
              options={{ title: 'Review account' }}
            />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
          <PortalHost />
        </AppLockGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
