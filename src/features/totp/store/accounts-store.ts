import { create, type StoreApi } from 'zustand';

import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  archiveCorruptAccountIndex,
  CorruptAccountIndexError,
  deleteAccountRecord,
  deleteSecret,
  getAccountFromStores,
  getAllAccounts,
  setAccountIndex,
  setAccountRecord,
  setSecret,
  type AccountsStorageSnapshot,
  type DamagedAccount
} from '@/features/totp/storage/totp-storage';

export type AccountsLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export type AddAccountInput = OtpAccount;

export type UpdateAccountInput = Partial<Omit<OtpAccount, 'id'>>;

export interface AccountsStoreState {
  accounts: OtpAccount[];
  accountIds: string[];
  damagedAccounts: DamagedAccount[];
  isLoading: boolean;
  error: Error | null;
  loadStatus: AccountsLoadStatus;
  loadAccounts: () => Promise<void>;
  retryLoad: () => Promise<void>;
  retryAccount: (id: string) => Promise<void>;
  removeDamagedAccount: (id: string) => Promise<void>;
  startReaddingAccounts: () => Promise<void>;
  addAccount: (account: AddAccountInput) => Promise<void>;
  updateAccount: (id: string, changes: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
}

const initialState = {
  accounts: [] as OtpAccount[],
  accountIds: [] as string[],
  damagedAccounts: [] as DamagedAccount[],
  isLoading: true,
  error: null as Error | null,
  loadStatus: 'idle' as AccountsLoadStatus
};

let loadPromise: Promise<void> | null = null;
let mutationQueue = Promise.resolve();

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

    loadPromise = getAllAccounts()
      .then(snapshot => {
        commitSnapshot(set, snapshot);
      })
      .catch(cause => {
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
        damagedAccounts: orderDamagedAccounts(current.accountIds, nextDamaged)
      });
    });
  },

  removeDamagedAccount: async id => {
    await runMutation(async () => {
      try {
        const { accountIds, damagedAccounts } = get();

        if (!damagedAccounts.some(account => account.id === id)) {
          return;
        }

        const nextIds = accountIds.filter(accountId => accountId !== id);

        // Remove the pair before updating the index so an interrupted cleanup
        // stays visible as a damaged entry instead of silently disappearing.
        await Promise.all([deleteAccountRecord(id), deleteSecret(id)]);
        await setAccountIndex(nextIds);

        set({
          accountIds: nextIds,
          damagedAccounts: damagedAccounts.filter(account => account.id !== id),
          error: null,
          loadStatus: 'loaded'
        });
      } catch (cause) {
        const mutationError = toError(cause);

        set({ error: mutationError });

        throw mutationError;
      }
    });
  },

  startReaddingAccounts: async () => {
    await runMutation(async () => {
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
        error: null,
        isLoading: false,
        loadStatus: 'loaded'
      });
    });
  },

  addAccount: async account => {
    await runMutation(async () => {
      await persistMutation(get, set, currentAccounts => {
        const nextSortOrder =
          currentAccounts.length === 0
            ? 0
            : Math.max(...currentAccounts.map(({ sortOrder }) => sortOrder)) +
              1;

        return [...currentAccounts, { ...account, sortOrder: nextSortOrder }];
      });
    });
  },

  updateAccount: async (id, changes) => {
    await runMutation(async () => {
      await persistMutation(get, set, currentAccounts =>
        currentAccounts.map(account =>
          account.id === id ? { ...account, ...changes, id } : account
        )
      );
    });
  },

  deleteAccount: async id => {
    await runMutation(async () => {
      try {
        await get().loadAccounts();
        const { accountIds, accounts, damagedAccounts } = get();
        const nextAccounts = accounts.filter(account => account.id !== id);
        const nextIds = mergeAccountIds(
          accountIds,
          accounts.map(account => account.id),
          nextAccounts.map(account => account.id)
        );

        await setAccountIndex(nextIds);
        await Promise.all([deleteAccountRecord(id), deleteSecret(id)]);
        commitHealthyMutation(set, nextIds, nextAccounts, damagedAccounts);
      } catch (cause) {
        const mutationError = toError(cause);

        set({ error: mutationError });

        throw mutationError;
      }
    });
  },

  reorderAccounts: async ids => {
    await runMutation(async () => {
      try {
        await get().loadAccounts();
        const { accounts, accountIds, damagedAccounts } = get();
        const accountById = new Map(
          accounts.map(account => [account.id, account])
        );
        const reorderedAccounts = ids
          .map(id => accountById.get(id))
          .filter((account): account is OtpAccount => account != null);
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

        await persistAccountOrder(nextAccounts, accounts);
        await setAccountIndex(nextIds);
        commitHealthyMutation(set, nextIds, nextAccounts, damagedAccounts);
      } catch (cause) {
        const mutationError = toError(cause);

        set({ error: mutationError });

        throw mutationError;
      }
    });
  }
}));

export function resetAccountsStoreForTest(): void {
  loadPromise = null;
  mutationQueue = Promise.resolve();
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
  getNextAccounts: (accounts: OtpAccount[]) => OtpAccount[]
): Promise<void> {
  try {
    await get().loadAccounts();

    const current = get();
    const orderedAccounts = sortAccounts(getNextAccounts(current.accounts));
    const nextIds = mergeAccountIds(
      current.accountIds,
      current.accounts.map(account => account.id),
      orderedAccounts.map(account => account.id)
    );
    const nextAccounts = orderedAccounts;

    await persistAccounts(nextAccounts);
    await setAccountIndex(nextIds);
    commitHealthyMutation(set, nextIds, nextAccounts, current.damagedAccounts);
  } catch (cause) {
    const mutationError = toError(cause);

    set({ error: mutationError });

    throw mutationError;
  }
}

function commitSnapshot(
  set: AccountsStoreSet,
  snapshot: AccountsStorageSnapshot
): void {
  set({
    accountIds: snapshot.accountIds,
    accounts: sortAccounts(snapshot.accounts),
    damagedAccounts: orderDamagedAccounts(
      snapshot.accountIds,
      snapshot.damagedAccounts
    ),
    error: null,
    isLoading: false,
    loadStatus: 'loaded'
  });
}

function commitHealthyMutation(
  set: AccountsStoreSet,
  accountIds: string[],
  accounts: OtpAccount[],
  damagedAccounts: DamagedAccount[]
): void {
  set({
    accountIds,
    accounts: sortAccounts(accounts),
    damagedAccounts: orderDamagedAccounts(accountIds, damagedAccounts),
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

async function persistAccounts(accounts: OtpAccount[]): Promise<void> {
  await Promise.all(
    accounts.map(async ({ secret, ...record }) => {
      await Promise.all([
        setAccountRecord(record),
        setSecret(record.id, secret)
      ]);
    })
  );
}

async function persistAccountOrder(
  nextAccounts: OtpAccount[],
  previousAccounts: OtpAccount[]
): Promise<void> {
  const previousSortOrderById = new Map(
    previousAccounts.map(account => [account.id, account.sortOrder])
  );
  const changedAccounts = nextAccounts.filter(
    account => previousSortOrderById.get(account.id) !== account.sortOrder
  );

  await Promise.all(
    changedAccounts.map(async ({ secret: _secret, ...record }) => {
      await setAccountRecord(record);
    })
  );
}

function sortAccounts(accounts: OtpAccount[]): OtpAccount[] {
  return [...accounts].sort(
    (first, second) => first.sortOrder - second.sortOrder
  );
}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error('TOTP account storage failed');
}
