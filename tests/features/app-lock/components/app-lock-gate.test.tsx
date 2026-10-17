/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';

type AuthResult =
  { success: true } | { success: false; error: string; warning?: string };

let mockAuthenticate = async (): Promise<AuthResult> => ({
  success: false,
  error: 'user_cancel'
});
let mockGetSettings = async () => ({
  requireBiometrics: false,
  lockTimeoutSeconds: 60,
  themeMode: 'system'
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    TextClassContext: React.createContext(''),
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});
jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});
jest.mock('@/features/settings/model/biometrics', () => ({
  authenticateBiometrics: () => mockAuthenticate()
}));
jest.mock('@/features/settings/storage/settings-storage', () => ({
  getSettings: () => mockGetSettings(),
  setSettings: async () => undefined
}));

import type { AuthenticationFailure } from '@/features/app-lock/model/authentication-feedback';
import { AppLockGate } from '@/features/app-lock/components/app-lock-gate';
import {
  resetAppLockStoreForTest,
  useAppLockStore
} from '@/features/app-lock/store/app-lock-store';
import {
  resetSettingsStoreForTest,
  useSettingsStore
} from '@/features/settings/store/settings-store';

const originalLockActions = {
  retrySettings: useAppLockStore.getState().retrySettings,
  onAppStateChange: useAppLockStore.getState().onAppStateChange,
  authenticate: useAppLockStore.getState().authenticate,
  changeProtection: useAppLockStore.getState().changeProtection
};

afterEach(async () => {
  await cleanup();
  resetAppLockStoreForTest();
  useAppLockStore.setState(originalLockActions);
  resetSettingsStoreForTest();
  jest.restoreAllMocks();
});

beforeEach(() => {
  mockAuthenticate = async () => ({ success: false, error: 'user_cancel' });
  mockGetSettings = async () => ({
    requireBiometrics: false,
    lockTimeoutSeconds: 60,
    themeMode: 'system'
  });
});

function DraftScreen() {
  const [draft, setDraft] = useState('original');

  return (
    <View testID="protected-screen">
      <TextInput testID="draft" value={draft} onChangeText={setDraft} />
    </View>
  );
}

function seedLoadedSettings(requireBiometrics: boolean) {
  useSettingsStore.setState({
    error: null,
    isLoading: false,
    loadStatus: 'loaded',
    saveError: null,
    settings: {
      requireBiometrics,
      lockTimeoutSeconds: 60,
      themeMode: 'system'
    }
  });
}

