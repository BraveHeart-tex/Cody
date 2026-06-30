/* eslint-disable import/first */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import type { UpdateAccountInput } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';

jest.mock('@/features/totp/storage/totp-storage', () => ({
  deleteAccountRecord: jest.fn(),
  deleteSecret: jest.fn(),
  getAllAccounts: jest.fn(),
  setAccountIndex: jest.fn(),
  setAccountRecord: jest.fn(),
  setSecret: jest.fn()
}));

import {
  deleteAccountRecord,
  deleteSecret,
  getAllAccounts,
  setAccountIndex,
  setAccountRecord,
  setSecret
} from '@/features/totp/storage/totp-storage';
import {
  resetAccountsStoreForTest,
  useAccountsStore
} from '@/features/totp/store/accounts-store';

const mockDeleteAccountRecord = jest.mocked(deleteAccountRecord);
const mockDeleteSecret = jest.mocked(deleteSecret);
const mockGetAllAccounts = jest.mocked(getAllAccounts);
const mockSetAccountIndex = jest.mocked(setAccountIndex);
const mockSetAccountRecord = jest.mocked(setAccountRecord);
const mockSetSecret = jest.mocked(setSecret);

const account = createAccount({
  id: 'account-id',
  issuer: 'GitHub',
  label: 'user@example.com',
  sortOrder: 0
});

const secondAccount = createAccount({
  id: 'second-account-id',
  issuer: 'Dropbox',
  label: 'work@example.com',
  sortOrder: 1
});

const thirdAccount = createAccount({
  id: 'third-account-id',
  issuer: 'Notion',
  label: 'team@example.com',
  sortOrder: 2
});

