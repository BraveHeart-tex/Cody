## Mobile Visual Verification

Use `agent-device` to visually verify React Native UI changes on **Android emulators and iOS simulators**.

### Environment

- App: Cody (Expo development build)
- Platforms: Android and iOS
- Primary platform: Android
- CLI: Globally installed `agent-device`
- Prefer the CLI and installed agent-device skill over MCP.
- Use existing Expo development builds and tooling.

### Verification Strategy

- **Android:** Default platform for routine UI verification.
- **iOS:** Verify shared primitives, layout changes, navigation, platform-specific behavior, and significant visual changes.
- **Both:** Required for changes affecting cross-platform consistency, unless a platform is unavailable.
- For minor platform-independent changes, Android verification alone is sufficient.
- Never claim cross-platform verification unless both platforms were actually tested.

### Workflow

1. Ensure the appropriate emulator/simulator and Expo development build are running.
2. Open Cody using `agent-device` with the explicit `--platform android` or `--platform ios` flag.
3. Inspect the UI using `snapshot -i`.
4. Navigate using current element refs or stable selectors.
5. Capture screenshots of relevant screens and interaction states.
6. Inspect rendering, spacing, typography, colors, accessibility, and interactions.
7. Fix issues and repeat verification.
8. Close the session when finished.

Store temporary screenshots under `.artifacts/agent-device/<platform>/` and keep them out of Git.

### Design Expectations

Follow Cody's Proton Authenticator-inspired visual language:

- Premium, minimalist appearance.
- Consistent dark and light themes.
- Clear typography and OTP readability.
- Restrained surfaces, borders, and accents.
- Accessible touch targets and interaction feedback.
- Consistent behavior across Android and iOS.

### Rules

- Use synthetic OTP accounts only.
- Never expose real authentication secrets in screenshots, logs, or reports.
- Prefer accessibility labels and testIDs over coordinate-based interactions.
- Use `agent-device help react-native` for specialized React Native debugging.
- Coordinate device ownership; never allow multiple agents to control the same device simultaneously.
- Do not introduce additional testing frameworks or dependencies.
- If a platform is unavailable, verify the available platform and report the limitation.
- Never claim visual verification based solely on code inspection.

### Agent Delegation

- **GPT-6 Luna:** Operate devices, navigate screens, collect screenshots, and perform mechanical verification.
- **GPT-6.1 Sol Medium:** Review visual evidence, evaluate design consistency, and approve changes.
- Prefer a single verification worker coordinating both platforms to avoid device contention.
- Delegate corrective implementation based on concrete visual findings.

### Validation

For significant UI changes, report:

- Platforms verified.
- Screens and states inspected.
- Visual or behavioral issues identified.
- Corrections made.
- Remaining issues or unverified platforms.
