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

import type { AppSettings } from '@/features/settings/model/settings';
import type { SettingsStoreState } from '@/features/settings/store/settings-store';

let mockSettings: AppSettings;
let mockSaveError: Error | null = null;
const mockChangeProtection =
  jest.fn<
    (
      enabled: boolean
    ) => Promise<
      | { success: true }
      | { success: false; message: string; kind?: 'cancelled' }
    >
  >();
const mockSetLockTimeoutSeconds =
  jest.fn<SettingsStoreState['setLockTimeoutSeconds']>();
const mockSetThemeMode = jest.fn<SettingsStoreState['setThemeMode']>();

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
              accessibilityState: { disabled },
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
    TextClassContext: React.createContext(''),
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const animationBuilder = {
    damping: () => animationBuilder,
    dampingRatio: () => animationBuilder,
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
    get saveError() {
      return mockSaveError;
    },
    setLockTimeoutSeconds: mockSetLockTimeoutSeconds,
    setThemeMode: mockSetThemeMode,
    settings: mockSettings
  })
}));

jest.mock('@/features/app-lock/store/app-lock-store', () => ({
  useAppLockStore: (
    selector: (state: {
      changeProtection: typeof mockChangeProtection;
    }) => unknown
  ) => selector({ changeProtection: mockChangeProtection })
}));

import { SettingsScreen } from '@/features/settings/components/settings-screen';

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockSaveError = null;
    mockSettings = {
      lockTimeoutSeconds: 60,
      requireBiometrics: false,
      themeMode: 'system'
    };
    mockChangeProtection.mockResolvedValue({ success: true });
    mockSetLockTimeoutSeconds.mockResolvedValue(undefined);
    mockSetThemeMode.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    jest.resetAllMocks();
  });

  it('enables protection through the app-lock action', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);

    await fireEvent.press(getByLabelText('Require biometrics'));

    expect(mockChangeProtection).toHaveBeenCalledWith(true);
  });

  it('displays the app-lock failure message without changing protection', async () => {
    mockChangeProtection.mockResolvedValueOnce({
      success: false,
      message: 'Authentication was canceled.'
    });
    const { findByText, getByLabelText } = await render(<SettingsScreen />);

    await fireEvent.press(getByLabelText('Require biometrics'));

    expect(mockChangeProtection).toHaveBeenCalledWith(true);
    expect(await findByText('Authentication was canceled.')).toBeTruthy();
  });

  it('treats cancellation neutrally without changing the switch', async () => {
    mockChangeProtection.mockResolvedValueOnce({
      success: false,
      kind: 'cancelled',
      message: 'Authentication cancelled.'
    });
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Require biometrics'));
    expect(
      screen.getByText('Authentication cancelled. No settings were changed.')
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Require biometrics').props.accessibilityState
        .checked
    ).toBe(false);
  });

  it('keeps the selected timeout and permits retry after a failed write', async () => {
    mockSettings.requireBiometrics = true;
    mockSetLockTimeoutSeconds.mockRejectedValueOnce(new Error('disk full'));
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByText('5 min'));
    expect(
      screen.getByText(
        'Couldn’t save your lock timeout. Your previous setting is unchanged.'
      )
    ).toBeTruthy();
    expect(
      screen.getByText('1 min').parent?.props.accessibilityState.selected
    ).toBe(true);
    await fireEvent.press(screen.getByText('5 min'));
    expect(mockSetLockTimeoutSeconds).toHaveBeenCalledTimes(2);
  });

  it('authenticates before disabling protection too', async () => {
    mockSettings = {
      lockTimeoutSeconds: 60,
      requireBiometrics: true,
      themeMode: 'system'
    };
    const { getByLabelText } = await render(<SettingsScreen />);

    await fireEvent.press(getByLabelText('Require biometrics'));

    expect(mockChangeProtection).toHaveBeenCalledWith(false);
  });

  it('keeps protection and timeout controls disabled while authentication is pending', async () => {
    mockSettings = {
      lockTimeoutSeconds: 60,
      requireBiometrics: true,
      themeMode: 'system'
    };
    let finishChange!: (result: { success: true }) => void;

    mockChangeProtection.mockReturnValueOnce(
      new Promise(resolve => {
        finishChange = resolve;
      })
    );
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Require biometrics'));
      await Promise.resolve();
    });
    fireEvent.press(getByLabelText('Require biometrics'));
    expect(
      getByLabelText('Require biometrics').props.accessibilityState.disabled
    ).toBe(true);
    expect(getByText('5 min').parent?.props.accessibilityState.disabled).toBe(
      true
    );
    expect(mockChangeProtection).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishChange({ success: true });
    });
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

  it('keeps showing storage failures from settings persistence', async () => {
    mockSaveError = new Error('disk unavailable');
    const { getByText } = await render(<SettingsScreen />);

    expect(
      getByText('Settings storage is unavailable. Try your change again.')
    ).toBeTruthy();
  });

  it('shows an inline save failure and keeps security controls available for retry', async () => {
    mockSaveError = null;
    mockChangeProtection.mockImplementationOnce(async () => {
      mockSaveError = new Error('disk unavailable');

      throw mockSaveError;
    });
    const { getByLabelText, getByText, rerender } = await render(
      <SettingsScreen />
    );

    await act(async () => {
      await fireEvent.press(getByLabelText('Require biometrics'));
    });
    expect(mockChangeProtection).toHaveBeenCalledWith(true);
    await rerender(<SettingsScreen />);

    expect(
      getByText(
        'Couldn’t save biometric protection. Your previous setting is unchanged.'
      )
    ).toBeTruthy();
    expect(
      getByLabelText('Require biometrics').props.accessibilityState.disabled
    ).toBe(false);
    expect(mockChangeProtection).toHaveBeenCalledTimes(1);

    mockSaveError = null;
    await rerender(<SettingsScreen />);
    expect(
      getByLabelText('Require biometrics').props.accessibilityState.disabled
    ).toBe(false);
  });
});
