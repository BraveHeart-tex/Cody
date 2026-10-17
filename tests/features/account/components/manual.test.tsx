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
import { DuplicateAccountSecretError } from '@/features/totp/model/account-errors';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';

const mockAddAccount = jest.fn<UseAccountsResult['addAccount']>();
const mockRetryLoad = jest.fn<UseAccountsResult['retryLoad']>();
let mockError: Error | null = null;
let mockIsLoading = false;

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
  canGenerateTotpCode: () => true
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
    accountIds: [],
    damagedAccounts: [],
    accountSecretLoading: {},
    addAccount: mockAddAccount,
    deleteAccount: jest.fn<UseAccountsResult['deleteAccount']>(),
    error: mockError,
    isLoading: mockIsLoading,
    retryLoad: mockRetryLoad,
    retryAccount: jest.fn<UseAccountsResult['retryAccount']>(),
    loadAccountSecret: jest.fn<UseAccountsResult['loadAccountSecret']>(),
    removeDamagedAccount: jest.fn<UseAccountsResult['removeDamagedAccount']>(),
    startReaddingAccounts:
      jest.fn<UseAccountsResult['startReaddingAccounts']>(),
    reorderAccounts: jest.fn<UseAccountsResult['reorderAccounts']>(),
    updateAccount: jest.fn<UseAccountsResult['updateAccount']>()
  })
}));

import ManualAddAccountScreen from '@/app/add-account/manual';

describe('ManualAddAccountScreen', () => {
  afterEach(async () => {
    await cleanup();
    mockAddAccount.mockReset();
    mockRetryLoad.mockReset();
    mockError = null;
    mockIsLoading = false;
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

  it('shows friendly feedback when the account store rejects a duplicate', async () => {
    mockAddAccount.mockRejectedValue(new DuplicateAccountSecretError());

    const { getByLabelText, getByText } = await render(
      <ManualAddAccountScreen />
    );

    await fireEvent.changeText(
      getByLabelText('Account label'),
      'user@example.com'
    );
    await fireEvent.changeText(
      getByLabelText('Secret key'),
      'JBSWY3DPEHPK3PXP'
    );
    await fireEvent.press(getByText('Save Account'));

    expect(
      await waitFor(() => getByText('This account is already saved.'))
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('retries a failed storage load and preserves the manual account draft', async () => {
    mockError = new Error('Storage unavailable');
    mockRetryLoad.mockImplementation(async () => {
      mockError = null;
    });
    mockAddAccount.mockResolvedValue(undefined);

    const { getByLabelText, getByText, queryByLabelText, rerender } =
      await render(<ManualAddAccountScreen />);

    await fireEvent.changeText(getByLabelText('Issuer'), 'GitHub');
    await fireEvent.changeText(
      getByLabelText('Account label'),
      'user@example.com'
    );
    await fireEvent.changeText(
      getByLabelText('Secret key'),
      'JBSW Y3DP EHPK 3PXP'
    );
    expect(
      getByText('Cody could not read the saved accounts. Retry to try again.')
    ).toBeTruthy();

    await fireEvent.press(getByLabelText('Retry loading saved accounts'));
    rerender(<ManualAddAccountScreen />);

    await waitFor(() => {
      expect(mockRetryLoad).toHaveBeenCalledTimes(1);
      expect(queryByLabelText('Retry loading saved accounts')).toBeNull();
    });
    expect(getByLabelText('Issuer').props.value).toBe('GitHub');
    expect(getByLabelText('Account label').props.value).toBe(
      'user@example.com'
    );
    expect(getByLabelText('Secret key').props.value).toBe(
      'JBSW Y3DP EHPK 3PXP'
    );

    await fireEvent.press(getByText('Save Account'));
    await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(1));
  });
});
