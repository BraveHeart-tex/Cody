# App lock and security states - COD-5

Design source: `cody-security-design-lab.html`. Use Cody’s existing themed lock and attention SVG illustrations and semantic colors. Native biometric dialogs belong to the OS.

## Agreed behavior

- Cold start: protected routes stay unmounted until security settings load and the configured policy permits access.
- After first unlock: preserve navigation/form state beneath an opaque cover. Hide the subtree from accessibility, disable pointer input, dismiss the keyboard, and block Android Back while covered.
- Cover immediately on inactive/background. Preserve the iOS inactive transition used by biometric prompts. Background interruptions invalidate pending unlocks.
- Attempt authentication once per entry/resume; cancellation/failure permits manual retry without a prompt loop.
- Android requires strong biometrics. No app PIN or device-passcode fallback. Both enabling and disabling protection require authentication.
- Unlock goes directly to protected content. Timeouts remain immediately, 1, 5, or 15 minutes.
- Security settings writes commit only after persistence succeeds. Failure retains the previous value and offers retry through the same control. Feedback stays beside the affected control.
- Enrollment help expands inline. Android opens Security settings; iOS opens Cody’s app settings with explicit instructions for Face ID/Touch ID enrollment elsewhere in Settings. Recheck support on return; availability alone never grants access or changes protection.

## State checklist

| State                     | Presentation and recovery                                                  | Automated coverage       |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| Initialization            | Lock artwork, checking message, progress indicator; content inaccessible   | Gate/root boundary       |
| Locked                    | Lock artwork, filled biometric unlock button, protection footer            | Gate/root boundary       |
| Authenticating            | Disabled busy CTA, system-dialog guidance; OS owns prompt                  | Gate/store/biometrics    |
| Unlock success            | Immediate entry; cold-start subtree mounts only after success              | Gate/store               |
| Settings load failure     | Attention artwork, persistent recovery explanation, retry loading          | Gate/store               |
| No enrollment             | Setup title, device settings steps, retry                                  | Gate/guidance/biometrics |
| Unsupported hardware      | Unavailable explanation, check again; no promise enrollment fixes hardware | Gate/store/biometrics    |
| Weak Android enrollment   | Strong biometrics explanation and setup guidance                           | Gate/store/biometrics    |
| OS lockout                | Wait-until-allowed guidance and manual retry                               | Gate/store               |
| Authentication failure    | Persistent explanation and manual retry                                    | Store/biometrics         |
| Cancellation              | Neutral copy and lock artwork; no automatic retry loop                     | Gate/store               |
| Protection on/off/pending | Authenticated toggle, pending feedback, timeout dependency                 | Settings/store           |
| Protection save failure   | Inline explanation, old value retained, controls available to retry        | Settings/store           |
| Timeout save failure      | Inline explanation, old selection retained, retry                          | Settings/store           |
| Settings handoff failure  | Keep enrollment instructions visible; explain manual route                 | Guidance                 |

## Verification

- Android first: native unlock prompt, neutral cancellation, manual retry, successful unlock to an empty account screen, security-change prompt/cancellation, dark Settings layout, and light lock layout at 150% text scaling verified on emulator. Large-text labels remain readable and the gate scrolls when needed. System status-bar foreground follows the active theme.
- iOS device verification skipped at the user’s request. Platform policy and destination wording are covered by tests. Local simulator build encountered an unrelated ExpoModulesJSI Swift compiler error.
- Full suite: 204 tests pass. TypeScript, changed-source lint, formatting, and diff whitespace checks pass. Fixed one existing account-card test mock to expose the shared text context required by icons.
- No real account secrets were used. Screen-reader speech and physical-device biometrics remain unverified.
