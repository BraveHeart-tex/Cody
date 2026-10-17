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
import { DuplicateAccountSecretError } from '@/features/totp/model/account-errors';
import type {
  OtpAccount,
  StoredOtpAccount
} from '@/features/totp/model/totp-account';

jest.mock('@/features/totp/storage/totp-storage', () => ({
  CorruptAccountIndexError: class CorruptAccountIndexError extends Error {
    rawValue: string;

    constructor(mockRawValue: string) {
      super('The saved account index is not valid JSON.');
      this.name = 'CorruptAccountIndexError';
      this.rawValue = mockRawValue;
    }
  },
  applyAccountWriteJournal: jest.fn(),
  archiveCorruptAccountIndex: jest.fn(),
  clearAccountWriteJournal: jest.fn(),
  deleteAccountData: jest.fn(),
  deleteAccountRecord: jest.fn(),
  deleteSecret: jest.fn(),
  getAccountWriteJournal: jest.fn(),
  getAccountFromStores: jest.fn(),
  getAllAccounts: jest.fn(),
  getSecret: jest.fn(),
  getStagedAccountSecret: jest.fn(),
  recoverAccountWriteJournal: jest.fn(),
  saveAccountWriteJournal: jest.fn(),
  setAccountIndex: jest.fn(),
  setAccountRecord: jest.fn(),
  setSecret: jest.fn(),
  setStagedAccountSecret: jest.fn()
}));

import {
  applyAccountWriteJournal,
  CorruptAccountIndexError,
  archiveCorruptAccountIndex,
  clearAccountWriteJournal,
  deleteAccountData,
  deleteAccountRecord,
  deleteSecret,
  getAccountFromStores,
  getAccountWriteJournal,
  getAllAccounts,
  getSecret,
  getStagedAccountSecret,
  recoverAccountWriteJournal,
  saveAccountWriteJournal,
  setAccountIndex,
  setAccountRecord,
  setSecret,
  setStagedAccountSecret
} from '@/features/totp/storage/totp-storage';
import {
  resetAccountsStoreForTest,
  useAccountsStore
} from '@/features/totp/store/accounts-store';

const mockDeleteAccountRecord = jest.mocked(deleteAccountRecord);
const mockDeleteSecret = jest.mocked(deleteSecret);
const mockDeleteAccountData = jest.mocked(deleteAccountData);
const mockArchiveCorruptAccountIndex = jest.mocked(archiveCorruptAccountIndex);
const mockGetAccountFromStores = jest.mocked(getAccountFromStores);
const mockGetAllAccounts = jest.mocked(getAllAccounts);
const mockGetSecret = jest.mocked(getSecret);
const mockSetAccountIndex = jest.mocked(setAccountIndex);
const mockSetAccountRecord = jest.mocked(setAccountRecord);
const mockSetSecret = jest.mocked(setSecret);
const mockRecoverAccountWriteJournal = jest.mocked(recoverAccountWriteJournal);
const mockGetAccountWriteJournal = jest.mocked(getAccountWriteJournal);
const mockSaveAccountWriteJournal = jest.mocked(saveAccountWriteJournal);
const mockApplyAccountWriteJournal = jest.mocked(applyAccountWriteJournal);
const mockClearAccountWriteJournal = jest.mocked(clearAccountWriteJournal);
const mockGetStagedAccountSecret = jest.mocked(getStagedAccountSecret);
const mockSetStagedAccountSecret = jest.mocked(setStagedAccountSecret);

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
const damagedAccount = {
  id: 'damaged-account-id',
  record: null,
  reason: 'missing-secret' as const
};

