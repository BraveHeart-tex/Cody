import { create, type StoreApi } from 'zustand';

import type {
  OtpAccount,
  StoredOtpAccount
} from '@/features/totp/model/totp-account';
import { DuplicateAccountSecretError } from '@/features/totp/model/account-errors';
import { normalizeAccountSecret } from '@/features/totp/model/account-secret';
import {
  applyAccountWriteJournal,
  archiveCorruptAccountIndex,
  clearAccountWriteJournal,
  CorruptAccountIndexError,
  deleteAccountData,
  getAccountWriteJournal,
  getAccountFromStores,
  getAllAccounts,
  getSecret,
  getStagedAccountSecret,
  recoverAccountWriteJournal,
  saveAccountWriteJournal,
  setAccountIndex,
  setStagedAccountSecret,
  type AccountWriteJournal,
  type AccountsStorageSnapshot,
  type DamagedAccount
} from '@/features/totp/storage/totp-storage';

export type AccountsLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export type AddAccountInput = OtpAccount;

export type UpdateAccountInput = Partial<Omit<OtpAccount, 'id'>>;

export interface AccountsStoreState {
  accounts: StoredOtpAccount[];
  accountIds: string[];
  damagedAccounts: DamagedAccount[];
  accountSecretLoading: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  loadStatus: AccountsLoadStatus;
  loadAccounts: () => Promise<void>;
  retryLoad: () => Promise<void>;
  retryAccount: (id: string) => Promise<void>;
  loadAccountSecret: (id: string) => Promise<void>;
  removeDamagedAccount: (id: string) => Promise<void>;
  startReaddingAccounts: () => Promise<void>;
  addAccount: (account: AddAccountInput) => Promise<void>;
  updateAccount: (id: string, changes: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
}

const initialState = {
  accounts: [] as StoredOtpAccount[],
  accountIds: [] as string[],
  damagedAccounts: [] as DamagedAccount[],
  accountSecretLoading: {} as Record<string, boolean>,
  isLoading: true,
  error: null as Error | null,
  loadStatus: 'idle' as AccountsLoadStatus
};

let loadPromise: Promise<void> | null = null;
let mutationQueue = Promise.resolve();
const accountSecretPromises = new Map<string, Promise<void>>();

type AccountsStoreSet = StoreApi<AccountsStoreState>['setState'];

export const useAccountsStore = create<AccountsStoreState>((set, get) => ({
  ...initialState,

  loadAccounts: async () => {
    if (get().loadStatus === 'loaded') {
      return;
    }

    if (loadPromise != null) {
      return loadPromise;
    }

    set({ isLoading: true, loadStatus: 'loading' });

    loadPromise = (async () => {
      let recoveryFailed = false;

      try {
        await recoverAccountWriteJournal();
      } catch {
        recoveryFailed = true;
      }

      const snapshot = await getAllAccounts();
      const journal = recoveryFailed ? await getAccountWriteJournal() : null;

      commitSnapshot(set, snapshot, journal);
    })().catch(cause => {
      const loadError = toError(cause);

      loadPromise = null;
      set({
        error: loadError,
        isLoading: false,
        loadStatus: 'failed'
      });

      throw loadError;
    });

    return loadPromise;
  },

  retryLoad: async () => {
    if (get().isLoading) {
      return get().loadAccounts();
    }

    loadPromise = null;
    set({ error: null, isLoading: false, loadStatus: 'idle' });
    await get().loadAccounts();
  },

  retryAccount: async id => {
    await runMutation(async () => {
      await recoverAccountWriteJournal();
      await refreshStoreSnapshot(set);

      if (!get().accountIds.includes(id)) {
        return;
      }

      const result = await getAccountFromStores(id);
      const current = get();
      const nextAccounts = current.accounts.filter(
        account => account.id !== id
      );
      const nextDamaged = current.damagedAccounts.filter(
        account => account.id !== id
      );

      if ('secret' in result) {
        nextAccounts.push(result);
      } else {
        nextDamaged.push(result);
      }

      set({
        accounts: sortAccounts(nextAccounts),
        damagedAccounts: orderDamagedAccounts(current.accountIds, nextDamaged),
        accountSecretLoading: omitKey(current.accountSecretLoading, id)
      });
    });
  },

  loadAccountSecret: async id => {
    const existing = get().accounts.find(account => account.id === id);

    if (existing == null || existing.secret != null) {
      return;
    }

    const existingPromise = accountSecretPromises.get(id);

    if (existingPromise != null) {
      return existingPromise;
    }

    set({
      accountSecretLoading: { ...get().accountSecretLoading, [id]: true }
    });

    const promise = (async () => {
      try {
        const secret = await getSecret(id);
        const current = get();
        const account = current.accounts.find(value => value.id === id);

        if (account == null) {
          return;
        }

        if (account.secret != null) {
          set({
            accountSecretLoading: omitKey(current.accountSecretLoading, id)
          });

          return;
        }

        if (secret == null) {
          moveAccountToDamaged(set, get, id, 'missing-secret');

          return;
        }

        set({
          accounts: sortAccounts(
            current.accounts.map(value =>
              value.id === id ? { ...value, secret } : value
            )
          ),
          accountSecretLoading: omitKey(current.accountSecretLoading, id)
        });
      } catch (cause) {
        moveAccountToDamaged(set, get, id, 'read-failed');

        throw toError(cause);
      } finally {
        accountSecretPromises.delete(id);
      }
    })();

    accountSecretPromises.set(id, promise);

    return promise;
  },

  removeDamagedAccount: async id => {
    await runMutation(async () => {
      try {
        let { accountIds, accounts, damagedAccounts } = get();

        if (!damagedAccounts.some(account => account.id === id)) {
          return;
        }

        await ensureNoPendingWrite(set);
        ({ accountIds, accounts, damagedAccounts } = get());

        if (!accountIds.includes(id)) {
          return;
        }

        const nextIds = accountIds.filter(accountId => accountId !== id);

        await deleteAccountData(id);
        await setAccountIndex(nextIds);

        set({
          accountIds: nextIds,
          accounts: accounts.filter(account => account.id !== id),
          damagedAccounts: damagedAccounts.filter(account => account.id !== id),
          accountSecretLoading: omitKey(get().accountSecretLoading, id),
          error: null,
          loadStatus: 'loaded'
        });
      } catch (cause) {
        await refreshStoreSnapshot(set).catch(() => undefined);

        throw toError(cause);
      }
    });
  },

  startReaddingAccounts: async () => {
    await runMutation(async () => {
      await ensureNoPendingWrite(set, false);
      const error = get().error;

      if (!(error instanceof CorruptAccountIndexError)) {
        throw new Error('The saved account index is not ready to reset.');
      }

      await archiveCorruptAccountIndex(error.rawValue);
      await setAccountIndex([]);
      loadPromise = null;
      set({
        accountIds: [],
        accounts: [],
        damagedAccounts: [],
        accountSecretLoading: {},
        error: null,
        isLoading: false,
        loadStatus: 'loaded'
      });
    });
  },

  addAccount: async account => {
    await runMutation(async () => {
      await persistMutation(get, set, async currentAccounts => {
        if (currentAccounts.some(({ id }) => id === account.id)) {
          return currentAccounts;
        }

        await loadSecretsForDuplicateCheck(get);
        currentAccounts = get().accounts;

        const secret = normalizeAccountSecret(account.secret);

        if (
          currentAccounts.some(
            current =>
              current.secret != null &&
              normalizeAccountSecret(current.secret) === secret
          )
        ) {
          throw new DuplicateAccountSecretError();
        }

        const nextSortOrder =
          currentAccounts.length === 0
            ? 0
            : Math.max(...currentAccounts.map(({ sortOrder }) => sortOrder)) +
              1;

        return [
          ...currentAccounts,
          { ...account, secret, sortOrder: nextSortOrder }
        ];
      });
    });
  },

  updateAccount: async (id, changes) => {
    await runMutation(async () => {
      await persistMutation(get, set, async currentAccounts => {
        const initialTarget = currentAccounts.find(
          account => account.id === id
        );

        if (initialTarget == null) {
          return currentAccounts;
        }

        const updatedSecret =
          changes.secret == null
            ? undefined
            : normalizeAccountSecret(changes.secret);

        if (updatedSecret != null && updatedSecret !== initialTarget.secret) {
          await loadSecretsForDuplicateCheck(get, id);
          currentAccounts = get().accounts;
        }

        const target = currentAccounts.find(account => account.id === id);

        if (target == null) {
          return currentAccounts;
        }

        if (
          updatedSecret != null &&
          currentAccounts.some(
            account =>
              account.id !== id &&
              account.secret != null &&
              normalizeAccountSecret(account.secret) === updatedSecret
          )
        ) {
          throw new DuplicateAccountSecretError();
        }

        return currentAccounts.map(account =>
          account.id === id
            ? {
                ...account,
                ...changes,
                ...(updatedSecret == null ? {} : { secret: updatedSecret }),
                id
              }
            : account
        );
      });
    });
  },

  deleteAccount: async id => {
    await runMutation(async () => {
      try {
        await ensureNoPendingWrite(set);
        await get().loadAccounts();
        const { accountIds, accounts, damagedAccounts } = get();
        const nextAccounts = accounts.filter(account => account.id !== id);
        const nextIds = mergeAccountIds(
          accountIds,
          accounts.map(account => account.id),
          nextAccounts.map(account => account.id)
        );

        await deleteAccountData(id);
        await setAccountIndex(nextIds);
        commitHealthyMutation(set, nextIds, nextAccounts, damagedAccounts);
      } catch (cause) {
        await refreshStoreSnapshot(set).catch(() => undefined);

        throw toError(cause);
      }
    });
  },

  reorderAccounts: async ids => {
    await runMutation(async () => {
      try {
        await ensureNoPendingWrite(set);
        await get().loadAccounts();
        const { accounts, accountIds, damagedAccounts } = get();
        const accountById = new Map(
          accounts.map(account => [account.id, account])
        );
        const reorderedAccounts = ids
          .map(id => accountById.get(id))
          .filter((account): account is StoredOtpAccount => account != null);
        const reorderedIds = new Set(reorderedAccounts.map(({ id }) => id));
        const remainingAccounts = accounts.filter(
          ({ id }) => !reorderedIds.has(id)
        );
        const orderedHealthyIds = [
          ...reorderedAccounts,
          ...remainingAccounts
        ].map(account => account.id);
        const nextIds = mergeAccountIds(
          accountIds,
          accounts.map(account => account.id),
          orderedHealthyIds
        );
        const sortOrderById = new Map(nextIds.map((id, index) => [id, index]));
        const nextAccounts = sortAccounts(
          accounts.map(account => ({
            ...account,
            sortOrder: sortOrderById.get(account.id) ?? account.sortOrder
          }))
        );

        const changedRecords = getChangedRecords(nextAccounts, accounts);

        if (changedRecords.length === 0 && arraysEqual(nextIds, accountIds)) {
          return;
        }

        const journal = createWriteJournal(
          nextIds,
          changedRecords,
          changedRecords.length > 0
            ? changedRecords.map(({ id }) => id)
            : nextIds,
          null,
          !arraysEqual(nextIds, accountIds)
        );

        await saveAccountWriteJournal(journal);
        await applyAccountWriteJournal(journal);
        commitHealthyMutation(set, nextIds, nextAccounts, damagedAccounts);
      } catch (cause) {
        await refreshStoreSnapshot(set).catch(() => undefined);

        throw toError(cause);
      }
    });
  }
}));

export function resetAccountsStoreForTest(): void {
  loadPromise = null;
  mutationQueue = Promise.resolve();
  accountSecretPromises.clear();
  useAccountsStore.setState(initialState);
}

async function runMutation(mutation: () => Promise<void>): Promise<void> {
  const queuedMutation = mutationQueue.then(mutation, mutation);

  mutationQueue = queuedMutation.catch(() => undefined);

  await queuedMutation;
}

async function persistMutation(
  get: () => AccountsStoreState,
  set: AccountsStoreSet,
  getNextAccounts: (
    accounts: StoredOtpAccount[]
  ) => StoredOtpAccount[] | Promise<StoredOtpAccount[]>
): Promise<void> {
  try {
    await get().loadAccounts();
    await ensureNoPendingWrite(set);

    const nextAccountsFromMutation = await getNextAccounts(get().accounts);
    const current = get();
    const orderedAccounts = sortAccounts(nextAccountsFromMutation);
    const nextIds = mergeAccountIds(
      current.accountIds,
      current.accounts.map(account => account.id),
      orderedAccounts.map(account => account.id)
    );
    const nextAccounts = orderedAccounts;
    const changedAccounts = getChangedAccounts(nextAccounts, current.accounts);

    if (
      changedAccounts.length === 0 &&
      arraysEqual(nextIds, current.accountIds)
    ) {
      return;
    }

    const previousById = new Map(
      current.accounts.map(account => [account.id, account])
    );
    const changedRecords = nextAccounts
      .filter(account => {
        const previous = previousById.get(account.id);

        return (
          previous == null ||
          JSON.stringify(toAccountRecord(previous)) !==
            JSON.stringify(toAccountRecord(account))
        );
      })
      .map(toAccountRecord);
    const changedSecrets = changedAccounts.filter(account => {
      const previousAccount = current.accounts.find(
        currentAccount => currentAccount.id === account.id
      );

      return (
        account.secret != null &&
        (previousAccount == null || previousAccount.secret !== account.secret)
      );
    }) as (StoredOtpAccount & { secret: string })[];

    if (changedSecrets.length > 1) {
      throw new Error('A single account write can only stage one secret.');
    }

    const secretAccount = changedSecrets[0];
    const journal = createWriteJournal(
      nextIds,
      changedRecords,
      [
        ...new Set([
          ...changedRecords.map(({ id }) => id),
          ...changedSecrets.map(({ id }) => id)
        ])
      ],
      secretAccount?.id ?? null,
      !arraysEqual(nextIds, current.accountIds)
    );

    await saveAccountWriteJournal(journal);

    if (secretAccount != null) {
      try {
        await setStagedAccountSecret(secretAccount.secret);
      } catch (cause) {
        try {
          const stagedSecret = await getStagedAccountSecret();

          if (stagedSecret == null) {
            await clearAccountWriteJournal();

            throw cause;
          }
        } catch (readCause) {
          if (readCause === cause) {
            throw cause;
          }

          throw readCause;
        }
      }
    }

    await applyAccountWriteJournal(journal);
    commitHealthyMutation(set, nextIds, nextAccounts, current.damagedAccounts);
  } catch (cause) {
    if (!(cause instanceof DuplicateAccountSecretError)) {
      await refreshStoreSnapshot(set).catch(() => undefined);
    }

    throw toError(cause);
  }
}

async function loadSecretsForDuplicateCheck(
  get: () => AccountsStoreState,
  excludedId?: string
): Promise<void> {
  for (const account of [...get().accounts]) {
    if (
      account.id !== excludedId &&
      account.secret == null &&
      get().accounts.some(current => current.id === account.id)
    ) {
      await get().loadAccountSecret(account.id);
    }
  }
}

function moveAccountToDamaged(
  set: AccountsStoreSet,
  get: () => AccountsStoreState,
  id: string,
  reason: DamagedAccount['reason']
): void {
  const current = get();
  const account = current.accounts.find(value => value.id === id);

  if (account == null) {
    set({ accountSecretLoading: omitKey(current.accountSecretLoading, id) });

    return;
  }

  const damagedAccount: DamagedAccount = {
    id,
    record: toAccountRecord(account),
    reason
  };

  set({
    accounts: current.accounts.filter(value => value.id !== id),
    damagedAccounts: orderDamagedAccounts(current.accountIds, [
      ...current.damagedAccounts.filter(value => value.id !== id),
      damagedAccount
    ]),
    accountSecretLoading: omitKey(current.accountSecretLoading, id)
  });
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };

  delete next[key];

  return next;
}

function commitSnapshot(
  set: AccountsStoreSet,
  snapshot: AccountsStorageSnapshot,
  journal: AccountWriteJournal | null = null
): void {
  const withPendingWrite = addPendingWrite(snapshot, journal);

  set({
    accountIds: withPendingWrite.accountIds,
    accounts: sortAccounts(withPendingWrite.accounts),
    damagedAccounts: orderDamagedAccounts(
      withPendingWrite.accountIds,
      withPendingWrite.damagedAccounts
    ),
    accountSecretLoading: {},
    error: null,
    isLoading: false,
    loadStatus: 'loaded'
  });
}

function commitHealthyMutation(
  set: AccountsStoreSet,
  accountIds: string[],
  accounts: StoredOtpAccount[],
  damagedAccounts: DamagedAccount[]
): void {
  set({
    accountIds,
    accounts: sortAccounts(accounts),
    damagedAccounts: orderDamagedAccounts(accountIds, damagedAccounts),
    accountSecretLoading: {},
    error: null,
    isLoading: false,
    loadStatus: 'loaded'
  });
}

function mergeAccountIds(
  currentIds: string[],
  currentHealthyIds: string[],
  nextHealthyIds: string[]
): string[] {
  const healthyIds = new Set(currentHealthyIds);
  let nextHealthyIndex = 0;
  const merged = currentIds.flatMap(id => {
    if (!healthyIds.has(id)) {
      return [id];
    }

    const nextId = nextHealthyIds[nextHealthyIndex];

    nextHealthyIndex += 1;

    return nextId == null ? [] : [nextId];
  });

  return [...merged, ...nextHealthyIds.slice(nextHealthyIndex)];
}

