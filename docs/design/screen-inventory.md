# Cody screen inventory

Discovery checklist for the Proton Authenticator-inspired redesign. Status describes current behavior, not design quality. Evidence is source and test inspection unless explicitly labeled device verified.

## Screen overview

| Interface              | Entry / purpose                                                     | Main states found                                                                                             | Status                                      | Priority |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| Home and account list  | `/` - view, search, copy, manage OTP accounts                       | Loading, first-use empty, populated, search/no-results, storage failure, damaged records, expanded card       | Implemented; Android visual review partial  | P0       |
| Add account options    | `/add-account` - choose QR scan or manual entry                     | Default choice; navigation                                                                                    | Implemented                                 | P1       |
| Manual account form    | `/add-account/manual` - enter TOTP setup details                    | Loading, validation, invalid/duplicate data, masked/revealed secret, saving, storage/save error, success      | Implemented with gaps                       | P1       |
| QR scanner             | `/scan` - scan authenticator QR                                     | Permission loading/granted/denied, Settings recovery, manual entry, invalid QR, camera retry, successful scan | Implemented; device verification pending    | P0       |
| Review scanned account | `/account-confirm?draftId=...` - verify/edit scanned label and save | Expired draft, invalid/duplicate, validation, storage/save error, saving, success, cancel                     | Implemented with gaps                       | P1       |
| Move accounts          | `/move-accounts` - reorder account list                             | Loading, empty, populated/dragging, load/save failure, done                                                   | Partial                                     | P1       |
| Settings               | `/settings` - security, lock timeout, theme                         | Loading, biometrics on/off/auth, unavailable/auth failure, storage failure, preference changes                | Implemented with gaps                       | P1       |
| App lock gate          | Global overlay - protect app on launch/resume                       | Initializing, locked, authenticating, unlocked, load error/retry, auth failures                               | Implemented with gaps                       | P0       |
| Account action menu    | Expanded account card dropdown                                      | Move, delete, rename, customize choices                                                                       | Partial                                     | P1       |
| Delete confirmation    | Native alert from account actions                                   | Confirm/cancel, deletion failure                                                                              | Implemented; platform appearance unverified | P1       |
| Re-add confirmation    | Native alert for corrupt account index                              | Confirm/cancel, archive/reinitialize                                                                          | Partial                                     | P1       |

The seven route screens are Expo Router routes. Account cards, settings sections, empty/error states and the lock gate are component states or overlays, not separate routes. No account sign-in, cloud account, import/export, backup, or onboarding screens were found in the inspected routes/components.

## Detailed state inventory

### Home and account list - P0

Paths: [home route](/Users/bora/projects/cody/src/app/index.tsx), [home screen](/Users/bora/projects/cody/src/features/account/components/account-home-screen.tsx), [account list](/Users/bora/projects/cody/src/features/account/components/account-list.tsx), [account card](/Users/bora/projects/cody/src/features/account/components/account-card.tsx), [OTP details](/Users/bora/projects/cody/src/features/account/components/account-card-details.tsx).

- [x] **Initializing** - account storage loading renders the quiet six-row skeleton (`account-list.tsx:186-188`; `account-list-skeleton.tsx`).
- [x] **First use** - no saved accounts shows scan and manual-add actions (`account-list.tsx:388-427`). These route directly into the core add flows.
- [x] **Populated** - issuer/label rows in stored order; selecting a row expands OTP, timer and actions (`account-card.tsx:76-130`). OTP generation failure shows an unavailable code, warning and disabled copy (`account-card-details.tsx:50-68,135-178`).
- [x] **Search** - case-insensitive issuer or label filtering; query change collapses expanded row; no-match message suggests another query (`account-list.tsx:100-104,333-355,430-452`). Search only appears when account IDs exist.
- [x] **Damaged record** - retained damaged rows have retry and remove actions (`account-list.tsx:145-161`; `damaged-account-card.tsx:14-109`).
- [x] **Read failure** - generic retry. Corrupt index gives a re-add path with warning and confirmation (`account-list.tsx:190-198,135-152,455-513`).
- [x] **Delete** - native confirm alert; deletion error leaves account saved and both outcomes display accessible inline feedback (`account-actions.tsx:27-63`; `account-list.tsx:111-133,211-218`).
- [x] **Re-add failure** - rejection from `startReaddingAccounts` displays recovery feedback (`account-list.tsx:135-152,455-513`; covered by `account-list.test.tsx`).
- [x] **Copy feedback** - copy success/failure and retry feedback are handled in the OTP details component (`account-card-details.tsx:82-123,125-195`); Android clipboard preview confirmed the copy action.
- [x] **Account actions** - collapsed and expanded cards expose the action menu; only supported Move/Delete actions are shown (`account-card.tsx:103-109`, `account-actions.tsx`).
- [x] **State visual treatment** - first-use, no-results, loading skeletons, storage failure, corrupt-index recovery and damaged records use the lab's hierarchy and focused actions (`account-list.tsx`, `account-list-skeleton.tsx`, `damaged-account-card.tsx`).
- [x] **Search clear** - a trailing clear control appears for matching and non-matching queries (`account-search-input.tsx`).
- [x] **Delete feedback** - successful deletion and failure both produce accessible inline feedback (`account-list.tsx`).
- [x] **Design review** - Android emulator screenshots verified the Cody header, search-first home, quiet collapsed card with action menu, and expanded OTP with linear countdown and icon copy control. Synthetic data only.
- [ ] **Latest refinement visual check** - quiet cards, loading skeleton, OTP generation failure, search clear, damaged-row hierarchy, framed storage error and inline delete feedback still need a fresh screenshot after the latest edits.
- [ ] **Remaining device review** - first-use, loading and recovery states; iOS layout; long issuer/label; damaged-row hierarchy; and native alerts remain unverified.

