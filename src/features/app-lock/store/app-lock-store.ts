import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import {
  getAuthenticationFeedback,
  type AuthenticationFailure
} from '@/features/app-lock/model/authentication-feedback';
import { authenticateBiometrics } from '@/features/settings/model/biometrics';
import { useSettingsStore } from '@/features/settings/store/settings-store';

type ProtectionChangeResult =
  | { success: true }
  | { success: false; message: string; kind?: AuthenticationFailure };

type LockStatus = 'initializing' | 'load-error' | 'unlocked' | 'locked';

type AppLockState = {
  status: LockStatus;
  appState: AppStateStatus | 'unknown';
  lastBackgroundAt: number | null;
  failureMessage: string | null;
  failureKind: AuthenticationFailure | null;
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
  failureKind: null,
  failureMessage: null,
  isAuthenticating: false,
  hasUnlocked: false,
  canResume: false,

  retrySettings: async () => {
    set({ status: 'initializing', failureKind: null, failureMessage: null });

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
        set({ status: 'locked', failureKind: null, failureMessage: null });
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
    set({ isAuthenticating: true, failureKind: null, failureMessage: null });
    const requestGeneration = generation;

    try {
      const result = await authenticateBiometrics();

      if (requestGeneration !== generation) {
        return false;
      }

      if (result.success) {
        set({
          status: 'unlocked',
          hasUnlocked: true,
          failureKind: null,
          failureMessage: null
        });

        return true;
      }

      const feedback = getAuthenticationFeedback(result);

      set({ failureKind: feedback.kind, failureMessage: feedback.message });

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
      const result = await authenticateBiometrics('change-protection');

      if (requestGeneration !== generation) {
        return { success: false, message: 'Authentication was interrupted.' };
      }

      if (!result.success) {
        return { success: false, ...getAuthenticationFeedback(result) };
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
        failureKind: null,
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
    failureKind: null,
    failureMessage: null,
    isAuthenticating: false,
    hasUnlocked: false,
    canResume: false
  });
}
