import { useEffect } from 'react';

import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  useAccountsStore,
  type AddAccountInput,
  type UpdateAccountInput
} from '@/features/totp/store/accounts-store';
import type { DamagedAccount } from '@/features/totp/storage/totp-storage';

export type { AddAccountInput, UpdateAccountInput };

export interface UseAccountsResult {
  accounts: OtpAccount[];
  accountIds: string[];
  damagedAccounts: DamagedAccount[];
  isLoading: boolean;
  error: Error | null;
  retryLoad: () => Promise<void>;
  retryAccount: (id: string) => Promise<void>;
  removeDamagedAccount: (id: string) => Promise<void>;
  startReaddingAccounts: () => Promise<void>;
  addAccount: (account: AddAccountInput) => Promise<void>;
  updateAccount: (id: string, changes: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
}

export function useAccounts(): UseAccountsResult {
  const accounts = useAccountsStore(state => state.accounts);
  const accountIds = useAccountsStore(state => state.accountIds);
  const damagedAccounts = useAccountsStore(state => state.damagedAccounts);
  const isLoading = useAccountsStore(state => state.isLoading);
  const error = useAccountsStore(state => state.error);
  const loadAccounts = useAccountsStore(state => state.loadAccounts);
  const retryLoad = useAccountsStore(state => state.retryLoad);
  const retryAccount = useAccountsStore(state => state.retryAccount);
  const removeDamagedAccount = useAccountsStore(
    state => state.removeDamagedAccount
  );
  const startReaddingAccounts = useAccountsStore(
    state => state.startReaddingAccounts
  );
  const addAccount = useAccountsStore(state => state.addAccount);
  const updateAccount = useAccountsStore(state => state.updateAccount);
  const deleteAccount = useAccountsStore(state => state.deleteAccount);
  const reorderAccounts = useAccountsStore(state => state.reorderAccounts);

  useEffect(() => {
    void loadAccounts().catch(() => undefined);
  }, [loadAccounts]);

  return {
    accounts,
    accountIds,
    damagedAccounts,
    isLoading,
    error,
    retryLoad,
    retryAccount,
    removeDamagedAccount,
    startReaddingAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts
  };
}