### Add account options - P1

Paths: [route](/Users/bora/projects/cody/src/app/add-account/index.tsx), [options](/Users/bora/projects/cody/src/features/account/components/add-account-options.tsx).

- [x] **Default** - static scan and manual choices (`add-account-options.tsx:18-58`); each navigates to its flow (`src/app/add-account/index.tsx:6-21`).
- [ ] **Loading/error/success** - no local async state; actual permission and save states belong to subsequent screens.
- [ ] **Redesign check** - clarify choice hierarchy and back navigation; no platform-specific UI identified. No device evidence.

### Manual account form - P1

Paths: [route](/Users/bora/projects/cody/src/app/add-account/manual.tsx), [form](/Users/bora/projects/cody/src/features/account/components/manual-add-account-form.tsx), [validation model](/Users/bora/projects/cody/src/features/totp/model/manual-account.ts).

- [x] **Fields/defaults** - issuer, required account label and secret; 30/60-second period, 6/8 digits (`manual-add-account-form.tsx:25-63,116-187`).
- [x] **Secret privacy** - masked by default with show/hide action (`:139-169`).
- [x] **Validation** - submit gated until valid; relevant validation message appears after typing/submission (`:41-63,65-71,189`). Duplicate and invalid secret behavior comes from model validation.
- [x] **Loading/storage error** - account store loading disables save; unavailable storage surfaces a message (`:56-63,191-195`).
- [x] **Saving/failure/success** - button shows Saving; failed write shows retry copy; success navigates home (`:65-103,191-195`; route `manual.tsx:6-11`).
- [ ] **UX gaps** - one status message is used rather than field-linked error presentation; no success confirmation before navigation. Existing test covers masking and valid save (`tests/features/account/components/manual.test.tsx:93-148`), while invalid, duplicate and failure visual states lack device evidence.
- [ ] **Platform** - keyboard and secure-entry behavior is native; Android/iOS rendering and keyboard avoidance not verified.

### QR scanner - P0

Paths: [route](/Users/bora/projects/cody/src/app/scan.tsx), [scanner](/Users/bora/projects/cody/src/features/scanner/components/scanner-view.tsx), [frame](/Users/bora/projects/cody/src/features/scanner/components/scanner-frame.tsx), [URI parser](/Users/bora/projects/cody/src/features/totp/model/parse-otpauth-uri.ts).

- [x] **Permission initializing** - explains camera permission preparation (`scanner-view.tsx:117-124`).
- [x] **Denied/retry** - explains camera need and offers Try Again when permission can be asked again; permanently denied access offers Open Settings and manual entry (`scanner-view.tsx:126-152`). Permission is refreshed when the app returns to the foreground (`:51-59`).
- [x] **Valid QR** - parse otpauth data, haptic success, create in-memory draft, navigate to review (`:78-107`).
- [x] **Invalid/non-QR** - parser or type error pauses barcode callback and offers Scan Again (`:78-95,166,230-239`).
- [x] **Camera mount failure** - shows the camera error with Retry Camera, which remounts the camera, and a manual-entry fallback (`scanner-view.tsx:73-76,159-168,240-252`).
- [x] **Coverage** - scanner tests cover first-time permission, retryable and permanent denial, foreground permission refresh, and camera mount recovery (`tests/features/scanner/components/scanner-view.test.tsx:110-195`).
- [ ] **Device verification** - camera permission prompts, Settings handoff and camera remount behavior remain OS-specific and have not been verified on Android or iOS devices.

### Review scanned account - P1