describe('accounts store', () => {
  beforeEach(() => {
    let stagedSecret: string | null = null;

    resetAccountsStoreForTest();
    mockGetAllAccounts.mockResolvedValue(createSnapshot([]));
    mockRecoverAccountWriteJournal.mockResolvedValue(undefined);
    mockGetAccountWriteJournal.mockResolvedValue(null);
    mockGetSecret.mockResolvedValue(null);
    mockSaveAccountWriteJournal.mockResolvedValue(undefined);
    mockApplyAccountWriteJournal.mockImplementation(async journal => {
      if (journal.kind === 'remove') {
        await mockDeleteAccountData(journal.removeAccountId as string);
      } else {
        for (const record of journal.records) {
          await mockSetAccountRecord(record);
        }

        if (journal.secretAccountId != null) {
          const stagedSecret = await mockGetStagedAccountSecret();

          if (stagedSecret != null) {
            await mockSetSecret(journal.secretAccountId, stagedSecret);
          }
        }
      }

      if (journal.writeAccountIndex !== false) {
        await mockSetAccountIndex(journal.accountIds);
      }

      await mockClearAccountWriteJournal();
    });
    mockClearAccountWriteJournal.mockImplementation(async () => {
      stagedSecret = null;
    });
    mockGetStagedAccountSecret.mockImplementation(async () => stagedSecret);
    mockSetStagedAccountSecret.mockImplementation(async secret => {
      stagedSecret = secret;
    });
    mockGetAccountFromStores.mockResolvedValue(damagedAccount);
    mockSetAccountRecord.mockResolvedValue(undefined);
    mockSetSecret.mockResolvedValue(undefined);
    mockSetAccountIndex.mockResolvedValue(undefined);
    mockDeleteAccountRecord.mockResolvedValue(undefined);
    mockDeleteSecret.mockResolvedValue(undefined);
    mockDeleteAccountData.mockImplementation(async id => {
      await Promise.all([mockDeleteAccountRecord(id), mockDeleteSecret(id)]);
    });
    mockArchiveCorruptAccountIndex.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetAccountsStoreForTest();
    jest.resetAllMocks();
  });

  it('coalesces concurrent account loads', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));

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

  it('loads an account secret only when requested', async () => {
    const { secret: _secret, ...metadata } = account;

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([metadata]));
    mockGetSecret.mockResolvedValueOnce(account.secret);

    await useAccountsStore.getState().loadAccounts();

    expect(useAccountsStore.getState().accounts).toEqual([metadata]);
    expect(mockGetSecret).not.toHaveBeenCalled();

    await useAccountsStore.getState().loadAccountSecret(account.id);

    expect(mockGetSecret).toHaveBeenCalledWith(account.id);
    expect(useAccountsStore.getState().accounts).toEqual([account]);
  });

  it('marks a missing deferred secret as a damaged account', async () => {
    const { secret: _secret, ...metadata } = account;

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([metadata]));
    mockGetSecret.mockResolvedValueOnce(null);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().loadAccountSecret(account.id);

    expect(useAccountsStore.getState().accounts).toEqual([]);
    expect(useAccountsStore.getState().damagedAccounts).toEqual([
      { id: account.id, record: metadata, reason: 'missing-secret' }
    ]);
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

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));
    await useAccountsStore.getState().loadAccounts();

    expect(mockGetAllAccounts).toHaveBeenCalledTimes(2);
    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [account],
      error: null,
      isLoading: false,
      loadStatus: 'loaded'
    });
  });

  it('retries only the selected damaged account', async () => {
    mockGetAllAccounts.mockResolvedValue(
      createSnapshot([account], [damagedAccount])
    );
    mockGetAccountFromStores.mockResolvedValueOnce(secondAccount);

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().retryAccount('damaged-account-id');

    expect(mockGetAccountFromStores).toHaveBeenCalledWith('damaged-account-id');
    expect(useAccountsStore.getState()).toMatchObject({
      accountIds: ['account-id', 'damaged-account-id'],
      accounts: [account, secondAccount],
      damagedAccounts: []
    });
  });

  it('removes a damaged account without dropping healthy ids', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot([account], [damagedAccount])
    );

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore
      .getState()
      .removeDamagedAccount('damaged-account-id');

    expect(mockDeleteAccountRecord).toHaveBeenCalledWith('damaged-account-id');
    expect(mockDeleteSecret).toHaveBeenCalledWith('damaged-account-id');
    expect(mockSetAccountIndex).toHaveBeenLastCalledWith(['account-id']);
    expect(useAccountsStore.getState()).toMatchObject({
      accountIds: ['account-id'],
      accounts: [account],
      damagedAccounts: []
    });
  });

  it('reloads from storage when retrying after a mutation error', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));
    await useAccountsStore.getState().loadAccounts();

    useAccountsStore.setState({ error: new Error('write failed') });
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([secondAccount]));
    await useAccountsStore.getState().retryLoad();

    expect(mockGetAllAccounts).toHaveBeenCalledTimes(2);
    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [secondAccount],
      error: null,
      loadStatus: 'loaded'
    });
  });

  it('preserves damaged ids while adding healthy accounts', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot([account], [damagedAccount])
    );
    const addedAccount = createAccount({
      id: 'new-account-id',
      issuer: 'Linear',
      label: 'new@example.com',
      secret: 'MFRGGZDFMZTWQ2LK',
      sortOrder: 0
    });

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().addAccount(addedAccount);

    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([
      'account-id',
      'damaged-account-id',
      'new-account-id'
    ]);
    expect(useAccountsStore.getState().damagedAccounts).toEqual([
      damagedAccount
    ]);
  });

  it('keeps damaged ids in place while reordering healthy accounts', async () => {
    const middleDamaged = { ...damagedAccount, id: 'middle-damaged-id' };

    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot(
        [account, secondAccount],
        [middleDamaged],
        ['account-id', 'middle-damaged-id', 'second-account-id']
      )
    );

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore
      .getState()
      .reorderAccounts(['second-account-id', 'account-id']);

    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([
      'second-account-id',
      'middle-damaged-id',
      'account-id'
    ]);
    expect(useAccountsStore.getState().damagedAccounts).toEqual([
      middleDamaged
    ]);
  });

  it('archives a corrupt index before starting a new account list', async () => {
    const corruptIndexError = new CorruptAccountIndexError('{');

    mockGetAllAccounts.mockRejectedValueOnce(corruptIndexError);

    await expect(useAccountsStore.getState().loadAccounts()).rejects.toBe(
      corruptIndexError
    );
    await useAccountsStore.getState().startReaddingAccounts();

    expect(mockArchiveCorruptAccountIndex).toHaveBeenCalledWith('{');
    expect(mockSetAccountIndex).toHaveBeenLastCalledWith([]);
    expect(useAccountsStore.getState()).toMatchObject({
      accountIds: [],
      accounts: [],
      damagedAccounts: [],
      error: null,
      loadStatus: 'loaded'
    });
  });

  it('assigns the next sort order when adding an account', async () => {
    const loadedAccount = { ...account, sortOrder: 5 };
    const addedAccount = createAccount({
      id: 'new-account-id',
      issuer: 'Linear',
      label: 'new@example.com',
      secret: 'MFRGGZDFMZTWQ2LK',
      sortOrder: 99
    });

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([loadedAccount]));

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
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));

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

  it('rejects duplicate normalized secrets when adding an account', async () => {
    const existingAccount = {
      ...account,
      secret: 'MY'
    };
    const duplicateAccount = createAccount({
      id: 'duplicate-id',
      issuer: 'Different issuer',
      label: 'different@example.com',
      secret: ' MY====== ',
      sortOrder: 0
    });

    mockGetAllAccounts.mockResolvedValue(createSnapshot([existingAccount]));

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().addAccount(duplicateAccount)
    ).rejects.toBeInstanceOf(DuplicateAccountSecretError);

    expect(useAccountsStore.getState().accounts).toEqual([existingAccount]);
    expect(mockSetAccountRecord).not.toHaveBeenCalled();
  });

  it('checks unloaded account secrets before accepting an add', async () => {
    const { secret: _secret, ...metadata } = account;
    const duplicate = createAccount({
      id: 'duplicate-id',
      issuer: 'Different issuer',
      label: 'different@example.com',
      secret: account.secret,
      sortOrder: 0
    });

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([metadata]));
    mockGetSecret.mockResolvedValueOnce(account.secret);

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().addAccount(duplicate)
    ).rejects.toBeInstanceOf(DuplicateAccountSecretError);

    expect(mockGetSecret).toHaveBeenCalledWith(account.id);
    expect(mockSaveAccountWriteJournal).not.toHaveBeenCalled();
  });

  it('keeps deferred secret damage visible when a duplicate add is rejected', async () => {
    const { secret: _secret, ...metadata } = account;
    const duplicate = createAccount({
      id: 'duplicate-id',
      issuer: 'Different issuer',
      label: 'different@example.com',
      secret: secondAccount.secret,
      sortOrder: 0
    });

    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot([metadata, secondAccount])
    );
    mockGetSecret.mockResolvedValueOnce(null);

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().addAccount(duplicate)
    ).rejects.toBeInstanceOf(DuplicateAccountSecretError);

    expect(useAccountsStore.getState().damagedAccounts).toContainEqual({
      id: account.id,
      record: metadata,
      reason: 'missing-secret'
    });
  });

  it('skips unchanged index and secret writes for metadata updates', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));

    await useAccountsStore.getState().loadAccounts();
    mockSetAccountRecord.mockClear();
    mockSetAccountIndex.mockClear();
    mockSetSecret.mockClear();

    await useAccountsStore.getState().updateAccount(account.id, {
      label: 'renamed@example.com'
    });

    expect(mockSetAccountRecord).toHaveBeenCalledTimes(1);
    expect(mockSetAccountIndex).not.toHaveBeenCalled();
    expect(mockSetSecret).not.toHaveBeenCalled();
    expect(mockApplyAccountWriteJournal).toHaveBeenCalledWith(
      expect.objectContaining({
        writeAccountIndex: false,
        records: [expect.objectContaining({ label: 'renamed@example.com' })]
      })
    );
  });

  it('does not rewrite an unchanged record or index when a secret changes', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([account]));

    await useAccountsStore.getState().loadAccounts();
    mockSetAccountRecord.mockClear();
    mockSetAccountIndex.mockClear();
    mockSetSecret.mockClear();

    await useAccountsStore.getState().updateAccount(account.id, {
      secret: 'MFRGGZDFMZTWQ2LK'
    });

    expect(mockSetAccountRecord).not.toHaveBeenCalled();
    expect(mockSetAccountIndex).not.toHaveBeenCalled();
    expect(mockSetSecret).toHaveBeenCalledWith(account.id, 'MFRGGZDFMZTWQ2LK');
  });

  it('rejects the later of two concurrent adds with the same secret', async () => {
    const first = createAccount({
      id: 'first-duplicate-id',
      issuer: 'GitHub',
      label: 'first@example.com',
      secret: 'GEZDGNBVGY3TQOJQ',
      sortOrder: 0
    });
    const second = createAccount({
      id: 'second-duplicate-id',
      issuer: 'Dropbox',
      label: 'second@example.com',
      secret: ' gezd gnbv gy3t qojq ',
      sortOrder: 0
    });

    const results = await Promise.allSettled([
      useAccountsStore.getState().addAccount(first),
      useAccountsStore.getState().addAccount(second)
    ]);

    expect(results.map(result => result.status)).toEqual([
      'fulfilled',
      'rejected'
    ]);
    expect(results[1]).toMatchObject({
      reason: expect.any(DuplicateAccountSecretError)
    });
    expect(mockSetAccountRecord).toHaveBeenCalledTimes(1);
    expect(mockSetAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: first.id })
    );
    expect(mockSetAccountIndex).toHaveBeenCalledTimes(1);
  });

  it('normalizes a new account secret before storing it', async () => {
    const incomingAccount = createAccount({
      id: 'normalized-id',
      issuer: 'Linear',
      label: 'new@example.com',
      secret: ' mfrg gzdf mztw q2lk ',
      sortOrder: 0
    });

    await useAccountsStore.getState().addAccount(incomingAccount);

    expect(useAccountsStore.getState().accounts[0]?.secret).toBe(
      'MFRGGZDFMZTWQ2LK'
    );
    expect(mockSetSecret).toHaveBeenCalledWith(
      'normalized-id',
      'MFRGGZDFMZTWQ2LK'
    );
  });

  it('rejects an update that changes a secret to another account secret', async () => {
    const firstAccount = { ...account, secret: 'GEZDGNBVGY3TQOJQ' };
    const otherAccount = {
      ...secondAccount,
      secret: 'MFRGGZDFMZTWQ2LK'
    };

    mockGetAllAccounts.mockResolvedValue(
      createSnapshot([firstAccount, otherAccount])
    );

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().updateAccount(firstAccount.id, {
        secret: ' mfrg gzdf mztw q2lk '
      })
    ).rejects.toBeInstanceOf(DuplicateAccountSecretError);

    expect(useAccountsStore.getState().accounts).toEqual([
      firstAccount,
      otherAccount
    ]);
  });

  it('allows an update to retain its own secret and normalizes changed secrets', async () => {
    const initial = { ...account, secret: ' gezd gnbv gy3t qojq ' };

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([initial]));

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().updateAccount(account.id, {
      secret: ' gezd gnbv gy3t qojq '
    });

    expect(useAccountsStore.getState().accounts[0]?.secret).toBe(
      'GEZDGNBVGY3TQOJQ'
    );
  });

  it('deletes account storage after writing the new index', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot([account, secondAccount])
    );

    await useAccountsStore.getState().loadAccounts();
    await useAccountsStore.getState().deleteAccount('account-id');

    expect(mockSetAccountIndex).toHaveBeenCalledWith(['second-account-id']);
    expect(mockDeleteAccountRecord).toHaveBeenCalledWith('account-id');
    expect(mockDeleteSecret).toHaveBeenCalledWith('account-id');
    expect(useAccountsStore.getState().accounts).toEqual([secondAccount]);
  });

  it('reorders known ids, appends missing current accounts, and rewrites sort order', async () => {
    mockGetAllAccounts.mockResolvedValueOnce(
      createSnapshot([account, secondAccount, thirdAccount])
    );

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
      secret: 'GEZDGNBVGY3TQOJQ',
      sortOrder: 0
    });
    const secondAddedAccount = createAccount({
      id: 'second-added-id',
      issuer: 'Slack',
      label: 'second@example.com',
      secret: 'MFRGGZDFMZTWQ2LK',
      sortOrder: 0
    });

    mockGetAllAccounts.mockResolvedValueOnce(createSnapshot([]));

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

    mockGetAllAccounts.mockResolvedValue(
      createSnapshot([account, secondAccount])
    );
    mockSetAccountIndex.mockRejectedValueOnce(storageError);

    await useAccountsStore.getState().loadAccounts();
    await expect(
      useAccountsStore.getState().deleteAccount('account-id')
    ).rejects.toBe(storageError);

    expect(useAccountsStore.getState()).toMatchObject({
      accounts: [account, secondAccount],
      error: null
    });
    expect(mockDeleteAccountRecord).toHaveBeenCalledWith('account-id');
    expect(mockDeleteSecret).toHaveBeenCalledWith('account-id');
  });
});

function createAccount({
  id,
  issuer,
  label,
  secret = 'JBSWY3DPEHPK3PXP',
  sortOrder
}: {
  id: string;
  issuer: string;
  label: string;
  secret?: string;
  sortOrder: number;
}): OtpAccount {
  return {
    id,
    issuer,
    label,
    secret,
    type: 'totp',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    color: '#0891B2',
    sortOrder,
    createdAt: 123
  };
}

function createSnapshot(
  accounts: StoredOtpAccount[],
  damagedAccounts: (typeof damagedAccount)[] = [],
  accountIds = [
    ...accounts.map(account => account.id),
    ...damagedAccounts.map(account => account.id)
  ]
) {
  return { accountIds, accounts, damagedAccounts };
}
