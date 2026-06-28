import '@/global.css';
import { NAV_THEME } from '@/theme';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <Stack />
      <PortalHost />
    </ThemeProvider>
  );
}
