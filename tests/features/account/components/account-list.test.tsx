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
import { Alert } from 'react-native';
import { router } from 'expo-router';

import type { UseAccountsResult } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  CorruptAccountIndexError,
  type DamagedAccount
} from '@/features/totp/storage/totp-storage';

const mockDeleteAccount = jest.fn<UseAccountsResult['deleteAccount']>();
const mockReorderAccounts = jest.fn<UseAccountsResult['reorderAccounts']>();
const mockRetryAccount = jest.fn<UseAccountsResult['retryAccount']>();
const mockRemoveDamagedAccount =
  jest.fn<UseAccountsResult['removeDamagedAccount']>();
const mockRetryLoad = jest.fn<UseAccountsResult['retryLoad']>();
const mockStartReadding = jest.fn<UseAccountsResult['startReaddingAccounts']>();
let mockAccounts: OtpAccount[] = [];
let mockDamagedAccounts: DamagedAccount[] = [];
let mockError: Error | null = null;

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

jest.mock('@/features/totp/storage/totp-storage', () => ({
  CorruptAccountIndexError: class CorruptAccountIndexError extends Error {
    rawValue: string;

    constructor(mockRawValue: string) {
      super('The saved account index is not valid JSON.');
      this.name = 'CorruptAccountIndexError';
      this.rawValue = mockRawValue;
    }
  }
}));

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
      onMove,
      onPress
    }: {
      account: OtpAccount;
      isActive: boolean;
      onDelete: (accountId: string) => void;
      onMove?: () => void;
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
              View,
              null,
              React.createElement(
                Pressable,
                {
                  onPress: () => onDelete(account.id),
                  testID: `account-delete-${account.id}`
                },
                React.createElement(Text, null, 'Delete')
              ),
              onMove
                ? React.createElement(
                    Pressable,
                    {
                      onPress: onMove,
                      testID: `account-move-${account.id}`
                    },
                    React.createElement(Text, null, 'Move')
                  )
                : null
            )
          : null
      )
  };
});

jest.mock('@/features/account/components/damaged-account-card', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    DamagedAccountCard: ({
      account,
      onRemove,
      onRetry
    }: {
      account: DamagedAccount;
      onRemove: (id: string) => void;
      onRetry: (id: string) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `Damaged ${account.id}`),
        React.createElement(
          Pressable,
          {
            onPress: () => onRetry(account.id),
            testID: `damaged-retry-${account.id}`
          },
          React.createElement(Text, null, 'Retry')
        ),
        React.createElement(
          Pressable,
          {
            onPress: () => onRemove(account.id),
            testID: `damaged-remove-${account.id}`
          },
          React.createElement(Text, null, 'Remove')
        )
      )
  };
});

jest.mock('@/features/totp/hooks/use-accounts', () => ({
  useAccounts: (): UseAccountsResult => ({
    accounts: mockAccounts,
    accountIds: [
      ...mockAccounts.map(account => account.id),
      ...mockDamagedAccounts.map(account => account.id)
    ],
    damagedAccounts: mockDamagedAccounts,
    addAccount: jest.fn<UseAccountsResult['addAccount']>(),
    deleteAccount: mockDeleteAccount,
    error: mockError,
    isLoading: false,
    retryLoad: mockRetryLoad,
    retryAccount: mockRetryAccount,
    removeDamagedAccount: mockRemoveDamagedAccount,
    startReaddingAccounts: mockStartReadding,
    reorderAccounts: mockReorderAccounts,
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
    mockDamagedAccounts = [];
    mockError = null;
    mockDeleteAccount.mockImplementation(async id => {
      mockAccounts = mockAccounts.filter(candidate => candidate.id !== id);
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    mockDeleteAccount.mockReset();
    mockReorderAccounts.mockReset();
    mockRetryAccount.mockReset();
    mockRemoveDamagedAccount.mockReset();
    mockRetryLoad.mockReset();
    mockStartReadding.mockReset();
    jest.mocked(router.push).mockReset();
    jest.mocked(router.replace).mockReset();
  });

  it('shows a first-account empty state with add actions', async () => {
    mockAccounts = [];
    const { getByLabelText, getByText, queryByLabelText } = await render(
      <AccountList />
    );

    expect(getByText('Add your first account')).toBeTruthy();
    expect(getByText(/Scan an authenticator QR code/)).toBeTruthy();
    expect(getByLabelText('Scan QR code')).toBeTruthy();
    expect(getByLabelText('Add manually')).toBeTruthy();
    expect(queryByLabelText('Search accounts')).toBeNull();
  });

  it('opens the scanner from the first-account empty state', async () => {
    mockAccounts = [];
    const { getByLabelText } = await render(<AccountList />);

    await fireEvent.press(getByLabelText('Scan QR code'));

    expect(router.push).toHaveBeenCalledWith('/scan');
  });

  it('opens manual account entry from the first-account empty state', async () => {
    mockAccounts = [];
    const { getByLabelText } = await render(<AccountList />);

    await fireEvent.press(getByLabelText('Add manually'));

    expect(router.push).toHaveBeenCalledWith('/add-account/manual');
  });

  it('deletes an account in place and removes it from the list', async () => {
    const { getByTestId, queryByText } = await render(<AccountList />);

    expect(queryByText('GitHub')).toBeTruthy();

    await fireEvent.press(getByTestId('account-card-account-id'));
    await fireEvent.press(getByTestId('account-delete-account-id'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('account-id');
    });
    expect(router.replace).not.toHaveBeenCalled();

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

  it('opens the move accounts screen from an active account', async () => {
    mockAccounts = [account, secondAccount];
    const { getByTestId } = await render(<AccountList />);

    await fireEvent.press(getByTestId('account-card-account-id'));
    await fireEvent.press(getByTestId('account-move-account-id'));

    expect(router.push).toHaveBeenCalledWith('/move-accounts');
  });

  it('keeps a damaged account visible and retries it independently', async () => {
    mockDamagedAccounts = [
      { id: 'damaged-id', record: null, reason: 'missing-record' }
    ];
    mockRetryAccount.mockResolvedValue(undefined);

    const { getByTestId, getByText } = await render(<AccountList />);

    expect(getByText('GitHub')).toBeTruthy();
    expect(getByText('Damaged damaged-id')).toBeTruthy();

    await fireEvent.press(getByTestId('damaged-retry-damaged-id'));

    expect(mockRetryAccount).toHaveBeenCalledWith('damaged-id');
  });

  it('offers retry and confirmed re-add for a corrupt index', async () => {
    mockError = new CorruptAccountIndexError('{');
    mockRetryLoad.mockResolvedValue(undefined);
    mockStartReadding.mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText } = await render(<AccountList />);

    await fireEvent.press(getByLabelText('Retry loading saved accounts'));
    await fireEvent.press(getByLabelText('Re-add accounts'));

    expect(mockRetryLoad).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Re-add saved accounts?',
      expect.any(String),
      expect.any(Array)
    );
    const buttons = alertSpy.mock.calls[0]?.[2];
    const continueButton = buttons?.find(button => button.text === 'Continue');

    continueButton?.onPress?.();

    await waitFor(() => {
      expect(mockStartReadding).toHaveBeenCalledTimes(1);
    });
  });
});
