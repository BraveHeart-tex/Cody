# Security illustrations

`src/components/ui/security-illustration.tsx` owns the fixed 128-unit SVG and
resolves existing semantic theme colors. Its only variants are `lock` and
`attention`. It is static, decorative, hidden from accessibility, and ignores
pointer input. Layout uses `size-28` (112dp); SVG coordinates are drawing geometry.

The frontal rounded lock, inset corner, and violet/lavender body form Cody's
signature. An offset accent panel adds flat depth behind the body, and the
shackle uses accentForeground. The attention badge uses destructive for its
outline and exclamation, with a subtle tinted fill. It indicates a blocked
operation, never compromised security or confirmed protection. Storage headings and recovery instructions
remain essential to its meaning.

## Mapping

- Initializing, locked, authenticating: lock.
- Settings load error: attention.
- Locked with displayed failure, including unavailable/not-enrolled biometrics:
  attention, unless authentication is currently in progress.
- Account storage unavailable/corrupt: attention.
- Unlocked and active: no gate or illustration.

Call sites retain messages, busy treatment, actions, and branch precedence.
There are no message-string comparisons, new security states, animation timers,
or changes to the OS biometric prompt. Covering/uncovering remains independent
of artwork. Account empty/search states and inline settings feedback are unchanged.

## Verification - 2026-10-17

- TypeScript and targeted lint checked.
- Existing app-lock, biometric, and account-list tests checked; gate coverage
  includes illustration precedence and decorative accessibility properties.
- Android emulator: inspected both variants in light/dark using a temporary
  preview, and the actual gate with a simulated settings-load failure. No
  clipping or contrast issues observed. Preview route removed afterward.
- Evidence: `.artifacts/agent-device/android/illustrations-light.png`,
  `illustrations-dark.png`, and `gate-load-error-dark.png`.
- iOS simulator has no Cody development build installed; iOS visual checks pending.
- Pending manual acceptance: account storage-error screen layout, small displays,
  large text, TalkBack/VoiceOver, reduced-motion setting, and physical-device
  biometric success/failure/cancellation, enrollment/availability/lockout, and
  background/foreground transitions. Automated security coverage does not replace
  these device checks.

## Refinement verification - 2026-10-17

- Android: compared the original 128dp lock with the refined 112dp composition
  inside the actual AppLockGate. Captured lock/attention in light/dark using a
  temporary presentation route with in-memory state fixtures; removed afterward.
- Evidence: `.artifacts/agent-device/android/security-refinement/` contains
  `before-lock-light.png`, `lock-light.png`, `lock-dark.png`,
  `attention-light.png`, and `attention-dark.png`.
- The accent panel adds depth without obscuring the shackle or keyhole. The
  smaller scale gives the heading more prominence. Badge, strokes, and inset
  remain clear in both themes; no SVG clipping observed.
- Reproduced missing trailing words in the heading and unlock button. Temporary
  onTextLayout diagnostics showed two lines while the view displayed only one.
  Gave heading/failure text full available width and the unlock label flexible
  width inside a bounded full-width, auto-height button. Confirmed complete
  wording in all four screenshots. No shared typography or auth logic changed.
- Larger Android font verification was attempted but interrupted by native
  biometric prompts after relaunch; no usable large-text capture obtained.
  Restored the original emulator text-size setting. A temporary diagnostic
  overlay error was corrected and all diagnostic instrumentation removed.
- iOS remains unverified: no Cody development build installed in the simulator.
  Screen-reader, large-text, small-display, and physical-device checks remain pending.
