import { MoveAccountsDoneButton } from '@/features/account/components/move-accounts-done-button';
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
import { useEffect, useLayoutEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(appFontAssets);

  const loadSettings = useSettingsStore(state => state.loadSettings);
  const loadStatus = useSettingsStore(state => state.loadStatus);
  const themeMode = useSettingsStore(state => state.settings.themeMode);

  useEffect(() => {
    void loadSettings().catch(() => undefined);
  }, [loadSettings]);

  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme = themeMode === 'system' ? systemScheme : themeMode;
  const theme = NAV_THEME[scheme];
  const isReady =
    fontsLoaded && (loadStatus === 'loaded' || loadStatus === 'failed');

  useLayoutEffect(() => {
    if (!isReady) {
      return;
    }

    Appearance.setColorScheme(
      themeMode === 'system' ? 'unspecified' : themeMode
    );
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [isReady, theme.colors.background, themeMode]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ backgroundColor: theme.colors.background, flex: 1 }}
    >
      <ThemeProvider value={theme}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: theme.colors.background
            },
            headerTitleStyle: {
              fontFamily: appFonts.faces.semiBold,
              fontSize: 17
            },
            headerTintColor: theme.colors.text,
            contentStyle: {
              backgroundColor: theme.colors.background
            }
          }}
        >
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
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
