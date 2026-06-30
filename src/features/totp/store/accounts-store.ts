import { create, type StoreApi } from 'zustand';

import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  deleteAccountRecord,
  deleteSecret,
  getAllAccounts,
  setAccountIndex,
  setAccountRecord,
  setSecret
} from '@/features/totp/storage/totp-storage';

export type AccountsLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export type AddAccountInput = OtpAccount;

export type UpdateAccountInput = Partial<Omit<OtpAccount, 'id'>>;

export interface AccountsStoreState {
  accounts: OtpAccount[];
  isLoading: boolean;
  error: Error | null;
  loadStatus: AccountsLoadStatus;
  loadAccounts: () => Promise<void>;
  addAccount: (account: AddAccountInput) => Promise<void>;
  updateAccount: (id: string, changes: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
}

const initialState = {
  accounts: [] as OtpAccount[],
  isLoading: true,
  error: null,
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
      .then(storedAccounts => {
        set({
          accounts: sortAccounts(storedAccounts),
          error: null,
          isLoading: false,
          loadStatus: 'loaded'
        });
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

        const nextAccounts = get().accounts.filter(
          account => account.id !== id
        );

        await setAccountIndex(
          nextAccounts.map(({ id: accountId }) => accountId)
        );
        await Promise.all([deleteAccountRecord(id), deleteSecret(id)]);
        commitAccounts(set, nextAccounts);
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

        const currentAccounts = get().accounts;
        const accountById = new Map(
          currentAccounts.map(account => [account.id, account])
        );
        const reorderedAccounts = ids
          .map(id => accountById.get(id))
          .filter((account): account is OtpAccount => account != null);
        const reorderedIds = new Set(reorderedAccounts.map(({ id }) => id));
        const remainingAccounts = currentAccounts.filter(
          ({ id }) => !reorderedIds.has(id)
        );

        const nextAccounts = [...reorderedAccounts, ...remainingAccounts].map(
          (account, index) => ({
            ...account,
            sortOrder: index
          })
        );

        await persistAccountOrder(nextAccounts, currentAccounts);
        commitAccounts(set, nextAccounts);
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

    const nextAccounts = sortAccounts(getNextAccounts(get().accounts));

    await persistAccounts(nextAccounts);
    commitAccounts(set, nextAccounts);
  } catch (cause) {
    const mutationError = toError(cause);

    set({ error: mutationError });

    throw mutationError;
  }
}

function commitAccounts(
  set: AccountsStoreSet,
  nextAccounts: OtpAccount[]
): void {
  set({
    accounts: sortAccounts(nextAccounts),
    error: null,
    isLoading: false,
    loadStatus: 'loaded'
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
  await setAccountIndex(accounts.map(({ id }) => id));
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
  await setAccountIndex(nextAccounts.map(({ id }) => id));
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