function orderDamagedAccounts(
  accountIds: string[],
  damagedAccounts: DamagedAccount[]
): DamagedAccount[] {
  const damagedById = new Map(
    damagedAccounts.map(account => [account.id, account])
  );

  return accountIds.flatMap(id => {
    const account = damagedById.get(id);

    return account == null ? [] : [account];
  });
}

function createWriteJournal(
  accountIds: string[],
  records: ReturnType<typeof toAccountRecord>[],
  affectedIds: string[],
  secretAccountId: string | null,
  writeAccountIndex = true
): AccountWriteJournal {
  return {
    kind: 'write',
    accountIds,
    affectedIds,
    records,
    secretAccountId,
    removeAccountId: null,
    writeAccountIndex
  };
}

function getChangedAccounts(
  nextAccounts: StoredOtpAccount[],
  previousAccounts: StoredOtpAccount[]
): StoredOtpAccount[] {
  const previousById = new Map(
    previousAccounts.map(account => [account.id, account])
  );

  return nextAccounts.filter(account => {
    const previous = previousById.get(account.id);

    return (
      previous == null ||
      JSON.stringify(toAccountRecord(previous)) !==
        JSON.stringify(toAccountRecord(account)) ||
      previous.secret !== account.secret
    );
  });
}

function getChangedRecords(
  nextAccounts: StoredOtpAccount[],
  previousAccounts: StoredOtpAccount[]
): ReturnType<typeof toAccountRecord>[] {
  return getChangedAccounts(nextAccounts, previousAccounts).map(
    toAccountRecord
  );
}

