import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createAccountId } from '@/features/totp/model/account-id';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';
import { deleteScannerDraft } from '@/features/totp/model/scanner-drafts';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import type { TotpDraft } from '@/features/totp/model/parse-otpauth-uri';

interface AccountConfirmFormProps {
  draft: TotpDraft | null;
  draftId: string | undefined;
  onCancel: () => void;
  onDraftExpiredScan: () => void;
  onSaved: () => void;
}

export function AccountConfirmForm({
  draft,
  draftId,
  onCancel,
  onDraftExpiredScan,
  onSaved
}: AccountConfirmFormProps) {
  const { accounts, addAccount, error, isLoading } = useAccounts();
  const [label, setLabel] = useState(() => draft?.label ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDuplicate =
    draft != null && accounts.some(account => account.secret === draft.secret);
  const trimmedLabel = label.trim();
  const labelError =
    draft != null && trimmedLabel.length === 0
      ? 'Enter an account label.'
      : null;

  const handleSave = useCallback(async () => {
    if (draft == null || draftId == null || isLoading || isSaving) {
      return;
    }

    if (isDuplicate) {
      setSaveError('This account is already saved.');

      return;
    }

    if (labelError != null) {
      return;
    }

    const accountId = createAccountId();
    const account: OtpAccount = {
      ...draft,
      id: accountId,
      label: trimmedLabel,
      color: getDefaultAccountColor({
        id: accountId,
        issuer: draft.issuer,
        label: trimmedLabel
      }),
      createdAt: Date.now(),
      sortOrder: 0
    };

    try {
      setIsSaving(true);
      setSaveError(null);
      await addAccount(account);
      deleteScannerDraft(draftId);
      onSaved();
    } catch {
      setSaveError('Could not save this account. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    addAccount,
    draft,
    draftId,
    isDuplicate,
    isLoading,
    isSaving,
    labelError,
    onSaved,
    trimmedLabel
  ]);

  if (draft == null) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-5 px-8">
        <View className="gap-2">
          <Text className="text-foreground text-center text-2xl font-semibold">
            QR code draft expired
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            Scan the QR code again to review the account details.
          </Text>
        </View>
        <Button onPress={onDraftExpiredScan}>
          <Text>Back to Scanner</Text>
        </Button>
      </View>
    );
  }

  const storageError = error == null ? null : 'Account storage is unavailable.';
  const statusMessage = saveError ?? storageError ?? labelError;
  const isSaveDisabled =
    isLoading ||
    isSaving ||
    storageError != null ||
    isDuplicate ||
    labelError != null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-8 px-6 pt-safe pb-safe"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-2 pt-6">
        <Text className="text-foreground text-3xl font-semibold">
          Review account
        </Text>
        <Text className="text-muted-foreground text-base leading-6">
          Confirm the scanned details before saving this account.
        </Text>
      </View>

      <View className="border-border gap-4 rounded-lg border p-4">
        <DetailRow label="Issuer" value={draft.issuer || 'Not provided'} />
        <Field
          isInvalid={labelError != null}
          label="Account label"
          labelClassName="text-muted-foreground text-sm font-medium"
          labelTestID="account-label-field-label"
          required
        >
          <Input
            aria-invalid={labelError != null}
            accessibilityLabel="Account label"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setLabel}
            value={label}
          />
        </Field>
      </View>

      {isDuplicate ? (
        <StatusMessage value="This account is already saved." />
      ) : null}
      {statusMessage != null ? <StatusMessage value={statusMessage} /> : null}

      <View className="gap-3">
        <Button disabled={isSaveDisabled} onPress={handleSave}>
          <Text>
            {isSaving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Account'}
          </Text>
        </Button>
        <Button variant="outline" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="gap-1">
      <Text className="text-muted-foreground text-sm font-medium">{label}</Text>
      <Text className="text-foreground text-lg font-semibold">{value}</Text>
    </View>
  );
}
