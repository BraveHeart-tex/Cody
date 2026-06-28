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
import { useColorScheme } from 'react-native';

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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  if (!fontsLoaded) {
    return null;
  }

  const theme = NAV_THEME[scheme];

  return (
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
      />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <PortalHost />
    </ThemeProvider>
  );
}
