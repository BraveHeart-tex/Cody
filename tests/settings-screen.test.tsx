/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import type { AppSettings } from '@/features/settings/model/settings';
import type { BiometricsSupportStatus } from '@/features/settings/model/biometrics';
import type { SettingsStoreState } from '@/features/settings/store/settings-store';

let mockSettings: AppSettings;
const mockSetRequireBiometrics =
  jest.fn<SettingsStoreState['setRequireBiometrics']>();
const mockSetLockTimeoutSeconds =
  jest.fn<SettingsStoreState['setLockTimeoutSeconds']>();
const mockSetThemeMode = jest.fn<SettingsStoreState['setThemeMode']>();
const mockGetBiometricsSupportStatus =
  jest.fn<() => Promise<BiometricsSupportStatus>>();

jest.mock('@/components/ui/switch', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    Switch: ({
      accessibilityLabel,
      checked,
      disabled,
      onCheckedChange
    }: {
      accessibilityLabel: string;
      checked: boolean;
      disabled?: boolean;
      onCheckedChange: (checked: boolean) => void;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityLabel,
          accessibilityState: { checked, disabled },
          disabled,
          onPress: () => onCheckedChange(!checked)
        },
        React.createElement(Text, null, checked ? 'On' : 'Off')
      )
  };
});

jest.mock('@/components/ui/field', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    Field: ({
      children,
      label
    }: {
      children: React.ReactNode;
      label: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, label),
        children
      )
  };
});

jest.mock('@/components/ui/segmented-control', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    SegmentedControl: ({
      disabled,
      labels,
      onSelect,
      options
    }: {
      disabled?: boolean;
      labels?: Partial<Record<string, string>>;
      onSelect: (value: number | string) => void;
      options: readonly (number | string)[];
    }) =>
      React.createElement(
        View,
        null,
        options.map(option =>
          React.createElement(
            Pressable,
            {
              disabled,
              key: option,
              onPress: () => onSelect(option)
            },
            React.createElement(
              Text,
              null,
              labels?.[String(option)] ?? String(option)
            )
          )
        )
      )
  };
});

jest.mock('@/components/ui/status-message', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    StatusMessage: ({ value }: { value: string }) =>
      React.createElement(Text, null, value)
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const animationBuilder = {
    damping: () => animationBuilder,
    duration: () => animationBuilder,
    easing: () => animationBuilder,
    springify: () => animationBuilder,
    stiffness: () => animationBuilder,
    withInitialValues: () => animationBuilder
  };

  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children)
    },
    Easing: {
      cubic: (value: number) => value,
      in: (easing: (value: number) => number) => easing,
      out: (easing: (value: number) => number) => easing
    },
    FadeInUp: animationBuilder,
    FadeOutUp: animationBuilder,
    LinearTransition: animationBuilder
  };
});

jest.mock('@/features/settings/hooks/use-settings', () => ({
  useSettings: (): Partial<SettingsStoreState> => ({
    error: null,
    isLoading: false,
    saveError: null,
    setLockTimeoutSeconds: mockSetLockTimeoutSeconds,
    setRequireBiometrics: mockSetRequireBiometrics,
    setThemeMode: mockSetThemeMode,
    settings: mockSettings
  })
}));

jest.mock('@/features/settings/model/biometrics', () => ({
  getBiometricsSupportStatus: () => mockGetBiometricsSupportStatus()
}));

import { SettingsScreen } from '@/features/settings/components/settings-screen';

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockSettings = {
      lockTimeoutSeconds: 60,
      requireBiometrics: false,
      themeMode: 'system'
    };
    mockGetBiometricsSupportStatus.mockResolvedValue({ isSupported: true });
    mockSetRequireBiometrics.mockResolvedValue(undefined);
    mockSetLockTimeoutSeconds.mockResolvedValue(undefined);
    mockSetThemeMode.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    jest.resetAllMocks();
  });

  it('enables biometrics on supported devices', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);

    await fireEvent.press(getByLabelText('Require biometrics'));

    expect(mockGetBiometricsSupportStatus).toHaveBeenCalledTimes(1);
    expect(mockSetRequireBiometrics).toHaveBeenCalledWith(true);
  });

  it('blocks biometrics on unsupported devices', async () => {
    mockGetBiometricsSupportStatus.mockResolvedValueOnce({
      isSupported: false,
      reason: 'no-hardware'
    });
    const { findByText, getByLabelText } = await render(<SettingsScreen />);

    await fireEvent.press(getByLabelText('Require biometrics'));

    expect(mockSetRequireBiometrics).not.toHaveBeenCalled();
    expect(
      await findByText('This device does not support biometric authentication.')
    ).toBeTruthy();
  });

  it('hides timeout controls when biometrics are off', async () => {
    const { getByText, queryByText } = await render(<SettingsScreen />);

    expect(queryByText('5 min')).toBeNull();
    expect(
      getByText('Turn on biometrics to choose a lock timeout.')
    ).toBeTruthy();
  });

  it('changes timeout and theme selections', async () => {
    mockSettings = {
      lockTimeoutSeconds: 60,
      requireBiometrics: true,
      themeMode: 'system'
    };
    const { getByText } = await render(<SettingsScreen />);

    await fireEvent.press(getByText('5 min'));
    await fireEvent.press(getByText('Dark'));

    expect(mockSetLockTimeoutSeconds).toHaveBeenCalledWith(300);
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });
});
