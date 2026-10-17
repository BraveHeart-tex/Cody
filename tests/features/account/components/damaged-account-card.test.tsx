import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { DamagedAccountCard } from '@/features/account/components/damaged-account-card';
import type { DamagedAccount } from '@/features/totp/storage/totp-storage';

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
    CardDescription: ({
      children,
      ...props
    }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children),
    CardTitle: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/components/ui/status-message', () => ({
  StatusMessage: () => null
}));

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    TextClassContext: React.createContext(''),
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

describe('DamagedAccountCard', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('explains unavailable secrets and offers removal without retry', async () => {
    const account: DamagedAccount = {
      id: 'account-id',
      record: {
        id: 'account-id',
        issuer: 'GitHub',
        label: 'user@example.com',
        type: 'totp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        sortOrder: 0,
        createdAt: 123
      },
      reason: 'missing-secret'
    };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText, getByText, queryByLabelText } = await render(
      <DamagedAccountCard
        account={account}
        onRemove={jest.fn(async () => {})}
        onRetry={jest.fn(async () => {})}
      />
    );

    expect(
      getByText(
        'Cody cannot access this account’s saved secret on this device. Remove this entry and add the account again with its original setup key or QR code.'
      )
    ).toBeTruthy();
    expect(queryByLabelText('Retry recovery of GitHub')).toBeNull();

    fireEvent.press(getByLabelText('Remove GitHub'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Remove damaged account?',
      expect.stringContaining('original setup key or QR code'),
      expect.any(Array)
    );
  });
});
