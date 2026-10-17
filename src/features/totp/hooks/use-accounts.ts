import { useEffect } from 'react';

import type { StoredOtpAccount } from '@/features/totp/model/totp-account';
import {
  useAccountsStore,
  type AddAccountInput,
  type UpdateAccountInput
} from '@/features/totp/store/accounts-store';
import type { DamagedAccount } from '@/features/totp/storage/totp-storage';

export type { UpdateAccountInput };

export interface UseAccountsResult {
  accounts: StoredOtpAccount[];
  accountIds: string[];
  damagedAccounts: DamagedAccount[];
  accountSecretLoading: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
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

export function useAccounts(): UseAccountsResult {
  const accounts = useAccountsStore(state => state.accounts);
  const accountIds = useAccountsStore(state => state.accountIds);
  const damagedAccounts = useAccountsStore(state => state.damagedAccounts);
  const accountSecretLoading = useAccountsStore(
    state => state.accountSecretLoading
  );
  const isLoading = useAccountsStore(state => state.isLoading);
  const error = useAccountsStore(state => state.error);
  const loadAccounts = useAccountsStore(state => state.loadAccounts);
  const retryLoad = useAccountsStore(state => state.retryLoad);
  const retryAccount = useAccountsStore(state => state.retryAccount);
  const loadAccountSecret = useAccountsStore(state => state.loadAccountSecret);
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
    accountSecretLoading,
    isLoading,
    error,
    retryLoad,
    retryAccount,
    loadAccountSecret,
    removeDamagedAccount,
    startReaddingAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts
  };
}
