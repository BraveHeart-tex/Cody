import { useCallback, useEffect, useRef, useState } from 'react';

import type { OtpAccount } from '@/src/features/totp/model/totp-account';
import {
  deleteAccountRecord,
  deleteSecret,
  getAllAccounts,
  setAccountIndex,
  setAccountRecord,
  setSecret
} from '@/src/features/totp/storage/totp-storage';

export type AddAccountInput = OtpAccount;

export type UpdateAccountInput = Partial<Omit<OtpAccount, 'id'>>;

export interface UseAccountsResult {
  accounts: OtpAccount[];
  isLoading: boolean;
  error: Error | null;
  addAccount: (account: AddAccountInput) => Promise<void>;
  updateAccount: (id: string, changes: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<OtpAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const accountsRef = useRef<OtpAccount[]>([]);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const mutationQueueRef = useRef(Promise.resolve());

  const commitAccounts = useCallback((nextAccounts: OtpAccount[]) => {
    const sortedAccounts = sortAccounts(nextAccounts);

    accountsRef.current = sortedAccounts;
    setAccounts(sortedAccounts);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      try {
        const storedAccounts = await getAllAccounts();

        if (!isMounted) {
          return;
        }

        commitAccounts(storedAccounts);
        setError(null);
      } catch (cause) {
        const loadError = toError(cause);

        if (isMounted) {
          setError(loadError);
        }

        throw loadError;
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const loadPromise = loadAccounts();

    loadPromiseRef.current = loadPromise;
    void loadPromise.catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [commitAccounts]);

  const persistMutation = useCallback(
    async (getNextAccounts: (accounts: OtpAccount[]) => OtpAccount[]) => {
      try {
        await loadPromiseRef.current;

        const nextAccounts = sortAccounts(getNextAccounts(accountsRef.current));

        await persistAccounts(nextAccounts);
        commitAccounts(nextAccounts);
        setError(null);
      } catch (cause) {
        const mutationError = toError(cause);

        setError(mutationError);

        throw mutationError;
      }
    },
    [commitAccounts]
  );

  const runMutation = useCallback(async (mutation: () => Promise<void>) => {
    const queuedMutation = mutationQueueRef.current.then(mutation, mutation);

    mutationQueueRef.current = queuedMutation.catch(() => undefined);

    await queuedMutation;
  }, []);

  const addAccount = useCallback(
    async (account: AddAccountInput) => {
      await runMutation(async () => {
        await persistMutation(currentAccounts => {
          const nextSortOrder =
            currentAccounts.length === 0
              ? 0
              : Math.max(...currentAccounts.map(({ sortOrder }) => sortOrder)) +
                1;

          return [...currentAccounts, { ...account, sortOrder: nextSortOrder }];
        });
      });
    },
    [persistMutation, runMutation]
  );

  const updateAccount = useCallback(
    async (id: string, changes: UpdateAccountInput) => {
      await runMutation(async () => {
        await persistMutation(currentAccounts =>
          currentAccounts.map(account =>
            account.id === id ? { ...account, ...changes, id } : account
          )
        );
      });
    },
    [persistMutation, runMutation]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      await runMutation(async () => {
        try {
          await loadPromiseRef.current;

          const nextAccounts = accountsRef.current.filter(
            account => account.id !== id
          );

          await setAccountIndex(
            nextAccounts.map(({ id: accountId }) => accountId)
          );
          await Promise.all([deleteAccountRecord(id), deleteSecret(id)]);
          commitAccounts(nextAccounts);
          setError(null);
        } catch (cause) {
          const mutationError = toError(cause);

          setError(mutationError);

          throw mutationError;
        }
      });
    },
    [commitAccounts, runMutation]
  );

  const reorderAccounts = useCallback(
    async (ids: string[]) => {
      await runMutation(async () => {
        await persistMutation(currentAccounts => {
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

          return [...reorderedAccounts, ...remainingAccounts].map(
            (account, index) => ({
              ...account,
              sortOrder: index
            })
          );
        });
      });
    },
    [persistMutation, runMutation]
  );

  return {
    accounts,
    isLoading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts
  };
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