Paths: [route](/Users/bora/projects/cody/src/app/account-confirm.tsx), [form](/Users/bora/projects/cody/src/features/account/components/account-confirm-form.tsx), [volatile draft store](/Users/bora/projects/cody/src/features/totp/model/scanner-drafts.ts).

- [x] **Review/edit** - displays issuer, allows label edit, then save/cancel (`account-confirm-form.tsx:131-179`).
- [x] **Invalid/duplicate/empty label** - blocks save and surfaces explanations (`:39-53,121-129,142-165`).
- [x] **Loading/storage/save failure** - disables save while loading/saving; shows storage and write errors (`:55-101,121-129`).
- [x] **Success/cancel** - removes draft and returns home; cancel goes back (`:78-89`; route `account-confirm.tsx:14-24`).
- [x] **Expired draft** - explicit expired message recovers back to scanner (`:103-118`; route `:18-20`). Draft is in memory, so process loss can reach this state.
- [ ] **Coverage gap** - tests cover parsed details, changed label, invalid secret, blank label and cancel (`tests/features/account/components/account-confirm.test.tsx:134-230`). Duplicate, expired, storage error and save failure are not represented by those tests; source behavior exists but visuals are unverified.

### Move accounts - P1

Paths: [route](/Users/bora/projects/cody/src/app/move-accounts.tsx), [screen](/Users/bora/projects/cody/src/features/account/components/move-accounts-screen.tsx), [row](/Users/bora/projects/cody/src/features/account/components/move-account-card.tsx), [Done action](/Users/bora/projects/cody/src/features/account/components/move-accounts-done-button.tsx).

- [x] **Loading/empty/populated** - skeleton (`:61-67`), empty prompt (`:80-89`), sortable issuer/label list (`:91-126`).
- [x] **Reorder save failure** - optimistic ordering reverts to saved order and shows error (`:34-54,98-100`); test covers this (`tests/features/account/components/move-accounts.test.tsx:243-304`).
- [ ] **Load failure** - empty/error presentation suggests closing/reopening, with no retry action (`:69-78`). If stale accounts remain, error is not surfaced alongside them (`:69-70,91-126`).
- [ ] **Saving/success** - no pending-save indicator or confirmation; rapid successive reorder writes and outcome are not visibly represented (`:34-54`).
- [ ] **Accessible reorder** - drag handle has a role/name, but keyboard or screen-reader reorder controls are not evident (`move-account-card.tsx:58-69`).
- [ ] **Platform** - gesture behavior uses `react-native-sortables`; code has no platform branch. Device drag and accessibility behavior unverified on Android/iOS.

### Settings - P1

Paths: [route](/Users/bora/projects/cody/src/app/settings.tsx), [screen](/Users/bora/projects/cody/src/features/settings/components/settings-screen.tsx), [biometrics section](/Users/bora/projects/cody/src/features/settings/components/biometrics-settings-section.tsx), [timeout section](/Users/bora/projects/cody/src/features/settings/components/lock-timeout-settings-section.tsx), [theme section](/Users/bora/projects/cody/src/features/settings/components/theme-settings-section.tsx).

- [x] **Load and preferences** - biometric requirement, lock timeout (0/1/5/15 minutes), theme (system/light/dark) (`settings-screen.tsx:16-40`; sections above). Biometric/timeout controls disable during load; theme remains enabled.
- [x] **Security change confirmation** - enabling/disabling protection requires successful biometric authentication; pending controls disable and failures appear (`settings-screen.tsx:42-59`; `biometrics.ts:13-47`).
- [x] **Unavailable/failure** - hardware, enrollment, Android strong-biometric and lockout messages are mapped (`app-lock-store.ts:240-265`; `biometrics.ts:13-47`).
- [x] **Persistence failure** - settings load/save error is surfaced; theme applies immediately even when persistence fails (`settings-screen.tsx:29-33,114`; `settings-store.ts:49-83,122-149,165-194`).
- [ ] **Recovery/success** - no retry affordance within settings on read/save error and no save-success confirmation. Gate has a separate load retry.
- [ ] **Platform** - native prompt is OS-owned. Face ID/Touch ID/fingerprint wording and Android strong-biometric restriction need device review; no screenshot evidence.

### App lock gate - P0

Paths: mounted around all routes in [root layout](/Users/bora/projects/cody/src/app/_layout.tsx), [gate](/Users/bora/projects/cody/src/features/app-lock/components/app-lock-gate.tsx), [lock state machine](/Users/bora/projects/cody/src/features/app-lock/store/app-lock-store.ts).