describe('AppLockGate', () => {
  it.each<
    [
      'initializing' | 'load-error' | 'locked',
      boolean,
      string | null,
      'lock' | 'attention'
    ]
  >([
    ['initializing', false, 'Old failure', 'lock'],
    ['load-error', false, null, 'attention'],
    ['locked', false, null, 'lock'],
    ['locked', false, 'Authentication failed', 'attention'],
    ['locked', true, 'Old failure', 'lock']
  ])(
    'uses %s / authenticating=%s / failure=%s artwork without exposing content',
    async (status, isAuthenticating, failureMessage, variant) => {
      useAppLockStore.setState({
        status,
        appState: 'active',
        isAuthenticating,
        failureMessage,
        hasUnlocked: false,
        retrySettings: async () => undefined,
        onAppStateChange: () => undefined,
        authenticate: async () => false
      });

      const screen = await render(
        <AppLockGate>
          <DraftScreen />
        </AppLockGate>
      );

      expect(screen.queryByTestId('protected-screen')).toBeNull();
      expect(
        screen.getByTestId(`security-illustration-${variant}`, {
          includeHiddenElements: true
        }).props
      ).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
        pointerEvents: 'none'
      });
    }
  );

  it.each<[AuthenticationFailure, string, 'lock' | 'attention']>([
    ['cancelled', 'Cody is locked', 'lock'],
    ['not-enrolled', 'Set up biometrics first', 'attention'],
    ['weak-biometric', 'Strong biometrics required', 'attention'],
    ['unavailable', 'Biometrics unavailable', 'attention'],
    ['lockout', 'Biometrics temporarily locked', 'attention']
  ])(
    'presents %s recovery while protecting accounts',
    async (failureKind, title, variant) => {
      useAppLockStore.setState({
        status: 'locked',
        appState: 'active',
        hasUnlocked: false,
        failureKind,
        failureMessage:
          failureKind === 'cancelled'
            ? 'Authentication cancelled.'
            : 'Recovery guidance',
        retrySettings: async () => undefined,
        onAppStateChange: () => undefined,
        authenticate: async () => false
      });
      const screen = await render(
        <AppLockGate>
          <DraftScreen />
        </AppLockGate>
      );

      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.queryByTestId('protected-screen')).toBeNull();
      expect(
        screen.getByTestId(`security-illustration-${variant}`, {
          includeHiddenElements: true
        })
      ).toBeTruthy();

      if (failureKind === 'not-enrolled' || failureKind === 'weak-biometric') {
        await fireEvent.press(screen.getByText('See device settings steps'));
        expect(screen.getByText(/In device Settings/)).toBeTruthy();
      } else {
        expect(screen.queryByText('See device settings steps')).toBeNull();
      }
    }
  );

  it('keeps cold-start protected content unmounted until automatic authentication succeeds', async () => {
    mockGetSettings = async () => ({
      requireBiometrics: true,
      lockTimeoutSeconds: 60,
      themeMode: 'system'
    });
    let finishAuthentication!: (result: AuthResult) => void;

    mockAuthenticate = () =>
      new Promise(resolve => {
        finishAuthentication = resolve;
      });

    const screen = await render(
      <AppLockGate>
        <DraftScreen />
      </AppLockGate>
    );

    expect(screen.queryByTestId('protected-screen')).toBeNull();
    expect(screen.getByText('Cody is locked')).toBeTruthy();

    await act(async () => {
      useAppLockStore.getState().onAppStateChange('active');
    });
    expect(useAppLockStore.getState().isAuthenticating).toBe(true);

    await act(async () => {
      finishAuthentication({ success: true });
    });
    expect(screen.getByTestId('protected-screen')).toBeTruthy();
  });

  it('keeps content unmounted after a settings read error until retry succeeds', async () => {
    let rejectSettings!: (error: Error) => void;
    let finishRetry!: (settings: {
      requireBiometrics: boolean;
      lockTimeoutSeconds: number;
      themeMode: 'system';
    }) => void;
    let calls = 0;

    mockGetSettings = () => {
      calls++;

      return calls === 1
        ? new Promise((_, reject) => {
            rejectSettings = reject;
          })
        : new Promise(resolve => {
            finishRetry = resolve;
          });
    };

    const screen = await render(
      <AppLockGate>
        <DraftScreen />
      </AppLockGate>
    );

    await act(async () => {
      rejectSettings(new Error('settings read failed'));
    });
    expect(screen.getByText('Could not load security settings')).toBeTruthy();
    expect(screen.queryByTestId('protected-screen')).toBeNull();

    await fireEvent.press(screen.getByText('Retry loading'));
    expect(screen.queryByTestId('protected-screen')).toBeNull();
    await act(async () => {
      finishRetry({
        requireBiometrics: false,
        lockTimeoutSeconds: 60,
        themeMode: 'system'
      });
    });
    await act(async () => {
      useAppLockStore.getState().onAppStateChange('active');
    });
    expect(screen.getByTestId('protected-screen')).toBeTruthy();
  });

  it('covers inactive app state, dismisses the keyboard, and avoids a second prompt on return', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');

    mockGetSettings = async () => ({
      requireBiometrics: true,
      lockTimeoutSeconds: 60,
      themeMode: 'system'
    });
    let authCalls = 0;

    mockAuthenticate = async () => {
      authCalls++;

      return { success: false, error: 'user_cancel' };
    };

    const screen = await render(
      <AppLockGate>
        <DraftScreen />
      </AppLockGate>
    );

    await act(async () => {
      useAppLockStore.getState().onAppStateChange('active');
    });
    expect(authCalls).toBe(1);
    expect(dismiss).toHaveBeenCalled();
    expect(screen.queryByTestId('protected-screen')).toBeNull();

    await act(async () => {
      useAppLockStore.getState().onAppStateChange('inactive');
    });
    expect(screen.getByText('Cody is locked')).toBeTruthy();
    await act(async () => {
      useAppLockStore.getState().onAppStateChange('active');
    });
    expect(authCalls).toBe(1);
    expect(screen.getByText('Unlock with biometrics')).toBeTruthy();

    await fireEvent.press(screen.getByText('Unlock with biometrics'));
    expect(authCalls).toBe(2);
  });

  it('covers the visible subtree while preserving its mounted draft and hiding it from accessibility', async () => {
    seedLoadedSettings(false);
    useAppLockStore.setState({
      status: 'unlocked',
      appState: 'active',
      hasUnlocked: true,
      canResume: false,
      failureMessage: null,
      isAuthenticating: false,
      lastBackgroundAt: null,
      retrySettings: async () => undefined,
      onAppStateChange: () => undefined,
      authenticate: async () => false,
      changeProtection: async () => ({ success: false, message: 'no' })
    });
    const screen = await render(
      <AppLockGate>
        <DraftScreen />
      </AppLockGate>
    );
    const input = screen.getByTestId('draft');

    await fireEvent.changeText(input, 'unfinished draft');
    await act(async () => {
      useAppLockStore.setState({ status: 'locked' });
    });
    expect(
      screen.getByTestId('app-lock-protected-content', {
        includeHiddenElements: true
      }).props.pointerEvents
    ).toBe('none');
    expect(
      screen.getByTestId('app-lock-protected-content', {
        includeHiddenElements: true
      }).props.accessibilityElementsHidden
    ).toBe(true);
    expect(
      screen.getByTestId('draft', { includeHiddenElements: true }).props.value
    ).toBe('unfinished draft');
    expect(screen.getByText('Cody is locked')).toBeTruthy();

    await act(async () => {
      useAppLockStore.setState({ status: 'unlocked' });
    });
    expect(
      screen.getByTestId('draft', { includeHiddenElements: true }).props.value
    ).toBe('unfinished draft');
  });
});