function toAccountRecord(account: StoredOtpAccount) {
  const { secret: _secret, ...record } = account;

  return record;
}

function arraysEqual(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

async function ensureNoPendingWrite(
  set: AccountsStoreSet,
  refreshAfterRecovery = true
): Promise<void> {
  const journal = await getAccountWriteJournal();

  if (journal == null) {
    return;
  }

  try {
    await recoverAccountWriteJournal();
  } catch (cause) {
    await refreshStoreSnapshot(set).catch(() => undefined);

    throw toError(cause);
  }

  if (refreshAfterRecovery) {
    await refreshStoreSnapshot(set);
  }
}

async function refreshStoreSnapshot(set: AccountsStoreSet): Promise<void> {
  const [snapshot, journal] = await Promise.all([
    getAllAccounts(),
    getAccountWriteJournal()
  ]);

  commitSnapshot(set, snapshot, journal);
}

function addPendingWrite(
  snapshot: AccountsStorageSnapshot,
  journal: AccountWriteJournal | null
): AccountsStorageSnapshot {
  if (journal == null) {
    return snapshot;
  }

  const pendingIds = journal.affectedIds;
  const accountIds = [...snapshot.accountIds];

  for (const id of pendingIds) {
    if (!accountIds.includes(id)) {
      accountIds.push(id);
    }
  }

  const recordsById = new Map(
    journal.records.map(record => [record.id, record])
  );
  const currentById = new Map(
    snapshot.damagedAccounts.map(account => [account.id, account.record])
  );
  const healthyById = new Map(
    snapshot.accounts.map(account => [account.id, toAccountRecord(account)])
  );
  const pendingDamaged = pendingIds.map(id => ({
    id,
    record:
      recordsById.get(id) ?? currentById.get(id) ?? healthyById.get(id) ?? null,
    reason: 'write-recovery-failed' as const
  }));
  const pendingIdSet = new Set(pendingIds);

  return {
    accountIds,
    accounts: snapshot.accounts.filter(
      account => !pendingIdSet.has(account.id)
    ),
    damagedAccounts: [
      ...snapshot.damagedAccounts.filter(
        account => !pendingIdSet.has(account.id)
      ),
      ...pendingDamaged
    ]
  };
}

function sortAccounts(accounts: StoredOtpAccount[]): StoredOtpAccount[] {
  return [...accounts].sort(
    (first, second) => first.sortOrder - second.sortOrder
  );
}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error('TOTP account storage failed');
}
