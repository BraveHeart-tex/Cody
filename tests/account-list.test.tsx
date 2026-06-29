/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import {
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import { router } from 'expo-router';

import type { UseAccountsResult } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';

const mockDeleteAccount = jest.fn<UseAccountsResult['deleteAccount']>();
let mockAccounts: OtpAccount[] = [];

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn()
  }
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Icon: (props: React.ComponentProps<typeof View>) =>
      React.createElement(View, props)
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

jest.mock('@/components/ui/state-card', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    StateCard: ({ title }: { title: string }) =>
      React.createElement(Text, null, title)
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

jest.mock('@/features/account/components/account-list-skeleton', () => ({
  AccountListSkeleton: () => null
}));

jest.mock('@/features/account/components/account-card', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    AccountCard: ({
      account,
      isActive,
      onDelete,
      onPress
    }: {
      account: OtpAccount;
      isActive: boolean;
      onDelete: (accountId: string) => void;
      onPress: (accountId: string) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          {
            onPress: () => onPress(account.id),
            testID: `account-card-${account.id}`
          },
          React.createElement(Text, null, account.issuer),
          React.createElement(Text, null, account.label)
        ),
        isActive
          ? React.createElement(
              Pressable,
              {
                onPress: () => onDelete(account.id),
                testID: `account-delete-${account.id}`
              },
              React.createElement(Text, null, 'Delete')
            )
          : null
      )
  };
});

jest.mock('@/features/totp/hooks/use-accounts', () => ({
  useAccounts: (): UseAccountsResult => ({
    accounts: mockAccounts,
    addAccount: jest.fn<UseAccountsResult['addAccount']>(),
    deleteAccount: mockDeleteAccount,
    error: null,
    isLoading: false,
    reorderAccounts: jest.fn<UseAccountsResult['reorderAccounts']>(),
    updateAccount: jest.fn<UseAccountsResult['updateAccount']>()
  })
}));

import { AccountList } from '@/features/account/components/account-list';

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

const secondAccount: OtpAccount = {
  ...account,
  id: 'second-account-id',
  issuer: 'Dropbox',
  label: 'work@example.com',
  sortOrder: 1
};

describe('AccountList', () => {
  beforeEach(() => {
    mockAccounts = [account];
    mockDeleteAccount.mockImplementation(async id => {
      mockAccounts = mockAccounts.filter(candidate => candidate.id !== id);
    });
  });

  afterEach(async () => {
    await cleanup();
    mockDeleteAccount.mockReset();
    jest.mocked(router.push).mockReset();
    jest.mocked(router.replace).mockReset();
  });

  it('deletes an account, returns home, and removes it from the list', async () => {
    const { getByTestId, queryByText } = await render(<AccountList />);

    expect(queryByText('GitHub')).toBeTruthy();

    await fireEvent.press(getByTestId('account-card-account-id'));
    await fireEvent.press(getByTestId('account-delete-account-id'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('account-id');
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });

    await waitFor(() => {
      expect(queryByText('GitHub')).toBeNull();
    });
  });

  it('filters accounts by issuer', async () => {
    mockAccounts = [account, secondAccount];
    const { getByLabelText, queryByText } = await render(<AccountList />);

    await fireEvent.changeText(getByLabelText('Search accounts'), 'git');

    expect(queryByText('GitHub')).toBeTruthy();
    expect(queryByText('Dropbox')).toBeNull();
  });

  it('filters accounts by label case-insensitively', async () => {
    mockAccounts = [account, secondAccount];
    const { getByLabelText, queryByText } = await render(<AccountList />);

    await fireEvent.changeText(
      getByLabelText('Search accounts'),
      'WORK@EXAMPLE.COM'
    );

    expect(queryByText('Dropbox')).toBeTruthy();
    expect(queryByText('GitHub')).toBeNull();
  });

  it('shows a search-specific empty state when no accounts match', async () => {
    mockAccounts = [account];
    const { getByLabelText, queryByText } = await render(<AccountList />);

    await fireEvent.changeText(getByLabelText('Search accounts'), 'dropbox');

    expect(queryByText('No matching accounts')).toBeTruthy();
    expect(queryByText('No accounts yet')).toBeNull();
  });

  it('collapses the active account when the search query changes', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await render(
      <AccountList />
    );

    await fireEvent.press(getByTestId('account-card-account-id'));

    expect(queryByTestId('account-delete-account-id')).toBeTruthy();

    await fireEvent.changeText(getByLabelText('Search accounts'), 'git');

    expect(queryByTestId('account-delete-account-id')).toBeNull();
  });
});
