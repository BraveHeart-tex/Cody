import { router } from 'expo-router';
import { useCallback } from 'react';

import { ManualAddAccountForm } from '@/features/account/components/manual-add-account-form';

export default function ManualAddAccountScreen() {
  const handleSaved = useCallback(() => {
    router.replace('/');
  }, []);

  return <ManualAddAccountForm onSaved={handleSaved} />;
}
