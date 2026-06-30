import { useEffect } from 'react';

import type { OtpAccount } from '@/features/totp/model/totp-account';
import {
  useAccountsStore,
  type AddAccountInput,
  type UpdateAccountInput
} from '@/features/totp/store/accounts-store';

export type { AddAccountInput, UpdateAccountInput };

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
  const accounts = useAccountsStore(state => state.accounts);
  const isLoading = useAccountsStore(state => state.isLoading);
  const error = useAccountsStore(state => state.error);
  const loadAccounts = useAccountsStore(state => state.loadAccounts);
  const addAccount = useAccountsStore(state => state.addAccount);
  const updateAccount = useAccountsStore(state => state.updateAccount);
  const deleteAccount = useAccountsStore(state => state.deleteAccount);
  const reorderAccounts = useAccountsStore(state => state.reorderAccounts);

  useEffect(() => {
    void loadAccounts().catch(() => undefined);
  }, [loadAccounts]);

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
