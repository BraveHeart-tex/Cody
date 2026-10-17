import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { authenticateBiometrics } from '@/features/settings/model/biometrics';
import { useSettingsStore } from '@/features/settings/store/settings-store';

export type ProtectionChangeResult =
  { success: true } | { success: false; message: string };

type LockStatus = 'initializing' | 'load-error' | 'unlocked' | 'locked';

type AppLockState = {
  status: LockStatus;
  appState: AppStateStatus | 'unknown';
  lastBackgroundAt: number | null;
  failureMessage: string | null;
  isAuthenticating: boolean;
  hasUnlocked: boolean;
  canResume: boolean;
  retrySettings: () => Promise<void>;
  onAppStateChange: (next: AppStateStatus) => void;
  authenticate: (manual?: boolean) => Promise<boolean>;
  changeProtection: (enabled: boolean) => Promise<ProtectionChangeResult>;
};

let generation = 0;
let operationInFlight = false;
let autoAttempted = false;
let backgroundPending = false;

export const useAppLockStore = create<AppLockState>((set, get) => ({
  status: 'initializing',
  appState: AppState.currentState ?? 'unknown',
  lastBackgroundAt: null,
  failureMessage: null,
  isAuthenticating: false,
  hasUnlocked: false,
  canResume: false,

  retrySettings: async () => {
    set({ status: 'initializing', failureMessage: null });

    try {
      await useSettingsStore.getState().loadSettings();
      const enabled = useSettingsStore.getState().settings.requireBiometrics;

      if (!enabled) {
        set({ status: 'unlocked', hasUnlocked: true });
      } else {
        set({ status: 'locked' });
      }
    } catch {
      set({ status: 'load-error' });
    }
  },

  onAppStateChange: next => {
    set({ appState: next });

    if (next === 'background') {
      generation++;
      autoAttempted = false;

      if (!backgroundPending) {
        backgroundPending = true;
        set({
          lastBackgroundAt: Date.now(),
          canResume:
            get().status === 'unlocked' &&
            get().hasUnlocked &&
            !operationInFlight
        });
      }

      if (useSettingsStore.getState().settings.requireBiometrics) {
        set({ status: 'locked' });
      }

      return;
    }

    // Inactive includes the OS biometric sheet. Keep authentication and unlock state intact.
    if (next === 'inactive') {
      return;
    }

    if (next === 'active' && backgroundPending) {
      backgroundPending = false;
      const settings = useSettingsStore.getState();

      if (settings.loadStatus !== 'loaded') {
        return;
      }

      if (!settings.settings.requireBiometrics) {
        set({ status: 'unlocked', hasUnlocked: true });

        return;
      }

      const elapsed =
        get().lastBackgroundAt == null
          ? Infinity
          : Date.now() - get().lastBackgroundAt!;
      const timeout = settings.settings.lockTimeoutSeconds;

      if (
        timeout > 0 &&
        elapsed >= 0 &&
        elapsed < timeout * 1000 &&
        get().canResume
      ) {
        set({ status: 'unlocked', canResume: false });
      } else {
        set({ status: 'locked', failureMessage: null });
        autoAttempted = false;
      }
    }
  },

  authenticate: async (manual = false) => {
    if (
      operationInFlight ||
      get().appState !== 'active' ||
      get().status !== 'locked'
    ) {
      return false;
    }

    if (!manual && autoAttempted) {
      return false;
    }

    autoAttempted = true;
    operationInFlight = true;
    set({ isAuthenticating: true, failureMessage: null });
    const requestGeneration = generation;

    try {
      const result = await authenticateBiometrics();

      if (requestGeneration !== generation) {
        return false;
      }

      if (result.success) {
        set({ status: 'unlocked', hasUnlocked: true, failureMessage: null });

        return true;
      }

      set({ failureMessage: getAuthenticationMessage(result) });

      return false;
    } finally {
      operationInFlight = false;
      set({ isAuthenticating: false });
    }
  },

  changeProtection: async enabled => {
    if (
      operationInFlight ||
      get().appState !== 'active' ||
      get().status !== 'unlocked' ||
      useSettingsStore.getState().loadStatus !== 'loaded'
    ) {
      return {
        success: false,
        message: 'Authentication is already in progress or unavailable.'
      };
    }

    operationInFlight = true;
    set({ isAuthenticating: true });
    const requestGeneration = generation;

    try {
      const result = await authenticateBiometrics();

      if (requestGeneration !== generation) {
        return { success: false, message: 'Authentication was interrupted.' };
      }

      if (!result.success) {
        return { success: false, message: getAuthenticationMessage(result) };
      }

      await useSettingsStore.getState().setRequireBiometrics(enabled);

      if (requestGeneration !== generation) {
        if (enabled && useSettingsStore.getState().settings.requireBiometrics) {
          set({ status: 'locked', canResume: false });
        } else if (!useSettingsStore.getState().settings.requireBiometrics) {
          // Authentication preceded the committed write. Apply its disabled
          // policy, while the app-state cover still protects background UI.
          set({ status: 'unlocked', hasUnlocked: true, canResume: false });

          return { success: true };
        }

        return {
          success: false,
          message: 'The app went to the background before the change finished.'
        };
      }

      autoAttempted = false;
      set({
        status: 'unlocked',
        hasUnlocked: true,
        canResume: false,
        failureMessage: null
      });

      return { success: true };
    } finally {
      operationInFlight = false;
      set({ isAuthenticating: false });
    }
  }
}));

export function resetAppLockStoreForTest(): void {
  generation = 0;
  operationInFlight = false;
  autoAttempted = false;
  backgroundPending = false;
  useAppLockStore.setState({
    status: 'initializing',
    appState: 'unknown',
    lastBackgroundAt: null,
    failureMessage: null,
    isAuthenticating: false,
    hasUnlocked: false,
    canResume: false
  });
}

function getAuthenticationMessage(
  result: Awaited<ReturnType<typeof authenticateBiometrics>>
): string {
  if (result.success) {
    return '';
  }

  const warning = 'warning' in result ? result.warning : undefined;

  if (warning) {
    return warning;
  }

  if (result.error === 'not_enrolled') {
    return 'Set up biometrics in device settings, then try again.';
  }

  if (result.error === 'not_available') {
    return 'Strong biometrics are unavailable. Set up a strong biometric method in device settings.';
  }

  if (result.error === 'lockout') {
    return 'Biometrics are temporarily locked. Wait a moment, then try again.';
  }

  return 'Biometric authentication was not completed. Try again.';
}
