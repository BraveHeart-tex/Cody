import { useEffect } from 'react';

import { useSettingsStore } from '@/features/settings/store/settings-store';

export function useSettings() {
  const store = useSettingsStore();
  const loadSettings = useSettingsStore(state => state.loadSettings);

  useEffect(() => {
    void loadSettings().catch(() => undefined);
  }, [loadSettings]);

  return store;
}