describe('accounts store', () => {
  beforeEach(() => {
    resetAccountsStoreForTest();
    mockGetAllAccounts.mockResolvedValue([]);
    mockSetAccountRecord.mockResolvedValue(undefined);
    mockSetSecret.mockResolvedValue(undefined);
    mockSetAccountIndex.mockResolvedValue(undefined);
    mockDeleteAccountRecord.mockResolvedValue(undefined);
    mockDeleteSecret.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetAccountsStoreForTest();
    jest.resetAllMocks();
  });

  it('coalesces concurrent account loads', async () => {
    mockGetAllAccounts.mockResolvedValueOnce([account]);

    await Promise.all([
      useAccountsStore.getState().loadAccounts(),
      useAccountsStore.getState().loadAccounts()
    ]);

    expect(mockGetAllAccounts).toHaveBeenCalledTimes(1);
    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [account],
      error: null,
      isLoading: false,
      loadStatus: 'loaded'
    });
  });

  it('sets error state after a failed load and allows a later retry', async () => {
    const storageError = new Error('load failed');

    mockGetAllAccounts.mockRejectedValueOnce(storageError);

    await expect(useAccountsStore.getState().loadAccounts()).rejects.toBe(
      storageError
    );
    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [],
      error: storageError,
      isLoading: false,
      loadStatus: 'failed'
    });

    mockGetAllAccounts.mockResolvedValueOnce([account]);
    await useAccountsStore.getState().loadAccounts();

    expect(mockGetAllAccounts).toHaveBeenCalledTimes(2);
    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [account],
      error: null,
      isLoading: false,
      loadStatus: 'loaded'
    });
  });

  it('assigns the next sort order when adding an account', async () => {
    const loadedAccount = { ...account, sortOrder: 5 };
    const addedAccount = createAccount({
      id: 'new-account-id',
      issuer: 'Linear',
      label: 'new@example.com',
      sortOrder: 99
    });

    mockGetAllAccounts.mockResolvedValueOnce([loadedAccount]);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().addAccount(addedAccount);

    expect(useAccountsStore.getState().accounts).toEqual([
      loadedAccount,
      { ...addedAccount, sortOrder: 6 }
    ]);
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-account-id',
        sortOrder: 6
      })
    );
    expect(mockSetSecret).toHaveBeenCalledWith(
      'new-account-id',
      addedAccount.secret
    );
    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([
      'account-id',
      'new-account-id'
    ]);
  });

  it('preserves the target id when updating an account', async () => {
    mockGetAllAccounts.mockResolvedValueOnce([account]);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().updateAccount('account-id', {
      id: 'wrong-id',
      label: 'updated@example.com'
    } as UpdateAccountInput);

    expect(useAccountsStore.getState().accounts).toEqual([
      { ...account, label: 'updated@example.com' }
    ]);
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'account-id',
        label: 'updated@example.com'
      })
    );
    expect(mockSetAccountRecord).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wrong-id' })
    );
  });

  it('deletes account storage after writing the new index', async () => {
    mockGetAllAccounts.mockResolvedValueOnce([account, secondAccount]);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().deleteAccount('account-id');

    expect(mockSetAccountIndex).toHaveBeenCalledWith(['second-account-id']);
    expect(mockDeleteAccountRecord).toHaveBeenCalledWith('account-id');
    expect(mockDeleteSecret).toHaveBeenCalledWith('account-id');
    expect(useAccountsStore.getState().accounts).toEqual([secondAccount]);
  });

  it('reorders known ids, appends missing current accounts, and rewrites sort order', async () => {
    mockGetAllAccounts.mockResolvedValueOnce([
      account,
      secondAccount,
      thirdAccount
    ]);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore
      .getState()
      .reorderAccounts(['third-account-id', 'missing-account-id']);

    expect(useAccountsStore.getState().accounts).toEqual([
      { ...thirdAccount, sortOrder: 0 },
      { ...account, sortOrder: 1 },
      { ...secondAccount, sortOrder: 2 }
    ]);
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'third-account-id', sortOrder: 0 })
    );
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'account-id', sortOrder: 1 })
    );
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'second-account-id', sortOrder: 2 })
    );
    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([
      'third-account-id',
      'account-id',
      'second-account-id'
    ]);
  });

  it('queues concurrent mutations against the latest committed accounts', async () => {
    const firstAddedAccount = createAccount({
      id: 'first-added-id',
      issuer: 'Linear',
      label: 'first@example.com',
      sortOrder: 0
    });
    const secondAddedAccount = createAccount({
      id: 'second-added-id',
      issuer: 'Slack',
      label: 'second@example.com',
      sortOrder: 0
    });

    mockGetAllAccounts.mockResolvedValueOnce([]);

    await Promise.all([
      useAccountsStore.getState().addAccount(firstAddedAccount),
      useAccountsStore.getState().addAccount(secondAddedAccount)
    ]);

    expect(useAccountsStore.getState().accounts).toEqual([
      { ...firstAddedAccount, sortOrder: 0 },
      { ...secondAddedAccount, sortOrder: 1 }
    ]);
    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([
      'first-added-id',
      'second-added-id'
    ]);
  });

  it('keeps current state when a mutation fails before commit', async () => {
    const storageError = new Error('index failed');

    mockGetAllAccounts.mockResolvedValueOnce([account, secondAccount]);
    mockSetAccountIndex.mockRejectedValueOnce(storageError);

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().deleteAccount('account-id')
    ).rejects.toBe(storageError);

    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [account, secondAccount],
      error: storageError
    });
    expect(mockDeleteAccountRecord).not.toHaveBeenCalled();
    expect(mockDeleteSecret).not.toHaveBeenCalled();
  });
});

function createAccount({
  id,
  issuer,
  label,
  sortOrder
}: {
  id: string;
  issuer: string;
  label: string;
  sortOrder: number;
}): OtpAccount {
  return {
    id,
    issuer,
    label,
    secret: 'JBSWY3DPEHPK3PXP',
    type: 'totp',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    color: '#0891B2',
    sortOrder,
    createdAt: 123
  };
}
