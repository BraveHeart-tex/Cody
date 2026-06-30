import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { AccountConfirmForm } from '@/features/account/components/account-confirm-form';
import { getScannerDraft } from '@/features/totp/model/scanner-drafts';

export default function AccountConfirmScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const draft = useMemo(
    () => (draftId == null ? null : getScannerDraft(draftId)),
    [draftId]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  const handleDraftExpiredScan = useCallback(() => {
    router.replace('/scan');
  }, []);

  const handleSaved = useCallback(() => {
    router.replace('/');
  }, []);

  return (
    <AccountConfirmForm
      draft={draft}
      draftId={draftId}
      onCancel={handleCancel}
      onDraftExpiredScan={handleDraftExpiredScan}
      onSaved={handleSaved}
    />
  );
}
