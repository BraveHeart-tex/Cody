/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import type { OtpAccount } from '@/features/totp/model/totp-account';

const mockSetStringAsync = jest.fn<(passcode: string) => Promise<void>>();

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@/features/account/model/passcode-clipboard', () => ({
  copyPasscode: (...args: [string]) => mockSetStringAsync(...args)
}));

jest.mock('@/features/totp/model/totp-code', () => ({
  generateTotpCode: () => '123456'
}));

jest.mock('@/features/totp/hooks/use-totp-countdown', () => ({
  useTotpCountdown: () => ({
    periodStartedAt: 1000,
    periodEndsAt: 31000,
    progress: 0.4,
    remainingSeconds: 18
  })
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/card', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    Card: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(View, props, children),
    CardContent: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(View, props, children),
    CardDescription: ({
      children,
      ...props
    }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children),
    CardHeader: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(View, props, children),
    CardTitle: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  const { Pressable, View } = require('react-native');

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    DropdownMenuItem: ({
      children,
      ...props
    }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children),
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children)
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Icon: () => React.createElement(Text, null, 'icon')
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
    duration: () => animationBuilder,
    easing: () => animationBuilder
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
      linear: (value: number) => value,
      out: (easing: (value: number) => number) => easing
    },
    FadeIn: animationBuilder,
    FadeOut: animationBuilder,
    LinearTransition: animationBuilder,
    useAnimatedStyle: (styleFactory: () => object) => styleFactory(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value
  };
});

import { AccountCard } from '@/features/account/components/account-card';

const account: OtpAccount = {
  id: 'account-id',
  issuer: 'GitHub',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  type: 'totp',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  color: '#0891B2',
  sortOrder: 0,
  createdAt: 123
};

describe('AccountCard', () => {
  afterEach(async () => {
    await cleanup();
    mockSetStringAsync.mockReset();
    jest.restoreAllMocks();
  });

  it('hides passcode, dropdown, progress, and timer while collapsed', async () => {
    const { getByText, queryByLabelText, queryByText, queryByTestId } =
      await render(
        <AccountCard
          account={account}
          isActive={false}
          onDelete={jest.fn()}
          onPress={jest.fn()}
        />
      );

    expect(getByText('GitHub')).toBeTruthy();
    expect(getByText('user@example.com')).toBeTruthy();
    expect(queryByText('Passcode 123456')).toBeNull();
    expect(queryByText('18s until refresh')).toBeNull();
    expect(queryByText('Profile')).toBeNull();
    expect(queryByLabelText('Account actions')).toBeNull();
    expect(queryByTestId('account-card-progress')).toBeNull();
  });

  it('shows passcode, dropdown, progress, and timer while active', async () => {
    const { getByLabelText, getByTestId, getByText } = await render(
      <AccountCard
        account={account}
        isActive
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />
    );

    expect(getByText('Passcode')).toBeTruthy();
    expect(getByText('123456')).toBeTruthy();
    expect(getByText('18s until refresh')).toBeTruthy();
    expect(getByText('Move')).toBeTruthy();
    expect(getByLabelText('Account actions')).toBeTruthy();
    expect(getByTestId('account-card-progress')).toBeTruthy();
  });

  it('uses the account label initial first', async () => {
    const { getByText } = await render(
      <AccountCard
        account={{ ...account, label: ' user@example.com ' }}
        isActive={false}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />
    );

    expect(getByText('U')).toBeTruthy();
  });

  it('falls back to issuer initial when label is blank', async () => {
    const { getByText } = await render(
      <AccountCard
        account={{ ...account, issuer: 'GitHub', label: ' ' }}
        isActive={false}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />
    );

    expect(getByText('G')).toBeTruthy();
  });

  it('falls back to question mark when label and issuer are blank', async () => {
    const { getByText } = await render(
      <AccountCard
        account={{ ...account, issuer: '', label: ' ' }}
        isActive={false}
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />
    );

    expect(getByText('?')).toBeTruthy();
  });

  it('copies the active passcode and shows copied feedback', async () => {
    mockSetStringAsync.mockResolvedValue(undefined);

    const { getByLabelText, getByTestId } = await render(
      <AccountCard
        account={account}
        isActive
        onDelete={jest.fn()}
        onPress={jest.fn()}
      />
    );

    await fireEvent.press(getByTestId('account-card-copy'));

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenCalledWith('123456');
    });
    expect(getByLabelText('Passcode copied')).toBeTruthy();
  });

  it('opens a permanent deletion alert without deleting immediately', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);

    const { getByText } = await render(
      <AccountCard
        account={account}
        isActive
        onDelete={onDelete}
        onPress={jest.fn()}
      />
    );

    await fireEvent.press(getByText('Delete'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete account?',
      expect.stringContaining('permanently deletes'),
      expect.any(Array)
    );
    expect(alertSpy.mock.calls[0]?.[1]).toContain('cannot be undone');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does not delete when the deletion alert is cancelled', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);

    const { getByText } = await render(
      <AccountCard
        account={account}
        isActive
        onDelete={onDelete}
        onPress={jest.fn()}
      />
    );

    await fireEvent.press(getByText('Delete'));
    const cancelButton = getAlertButton(alertSpy, 'Cancel');

    cancelButton.onPress?.();

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes the account when deletion is confirmed', async () => {
    const onDelete = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);

    const { getByText } = await render(
      <AccountCard
        account={account}
        isActive
        onDelete={onDelete}
        onPress={jest.fn()}
      />
    );

    await fireEvent.press(getByText('Delete'));
    const deleteButton = getAlertButton(alertSpy, 'Delete');

    deleteButton.onPress?.();

    expect(onDelete).toHaveBeenCalledWith('account-id');
  });
});

function getAlertButton(
  alertSpy: jest.SpiedFunction<typeof Alert.alert>,
  text: string
): AlertButton {
  const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[] | undefined;
  const button = buttons?.find(candidate => candidate.text === text);

  if (button == null) {
    throw new Error(`Missing ${text} alert button`);
  }

  return button;
}
