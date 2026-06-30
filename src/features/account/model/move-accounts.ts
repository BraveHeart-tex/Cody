import type { OtpAccount } from '@/features/totp/model/totp-account';

export function scheduleAfterRender(callback: () => void): void {
  // Let Sortable finish its drag-end render before persisting the new order.
  // requestIdleCallback is not available consistently in React Native and InteractionManager is deprecated
  setTimeout(callback, 0);
}

export function orderAccountsByIds(
  accounts: OtpAccount[],
  orderedAccountIds: string[] | null
): OtpAccount[] {
  if (orderedAccountIds == null || orderedAccountIds.length === 0) {
    return accounts;
  }

  const accountById = new Map<string, OtpAccount>();

  for (const account of accounts) {
    accountById.set(account.id, account);
  }

  const orderedAccountIdSet = new Set<string>();
  const result: OtpAccount[] = [];

  for (const id of orderedAccountIds) {
    const account = accountById.get(id);

    if (account == null) {
      continue;
    }

    orderedAccountIdSet.add(id);
    result.push(account);
  }

  for (const account of accounts) {
    if (!orderedAccountIdSet.has(account.id)) {
      result.push(account);
    }
  }

  return result;
}
