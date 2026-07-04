import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { useSettings } from '@/features/settings/hooks/use-settings';

export function useThemeMode() {
  const { settings } = useSettings();
  const { themeMode } = settings;

  useEffect(() => {
    Appearance.setColorScheme(
      themeMode === 'system' ? 'unspecified' : themeMode
    );
  }, [themeMode]);

  return themeMode;
}
