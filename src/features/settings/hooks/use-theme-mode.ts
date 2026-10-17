import { useLayoutEffect } from 'react';
import { Appearance } from 'react-native';

import { useSettingsStore } from '@/features/settings/store/settings-store';

export function useThemeMode(enabled = true) {
  const themeMode = useSettingsStore(state => state.settings.themeMode);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    Appearance.setColorScheme(
      themeMode === 'system' ? 'unspecified' : themeMode
    );
  }, [enabled, themeMode]);

  return themeMode;
}
