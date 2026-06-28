import { randomUUID } from 'expo-crypto';

import type { TotpDraft } from '@/src/features/totp/model/parse-otpauth-uri';

const MAX_SCANNER_DRAFTS = 10;
const drafts = new Map<string, TotpDraft>();

export function createScannerDraft(draft: TotpDraft): string {
  const id = randomUUID();

  drafts.set(id, draft);
  trimScannerDrafts();

  return id;
}

export function getScannerDraft(id: string): TotpDraft | null {
  return drafts.get(id) ?? null;
}

export function deleteScannerDraft(id: string): void {
  drafts.delete(id);
}

function trimScannerDrafts(): void {
  while (drafts.size > MAX_SCANNER_DRAFTS) {
    const oldestDraftId = drafts.keys().next().value;

    if (oldestDraftId == null) {
      return;
    }

    drafts.delete(oldestDraftId);
  }
}
