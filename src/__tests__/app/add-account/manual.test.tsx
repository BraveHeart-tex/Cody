/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';

import type { UseAccountsResult } from '@/features/totp/hooks/use-accounts';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';

const mockAddAccount = jest.fn<UseAccountsResult['addAccount']>();

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn()
  }
}));

jest.mock('@/features/totp/model/account-id', () => ({
  createAccountId: () => 'manual-account-id'
}));

jest.mock('@/features/totp/model/totp-code', () => ({
  generateTotpCode: () => '123456'
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/input', () => {
  const React = require('react');
  const { TextInput } = require('react-native');

  return {
    Input: (props: React.ComponentProps<typeof TextInput>) =>
      React.createElement(TextInput, props)
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

jest.mock('@/features/totp/hooks/use-accounts', () => ({
  useAccounts: (): UseAccountsResult => ({
    accounts: [],
    addAccount: mockAddAccount,
    deleteAccount: jest.fn<UseAccountsResult['deleteAccount']>(),
    error: null,
    isLoading: false,
    reorderAccounts: jest.fn<UseAccountsResult['reorderAccounts']>(),
    updateAccount: jest.fn<UseAccountsResult['updateAccount']>()
  })
}));

import ManualAddAccountScreen from '@/app/add-account/manual';

describe('ManualAddAccountScreen', () => {
  afterEach(async () => {
    await cleanup();
    mockAddAccount.mockReset();
    jest.mocked(router.replace).mockReset();
  });

  it('masks and reveals the secret key field', async () => {
    const { getByLabelText, getByText } = await render(
      <ManualAddAccountScreen />
    );

    expect(getByLabelText('Secret key').props.secureTextEntry).toBe(true);

    await fireEvent.press(getByText('Show'));

    await waitFor(() => {
      expect(getByLabelText('Secret key').props.secureTextEntry).toBe(false);
    });
  });

  it('saves a valid manual account and returns home', async () => {
    mockAddAccount.mockResolvedValue(undefined);
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    const { getByLabelText, getByText } = await render(
      <ManualAddAccountScreen />
    );

    await fireEvent.changeText(getByLabelText('Issuer'), ' GitHub ');
    await fireEvent.changeText(
      getByLabelText('Account label'),
      ' user@example.com '
    );
    await fireEvent.changeText(
      getByLabelText('Secret key'),
      ' jbsw y3dp ehpk 3pxp '
    );
    await fireEvent.press(getByText('Save Account'));

    await waitFor(() => {
      expect(mockAddAccount).toHaveBeenCalledWith({
        id: 'manual-account-id',
        issuer: 'GitHub',
        label: 'user@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        color: getDefaultAccountColor({
          id: 'manual-account-id',
          issuer: 'GitHub',
          label: 'user@example.com'
        }),
        createdAt: 123456789,
        sortOrder: 0
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });
});
