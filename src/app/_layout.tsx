import { MoveAccountsDoneButton } from '@/features/account/components/move-accounts-done-button';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import '@/global.css';
import { NAV_THEME } from '@/theme';
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk/800ExtraBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
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
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold
  });

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
              fontFamily: 'HankenGrotesk_600SemiBold',
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
