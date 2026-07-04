import { create, type StoreApi } from 'zustand';

import {
  DEFAULT_SETTINGS,
  isLockTimeoutSeconds,
  isThemeMode,
  type AppSettings,
  type LockTimeoutSeconds,
  type ThemeMode
} from '@/features/settings/model/settings';
import {
  getSettings,
  setSettings
} from '@/features/settings/storage/settings-storage';

export type SettingsLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface SettingsStoreState {
  error: Error | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  loadStatus: SettingsLoadStatus;
  saveError: Error | null;
  settings: AppSettings;
  setLockTimeoutSeconds: (value: LockTimeoutSeconds) => Promise<void>;
  setRequireBiometrics: (value: boolean) => Promise<void>;
  setThemeMode: (value: ThemeMode) => Promise<void>;
}

const initialState = {
  error: null,
  isLoading: true,
  loadStatus: 'idle' as SettingsLoadStatus,
  saveError: null,
  settings: DEFAULT_SETTINGS
};

let loadPromise: Promise<void> | null = null;
let mutationQueue = Promise.resolve();

type SettingsStoreSet = StoreApi<SettingsStoreState>['setState'];

type SettingsStoreGet = StoreApi<SettingsStoreState>['getState'];

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...initialState,

  loadSettings: async () => {
    if (get().loadStatus === 'loaded') {
      return;
    }

    if (loadPromise != null) {
      return loadPromise;
    }

    set({ isLoading: true, loadStatus: 'loading' });

    loadPromise = getSettings()
      .then(settings => {
        set({
          error: null,
          isLoading: false,
          loadStatus: 'loaded',
          settings
        });
      })
      .catch(cause => {
        const loadError = toError(cause);

        loadPromise = null;
        set({
          error: loadError,
          isLoading: false,
          loadStatus: 'failed'
        });

        throw loadError;
      });

    return loadPromise;
  },

  setLockTimeoutSeconds: async value => {
    if (!isLockTimeoutSeconds(value)) {
      return;
    }

    await get().loadSettings();

    if (!get().settings.requireBiometrics) {
      return;
    }

    await updateSettings(get, set, current => ({
      ...current,
      lockTimeoutSeconds: value
    }));
  },

  setRequireBiometrics: async value => {
    await updateSettings(get, set, current => ({
      ...current,
      requireBiometrics: value
    }));
  },

  setThemeMode: async value => {
    if (!isThemeMode(value)) {
      return;
    }

    await updateSettings(get, set, current => ({
      ...current,
      themeMode: value
    }));
  }
}));

export function resetSettingsStoreForTest(): void {
  loadPromise = null;
  mutationQueue = Promise.resolve();
  useSettingsStore.setState(initialState);
}

async function updateSettings(
  get: SettingsStoreGet,
  set: SettingsStoreSet,
  getNextSettings: (settings: AppSettings) => AppSettings
): Promise<void> {
  const queuedMutation = mutationQueue.then(async () => {
    try {
      await get().loadSettings();

      const nextSettings = getNextSettings(get().settings);

      await setSettings(nextSettings);
      set({
        saveError: null,
        settings: nextSettings
      });
    } catch (cause) {
      const mutationError = toError(cause);

      set({ saveError: mutationError });

      throw mutationError;
    }
  });

  mutationQueue = queuedMutation.catch(() => undefined);

  await queuedMutation;
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Settings storage failed');
}
