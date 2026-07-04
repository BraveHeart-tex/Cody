import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETTINGS,
  parseAppSettings,
  type AppSettings
} from '@/features/settings/model/settings';

export const SETTINGS_STORAGE_KEY = 'app.settings';

export async function getSettings(): Promise<AppSettings> {
  const value = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

  if (value == null) {
    return DEFAULT_SETTINGS;
  }

  try {
    return parseAppSettings(JSON.parse(value));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
