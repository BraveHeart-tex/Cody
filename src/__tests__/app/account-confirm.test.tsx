/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { router } from 'expo-router';

import type { UseAccountsResult } from '@/features/totp/hooks/use-accounts';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';
import type { TotpDraft } from '@/features/totp/model/parse-otpauth-uri';

const mockAddAccount = jest.fn<UseAccountsResult['addAccount']>();
let mockAccounts: UseAccountsResult['accounts'] = [];
let mockDraftId = 'qr-draft-id';

const scannedDraft: TotpDraft = {
  issuer: 'GitHub',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  type: 'totp',
  algorithm: 'SHA1',
  digits: 6,
  period: 30
};

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn()
  },
  useLocalSearchParams: () => ({
    draftId: mockDraftId
  })
}));

jest.mock('@/features/totp/model/account-id', () => ({
  createAccountId: () => 'scanned-account-id'
}));

jest.mock('@/features/totp/model/scanner-drafts', () => ({
  deleteScannerDraft: jest.fn(),
  getScannerDraft: jest.fn()
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
    accounts: mockAccounts,
    addAccount: mockAddAccount,
    deleteAccount: jest.fn<UseAccountsResult['deleteAccount']>(),
    error: null,
    isLoading: false,
    reorderAccounts: jest.fn<UseAccountsResult['reorderAccounts']>(),
    updateAccount: jest.fn<UseAccountsResult['updateAccount']>()
  })
}));

import {
  deleteScannerDraft,
  getScannerDraft
} from '@/features/totp/model/scanner-drafts';
import AccountConfirmScreen from '@/app/account-confirm';

const mockDeleteScannerDraft = jest.mocked(deleteScannerDraft);
const mockGetScannerDraft = jest.mocked(getScannerDraft);

describe('AccountConfirmScreen', () => {
  beforeEach(() => {
    mockAccounts = [];
    mockDraftId = 'qr-draft-id';
    mockAddAccount.mockReset();
    mockDeleteScannerDraft.mockReset();
    mockGetScannerDraft.mockReset();
    mockGetScannerDraft.mockReturnValue(scannedDraft);
    jest.mocked(router.back).mockReset();
    jest.mocked(router.replace).mockReset();
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('receives a scanner draft and shows the parsed account fields', async () => {
    mockGetScannerDraft.mockReturnValue(scannedDraft);

    const { getByLabelText, getByText, queryByText } = await render(
      <AccountConfirmScreen />
    );

    expect(mockGetScannerDraft).toHaveBeenCalledWith('qr-draft-id');
    expect(getByText('GitHub')).toBeTruthy();
    expect(getByLabelText('Account label').props.value).toBe(
      'user@example.com'
    );
    expect(queryByText('Type')).toBeNull();
    expect(queryByText('Algorithm')).toBeNull();
    expect(queryByText('Digits')).toBeNull();
    expect(queryByText('Period')).toBeNull();
  });

  it('saves the account with the edited label and returns home', async () => {
    mockGetScannerDraft.mockReturnValue(scannedDraft);
    mockAddAccount.mockResolvedValue(undefined);
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    const { getByLabelText, getByText } = await render(
      <AccountConfirmScreen />
    );

    await fireEvent.changeText(
      getByLabelText('Account label'),
      ' edited@example.com '
    );
    await fireEvent.press(getByText('Save Account'));

    await waitFor(() => {
      expect(mockAddAccount).toHaveBeenCalledWith({
        id: 'scanned-account-id',
        issuer: 'GitHub',
        label: 'edited@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        color: getDefaultAccountColor({
          id: 'scanned-account-id',
          issuer: 'GitHub',
          label: 'edited@example.com'
        }),
        createdAt: 123456789,
        sortOrder: 0
      });
    });
    expect(mockDeleteScannerDraft).toHaveBeenCalledWith('qr-draft-id');
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('blocks saving when the edited label is blank', async () => {
    mockGetScannerDraft.mockReturnValue(scannedDraft);

    const { getByLabelText, getByTestId, getByText } = await render(
      <AccountConfirmScreen />
    );
    const labelInput = getByLabelText('Account label');

    await fireEvent.changeText(labelInput, '   ');

    expect(getByText('Enter an account label.')).toBeTruthy();
    expect(getByLabelText('Account label').props['aria-invalid']).toBe(true);
    expect(getByTestId('account-label-field-label').props.className).toContain(
      'text-destructive'
    );
    await fireEvent.press(getByText('Save Account'));
    expect(mockAddAccount).not.toHaveBeenCalled();
  });

  it('cancels back to the scanner navigation stack', async () => {
    mockGetScannerDraft.mockReturnValue(scannedDraft);

    const { getByText } = await render(<AccountConfirmScreen />);

    await fireEvent.press(getByText('Cancel'));

    expect(router.back).toHaveBeenCalled();
  });
});
