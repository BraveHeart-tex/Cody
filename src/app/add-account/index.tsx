import { router } from 'expo-router';
import { useCallback } from 'react';

import { AddAccountOptions } from '@/features/account/components/add-account-options';

export default function AddAccountScreen() {
  const handleScanPress = useCallback(() => {
    router.push('/scan');
  }, []);

  const handleManualPress = useCallback(() => {
    router.push('/add-account/manual');
  }, []);

  return (
    <AddAccountOptions
      onManualPress={handleManualPress}
      onScanPress={handleScanPress}
    />
  );
}
