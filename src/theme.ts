import {
  DarkTheme,
  DefaultTheme,
  type Theme
} from 'expo-router/react-navigation';

import { THEME } from '@/theme.generated';
import { appFonts } from '@/theme/fonts';

export { THEME } from '@/theme.generated';

// Weight is encoded in each loaded face, so keep native weight selection normal.
const navigationFonts: Theme['fonts'] = {
  regular: { fontFamily: appFonts.faces.regular, fontWeight: 'normal' },
  medium: { fontFamily: appFonts.faces.medium, fontWeight: 'normal' },
  bold: { fontFamily: appFonts.faces.semiBold, fontWeight: 'normal' },
  heavy: { fontFamily: appFonts.faces.bold, fontWeight: 'normal' }
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    fonts: navigationFonts,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground
    }
  },
  dark: {
    ...DarkTheme,
    fonts: navigationFonts,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground
    }
  }
};
