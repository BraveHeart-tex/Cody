import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createAccountId } from '@/features/totp/model/account-id';
import {
  deleteScannerDraft,
  getScannerDraft
} from '@/features/totp/model/scanner-drafts';
import type { OtpAccount } from '@/features/totp/model/totp-account';

export default function AccountConfirmScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const draft = useMemo(
    () => (draftId == null ? null : getScannerDraft(draftId)),
    [draftId]
  );
  const { accounts, addAccount, error, isLoading } = useAccounts();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDuplicate =
    draft != null && accounts.some(account => account.secret === draft.secret);

  const handleSave = useCallback(async () => {
    if (draft == null || draftId == null || isLoading || isSaving) {
      return;
    }

    if (isDuplicate) {
      setSaveError('This account is already saved.');

      return;
    }

    const account: OtpAccount = {
      ...draft,
      id: createAccountId(),
      createdAt: Date.now(),
      sortOrder: 0
    };

    try {
      setIsSaving(true);
      setSaveError(null);
      await addAccount(account);
      deleteScannerDraft(draftId);
      router.replace('/');
    } catch {
      setSaveError('Could not save this account. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [addAccount, draft, draftId, isDuplicate, isLoading, isSaving]);

  if (draft == null) {
    return (
      <View className="flex-1 items-center justify-center gap-5 bg-white px-8">
        <View className="gap-2">
          <Text className="text-center text-2xl font-semibold text-neutral-950">
            QR code draft expired
          </Text>
          <Text className="text-center text-base leading-6 text-neutral-600">
            Scan the QR code again to review the account details.
          </Text>
        </View>
        <PrimaryButton
          label="Back to Scanner"
          onPress={() => router.replace('/scan')}
        />
      </View>
    );
  }

  const storageError = error == null ? null : 'Account storage is unavailable.';
  const statusMessage = saveError ?? storageError;
  const isSaveDisabled = isLoading || isSaving || isDuplicate;

  return (
    <View className="flex-1 gap-8 bg-white px-6 py-16">
      <View className="gap-2">
        <Text className="text-3xl font-semibold text-neutral-950">
          Review account
        </Text>
        <Text className="text-base leading-6 text-neutral-600">
          Confirm the scanned details before saving this account.
        </Text>
      </View>

      <View className="gap-4 rounded-lg border border-neutral-200 p-4">
        <DetailRow label="Issuer" value={draft.issuer || 'Not provided'} />
        <DetailRow label="Label" value={draft.label} />
        <DetailRow label="Type" value={draft.type.toUpperCase()} />
        <DetailRow label="Algorithm" value={draft.algorithm} />
        <DetailRow label="Digits" value={String(draft.digits)} />
        <DetailRow label="Period" value={`${draft.period ?? 30} seconds`} />
      </View>

      {isDuplicate ? (
        <StatusMessage value="This account is already saved." />
      ) : null}
      {statusMessage != null ? <StatusMessage value={statusMessage} /> : null}

      <View className="gap-3">
        <PrimaryButton
          disabled={isSaveDisabled}
          label={
            isSaving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Account'
          }
          onPress={handleSave}
        />
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-500">{label}</Text>
      <Text className="text-lg font-semibold text-neutral-950">{value}</Text>
    </View>
  );
}

interface StatusMessageProps {
  value: string;
}

function StatusMessage({ value }: StatusMessageProps) {
  return (
    <Text className="rounded-lg bg-red-50 px-4 py-3 text-center text-base font-semibold text-red-700">
      {value}
    </Text>
  );
}

interface PrimaryButtonProps {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

function PrimaryButton({
  disabled = false,
  label,
  onPress
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={
        disabled
          ? 'items-center rounded-lg bg-neutral-300 px-5 py-3'
          : 'items-center rounded-lg bg-orange-500 px-5 py-3'
      }
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="items-center rounded-lg border border-neutral-300 px-5 py-3"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-neutral-950">{label}</Text>
    </Pressable>
  );
}
