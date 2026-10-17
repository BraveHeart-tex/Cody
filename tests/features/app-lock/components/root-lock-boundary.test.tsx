/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, render } from '@testing-library/react-native';

let mockGateMounts = 0;
let mockGateUnmounts = 0;
let mockSettingsReads = 0;
let mockFontsState: [boolean, Error | null] = [true, null];
let mockSplashHideCalls = 0;

jest.mock('@/global.css', () => ({}));
jest.mock('@/features/app-lock/components/app-lock-gate', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    AppLockGate: ({ children }: { children: React.ReactNode }) => {
      React.useEffect(() => {
        mockGateMounts++;

        return () => {
          mockGateUnmounts++;
        };
      }, []);

      return React.createElement(View, { testID: 'root-lock-gate' }, children);
    }
  };
});
jest.mock('@/features/settings/hooks/use-theme-mode', () => ({
  useThemeMode: () => undefined
}));
jest.mock('@/features/settings/storage/settings-storage', () => ({
  getSettings: () => {
    mockSettingsReads++;

    return new Promise(() => undefined);
  },
  setSettings: async () => undefined
}));
jest.mock('@/features/account/components/move-accounts-done-button', () => ({
  MoveAccountsDoneButton: () => null
}));
jest.mock('expo-font', () => ({ useFonts: () => mockFontsState }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => undefined,
  hideAsync: async () => {
    mockSplashHideCalls++;
  }
}));
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: async () => undefined
}));
jest.mock('@rn-primitives/portal', () => ({ PortalHost: () => null }));
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  const Screen = () => null;

  Screen.displayName = 'Stack.Screen';
  Stack.Screen = Screen;

  return { Stack };
});
jest.mock('expo-router/react-navigation', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children)
  };
});
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children)
  };
});

import RootLayout from '@/app/_layout';
import {
  resetSettingsStoreForTest,
  useSettingsStore
} from '@/features/settings/store/settings-store';

afterEach(async () => {
  await cleanup();
  resetSettingsStoreForTest();
  mockGateMounts = 0;
  mockGateUnmounts = 0;
  mockSettingsReads = 0;
  mockFontsState = [true, null];
  mockSplashHideCalls = 0;
  jest.clearAllMocks();
});

describe('root lock boundary', () => {
  it.each([
    ['loading', [false, null] as [boolean, Error | null]],
    [
      'failed',
      [false, new Error('font load failed')] as [boolean, Error | null]
    ]
  ])('renders the app shell when fonts are %s', async (_state, fontsState) => {
    resetSettingsStoreForTest();
    useSettingsStore.setState({ loadStatus: 'loaded', isLoading: false });
    mockFontsState = fontsState;

    const screen = await render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('root-lock-gate')).toBeTruthy();
    expect(mockGateMounts).toBe(1);
    expect(mockSplashHideCalls).toBe(1);
  });

  it('keeps the gate mounted through a settings retry loading state', async () => {
    resetSettingsStoreForTest();
    useSettingsStore.setState({
      loadStatus: 'failed',
      isLoading: false,
      error: new Error('previous read failed')
    });

    const screen = await render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(useSettingsStore.getState().loadStatus).toBe('loading');
    expect(screen.getByTestId('root-lock-gate')).toBeTruthy();
    expect(mockGateMounts).toBe(1);
    expect(mockGateUnmounts).toBe(0);
    expect(mockSettingsReads).toBe(1);
  });
});