- [x] **Initializing/locked** - protected content stays unmounted until settings load and authentication succeeds (`app-lock-gate.tsx:32-38,54-77`).
- [x] **Load failure** - fail-closed state with Retry (`:84-90`).
- [x] **Authentication** - auto-attempt/manual unlock, disabled progress state and failure message (`:79-104`). Store handles background/resume, configured timeout and interrupted authentication (`app-lock-store.ts:57-159`).
- [x] **Input/accessibility boundary** - protects pointer and accessibility content and blocks Android hardware Back while locked (`app-lock-gate.tsx:40-71`). Tests exercise root boundary and auth paths (`tests/features/app-lock/components/root-lock-boundary.test.tsx`; `app-lock-gate.test.tsx`).
- [ ] **Recovery** - device-passcode fallback is disabled (`biometrics.ts:83-88`); unavailable/not-enrolled guidance asks user to configure biometrics in device settings, with no in-app route. Design should handle the recovery state without weakening the security boundary.
- [ ] **Platform** - native biometric prompt and screen-reader behavior require Android/iOS device verification.

### Native and component overlays - P1/P2

- [x] **Account menu** - dropdown supports Move and Delete plus Rename and Customize labels (`account-actions.tsx:28-77`). Rename/Customize have no handlers and should be tracked as missing behavior, not implied feature requirements.
- [x] **Delete/re-add alerts** - `Alert.alert` provides native cancel/confirm (`account-actions.tsx:28-44`; `account-list.tsx:97-111`). Android and iOS native alert appearance and destructive emphasis unverified.
- [x] **Portal/dropdown infrastructure** - root layout hosts React Native Reusables portal (`src/app/_layout.tsx:73-104`); [dropdown primitive](/Users/bora/projects/cody/src/components/ui/dropdown-menu.tsx).
- [ ] No custom modal or bottom-sheet route found in the inspected `src` tree.

## Shared component opportunities

- **State presentation:** align skeleton, centered empty, inline error and retry patterns across account list, scanner, settings, move and lock. Existing primitives: `src/components/ui/{state-card,centered-state,status-message,skeleton}.tsx`.
- **Form feedback:** establish reusable validation, storage failure, save failure and disabled/loading treatment; manual and scanned-account forms currently share only `StatusMessage` and button patterns.
- **Security controls:** consistent biometric availability, enrollment guidance, authentication progress, cancellation/failure and retry copy across Settings and lock gate while preserving fail-closed behavior.
- **Account rows and actions:** OTP typography/countdown/copy feedback, damaged-row recovery, search/no-results, confirmation and action menu are one connected account-management system.
- **Native permission and confirmation surfaces:** scanner permission recovery and destructive alerts need platform-aware design review; preserve OS-owned camera/biometric prompts.
- **Accessibility and platform:** review labels, touch targets, long text, font scaling, keyboard/safe-area behavior, dark/light/system themes, Android back handling and iOS/Android gesture differences together.

## Redesign roadmap

1. **P0 - Home/account list and app lock:** highest frequency and security boundary. Review first-use, populated OTP, expanded/copy, damaged data, load/corrupt-index error, search and locked/unlock states.
2. **P0 - Scanner permission and camera failure:** unblock primary enrollment path; verify denied/permanently denied recovery, camera retry, manual-entry fallback, and scan-to-review transition on Android and iOS.
3. **P1 - Add paths:** add-choice, manual form and scanned review; cover secret privacy, validation, duplicate detection, failure recovery and success/navigation.
4. **P1 - Move and account actions:** make reorder recoverable and accessible; reconcile visible Rename/Customize options with actual behavior; review delete/re-add confirmations.
5. **P1 - Settings/security:** unify biometric availability, auth failures, persistence errors and timeout dependency; verify native prompts on both platforms.
6. **P2 - Shared polish:** typography, motion, haptics, theme parity, long-text behavior and consistent primitives after primary state coverage is designed.

## Verification record

- **Code and tests inspected:** routes under `src/app`, feature components under `src/features`, shared UI under `src/components/ui`, related tests under `tests/features`.
- **Device screenshots:** Android emulator, populated/collapsed and expanded synthetic account states. Cody app icon/header, Search, collapsed actions, OTP sizing, linear countdown, icon copy control, and clipboard preview checked with `agent-device`.
- **Latest device pass:** blocked because `agent-device` could not confirm retirement of its existing daemon; its state was retained. Latest visual refinements are unverified on-device.
- **Platform differences:** Android home/card visual review completed. iOS appearance and native behaviors, scanner permissions, biometric prompts, Android Back behavior and drag gestures remain unverified. No real OTP secrets were accessed or reported.
- **Unverified:** first-use, loading and recovery-state screenshots; long issuer/label and damaged-row hierarchy on device; iOS appearance and native behaviors; scanner Settings handoff and camera retry; biometric screen-reader UX; manual keyboard/safe-area behavior; sortable drag and accessible reorder.
